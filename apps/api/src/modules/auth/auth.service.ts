import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpEntity } from './entities/otp.entity';
import { normalizePhone } from '../../lib/phone';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private whatsapp: WhatsAppService,
    @InjectRepository(OtpEntity)
    private otpRepo: Repository<OtpEntity>,
  ) {}

  // Paso 1: Enviar OTP por WhatsApp, con fallback automático a SMS
  async sendOtp(phone: string): Promise<{ message: string; devOtp?: string }> {
    const cleanPhone = normalizePhone(phone);
    const isDev = this.config.get('NODE_ENV') === 'development';
    // En desarrollo usamos OTP fijo para que las credenciales del demo siempre funcionen
    const otp = isDev ? '111222' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await this.otpRepo.upsert(
      { phone: cleanPhone, otp, expiresAt, verified: false },
      ['phone'],
    );

    await this.whatsapp.send(
      cleanPhone,
      'otp',
      `Tu código de verificación para EstacionaT es: *${otp}*\n\nVálido por 10 minutos.`,
      {
        contentSid: this.config.get('TWILIO_OTP_CONTENT_SID'),
        contentVariables: { '1': otp },
      },
    );

    if (this.config.get('NODE_ENV') === 'development') {
      console.log(`📱 OTP para ${cleanPhone}: ${otp}`);
    }

    return { message: 'Código enviado por WhatsApp', ...(isDev && { devOtp: otp }) };
  }

  // Paso 2: Verificar OTP y devolver JWT
  async verifyOtp(phone: string, otp: string): Promise<{ access_token: string; token: string; isNewUser: boolean }> {
    const cleanPhone = normalizePhone(phone);

    const record = await this.otpRepo.findOne({
      where: { phone: cleanPhone, verified: false },
    });

    if (!record) throw new UnauthorizedException('Código no encontrado');

    // ── Brute-force: bloqueo temporal tras 5 intentos fallidos ─────────────────
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 30;

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      const mins = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new UnauthorizedException(
        `Demasiados intentos. Intenta de nuevo en ${mins} minuto${mins !== 1 ? 's' : ''}.`,
      );
    }

    if (record.expiresAt < new Date()) throw new UnauthorizedException('Código expirado');

    if (record.otp !== otp) {
      const newAttempts = (record.attempts ?? 0) + 1;
      const shouldLock  = newAttempts >= MAX_ATTEMPTS;
      await this.otpRepo.update(
        { phone: cleanPhone },
        {
          attempts:    newAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
        },
      );
      const remaining = MAX_ATTEMPTS - newAttempts;
      if (shouldLock) {
        throw new UnauthorizedException(
          `Demasiados intentos. Cuenta bloqueada ${LOCKOUT_MINUTES} minutos.`,
        );
      }
      throw new UnauthorizedException(
        `Código incorrecto. ${remaining} intento${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}.`,
      );
    }

    // Marcar como usado y resetear intentos
    await this.otpRepo.update({ phone: cleanPhone }, { verified: true, attempts: 0, lockedUntil: null });

    // Crear o recuperar usuario
    let user = await this.usersService.findByPhone(cleanPhone);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.create({
        phone: cleanPhone,
        role: 'user',
        channel: 'whatsapp',
        name: '',
      });
      isNewUser = true;
    }

    // Bloquear acceso si la cuenta está desactivada
    if (user.isActive === false) {
      throw new UnauthorizedException('Tu cuenta está desactivada. Contacta a tu operador.');
    }

    const token = this.jwtService.sign(
      { sub: user.id, phone: user.phone, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
    );

    return { access_token: token, token, isNewUser };
  }
}
