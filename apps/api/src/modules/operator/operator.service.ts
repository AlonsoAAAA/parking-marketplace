import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OtpEntity } from '../auth/entities/otp.entity';
import { normalizePhone } from '../../lib/phone';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class OperatorService {
  constructor(
    @InjectDataSource() private db: DataSource,
    private config: ConfigService,
    private whatsapp: WhatsAppService,
    @InjectRepository(OtpEntity) private otpRepo: Repository<OtpEntity>,
  ) {}

  // ── Team list ──────────────────────────────────────────────────────────────

  async listTeam(operatorId: string) {
    return this.db.query(
      `SELECT id, name, phone, role, is_active, created_at
       FROM users
       WHERE parent_operator_id = $1
         AND role IN ('sub_operator', 'sub_admin')
       ORDER BY created_at DESC`,
      [operatorId],
    );
  }

  // ── Create sub-operator ────────────────────────────────────────────────────

  async createSubOperator(
    operatorId: string,
    data: { name: string; phone: string; role?: string; otp: string },
  ) {
    // ── 1. Normalise phones ────────────────────────────────────────────────────
    const userPhone = normalizePhone(data.phone);
    const otpPhone  = userPhone;                                         // same key as sendOtp stores

    // ── 2. Verify OTP ──────────────────────────────────────────────────────────
    const record = await this.otpRepo.findOne({
      where: { phone: otpPhone, verified: false },
    });

    if (!record || record.otp !== data.otp) {
      throw new UnauthorizedException('Código de verificación incorrecto');
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('El código expiró. Solicita uno nuevo.');
    }

    // Mark OTP as consumed
    await this.otpRepo.update({ phone: otpPhone }, { verified: true });

    // ── 3. Prevent duplicate phone — salvo que sea un cliente normal sin equipo,
    //      en cuyo caso esa misma cuenta se convierte en operador (conserva su
    //      historial de compras, deja de poder loguearse como cliente normal).
    const existing = await this.db.query(
      `SELECT id, role, parent_operator_id FROM users WHERE phone = $1`,
      [userPhone],
    );
    const existingUser = existing[0];
    if (existingUser && !(existingUser.role === 'user' && !existingUser.parent_operator_id)) {
      throw new ConflictException(
        existingUser.role === 'user'
          ? 'Ese número ya es parte de otro equipo de operadores'
          : 'Ya existe una cuenta con ese número de teléfono',
      );
    }

    // ── 4. Operator info for welcome message ───────────────────────────────────
    const [operator] = await this.db.query(
      `SELECT name, phone FROM users WHERE id = $1`,
      [operatorId],
    );

    // ── 5. Crear o convertir a sub-operador ─────────────────────────────────────
    const teamRole = data.role === 'sub_admin' ? 'sub_admin' : 'sub_operator';

    // UPDATE...RETURNING devuelve [filas[], contador], a diferencia de
    // INSERT...RETURNING que da las filas directas — hay que desempacar el
    // tuple en la rama UPDATE o `user` queda como el array de filas en vez
    // del registro.
    const [user] = existingUser
      ? (await this.db.query(
          `UPDATE users
           SET name = $1, role = $2, parent_operator_id = $3, is_active = true
           WHERE id = $4
           RETURNING id, name, phone, role, is_active, created_at`,
          [data.name.trim(), teamRole, operatorId, existingUser.id],
        ))[0]
      : await this.db.query(
          `INSERT INTO users (name, phone, role, channel, parent_operator_id, is_active)
           VALUES ($1, $2, $3, 'whatsapp', $4, true)
           RETURNING id, name, phone, role, is_active, created_at`,
          [data.name.trim(), userPhone, teamRole, operatorId],
        );

    // ── 6. WhatsApp welcome (non-fatal) ────────────────────────────────────────
    await this.sendWelcomeMessage(userPhone, data.name, operator?.name).catch(() => {});

    return user;
  }

  // ── Update sub-operator ────────────────────────────────────────────────────

  async updateSubOperator(
    operatorId: string,
    subOpId: string,
    data: { name?: string; isActive?: boolean },
  ) {
    // Ensure ownership
    const [sub] = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND parent_operator_id = $2`,
      [subOpId, operatorId],
    );
    if (!sub) throw new NotFoundException('Sub-operador no encontrado');

    await this.db.query(
      `UPDATE users
       SET name      = COALESCE($1, name),
           is_active = COALESCE($2, is_active)
       WHERE id = $3`,
      [data.name ?? null, data.isActive ?? null, subOpId],
    );

    const [updated] = await this.db.query(
      `SELECT id, name, phone, role, is_active, created_at FROM users WHERE id = $1`,
      [subOpId],
    );
    return updated;
  }

  // ── Delete sub-operator ────────────────────────────────────────────────────

  async deleteSubOperator(operatorId: string, subOpId: string) {
    const [sub] = await this.db.query(
      `SELECT id FROM users WHERE id = $1 AND parent_operator_id = $2`,
      [subOpId, operatorId],
    );
    if (!sub) throw new NotFoundException('Sub-operador no encontrado');

    await this.db.query(`DELETE FROM users WHERE id = $1`, [subOpId]);
    return { message: 'Sub-operador eliminado' };
  }

  // ── WhatsApp welcome ───────────────────────────────────────────────────────

  private async sendWelcomeMessage(
    phone: string,
    subOpName: string,
    operatorName?: string,
  ) {
    const adminUrl = this.config.get('ADMIN_URL') ?? 'https://estacionat.mx/op/';

    const body = [
      `👋 *Hola ${subOpName}*`,
      ``,
      `${operatorName ?? 'Tu operador'} te ha dado acceso al panel de EstacionaT.`,
      ``,
      `📲 Ingresa con tu número de WhatsApp en:`,
      `${adminUrl}`,
      ``,
      `Podrás ver reservas y escanear boletos de los eventos asignados.`,
      ``,
      `Si tienes dudas, contacta a ${operatorName ?? 'tu operador'}.`,
    ].join('\n');

    await this.whatsapp.send(phone, 'welcome', body, {
      contentSid: this.config.get('TWILIO_WELCOME_CONTENT_SID'),
      contentVariables: {
        '1': subOpName,
        '2': operatorName ?? 'Tu operador',
        '3': adminUrl,
      },
    });
  }
}
