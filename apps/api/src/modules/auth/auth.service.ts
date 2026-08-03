import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpEntity } from './entities/otp.entity';
import { normalizePhone } from '../../lib/phone';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(OtpEntity)
    private otpRepo: Repository<OtpEntity>,
  ) {}

  // Paso 1: Enviar OTP por SMS
  // Canal temporal mientras Meta valida la cuenta de WhatsApp Business — el
  // WABA está en estado "Test" y Meta rechaza la creación de templates de
  // Authentication hasta completar la verificación de negocio (confirmado
  // directamente contra la Graph API: "does not have permission to create
  // message template"). SMS no depende de Meta ni de templates aprobados,
  // así que sirve como canal de arranque mientras eso se resuelve. Cuando
  // el WABA quede validado, este método se reemplaza por el envío vía
  // WhatsApp Cloud API con template de Authentication.
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

    await this.sendOtpSms(cleanPhone, otp);

    return { message: 'Código enviado por SMS', ...(isDev && { devOtp: otp }) };
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

  private async sendOtpSms(phone: string, otp: string): Promise<void> {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_SMS_FROM_NUMBER');

    // Normalizar a 52XXXXXXXXXX (12 dígitos, sin '1' extra) — formato E.164
    // estándar de SMS, distinto del prefijo 521 que usa WhatsApp para México.
    const digits = phone.replace(/\D/g, '');
    let smsPhone: string;
    if (digits.length === 10) {
      smsPhone = `52${digits}`;
    } else if (digits.length === 13 && digits.startsWith('521')) {
      smsPhone = `52${digits.slice(3)}`;
    } else if (digits.length === 12 && digits.startsWith('52')) {
      smsPhone = digits;
    } else {
      smsPhone = digits;
    }

    // El OTP en texto plano solo se loguea en desarrollo — nunca en producción.
    if (this.config.get('NODE_ENV') === 'development') {
      console.log(`📱 OTP para +${smsPhone}: ${otp}`);
    }

    if (!accountSid || !authToken || !fromNumber) {
      console.log('⚠️  Twilio SMS no configurado — OTP solo en consola');
      return;
    }

    try {
      const twilio = require('twilio')(accountSid, authToken);
      await twilio.messages.create({
        from: fromNumber,
        to: `+${smsPhone}`,
        body: `Tu código de verificación para EstacionaT es: ${otp}\n\nVálido por 10 minutos. No lo compartas con nadie.`,
      });
      console.log(`✅ SMS enviado a +${smsPhone}`);
    } catch (e) {
      console.error(`❌ Twilio SMS error: ${e?.message} (código: ${e?.code})`);
    }
  }
}
