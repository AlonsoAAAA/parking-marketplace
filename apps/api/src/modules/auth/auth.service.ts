import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpEntity } from './entities/otp.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(OtpEntity)
    private otpRepo: Repository<OtpEntity>,
  ) {}

  // Paso 1: Enviar OTP por WhatsApp
  async sendOtp(phone: string): Promise<{ message: string; devOtp?: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const isDev = this.config.get('NODE_ENV') === 'development';
    // En desarrollo usamos OTP fijo para que las credenciales del demo siempre funcionen
    const otp = isDev ? '111222' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await this.otpRepo.upsert(
      { phone: cleanPhone, otp, expiresAt, verified: false },
      ['phone'],
    );

    await this.sendWhatsAppOtp(cleanPhone, otp);

    return { message: 'Código enviado por WhatsApp', ...(isDev && { devOtp: otp }) };
  }

  // Paso 2: Verificar OTP y devolver JWT
  async verifyOtp(phone: string, otp: string): Promise<{ access_token: string; token: string; isNewUser: boolean }> {
    const cleanPhone = phone.replace(/\D/g, '');

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

    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return { access_token: token, token, isNewUser };
  }

  private async sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_WHATSAPP_NUMBER');

    // Normalizar siempre a 521XXXXXXXXXX (13 dígitos) para WhatsApp mexicano
    const digits = phone.replace(/\D/g, '');
    let waPhone: string;
    if (digits.length === 10) {
      // Solo los 10 dígitos → agregar 521
      waPhone = `521${digits}`;
    } else if (digits.length === 12 && digits.startsWith('52')) {
      // 52XXXXXXXXXX → 521XXXXXXXXXX
      waPhone = `521${digits.slice(2)}`;
    } else if (digits.length === 13 && digits.startsWith('521')) {
      // Ya tiene formato correcto
      waPhone = digits;
    } else {
      waPhone = digits;
    }

    console.log(`📱 OTP para +${waPhone}: ${otp}`);

    if (!accountSid || !authToken || !fromNumber) {
      console.log('⚠️  Twilio no configurado — OTP solo en consola');
      return;
    }

    try {
      const twilio = require('twilio')(accountSid, authToken);
      await twilio.messages.create({
        body: `Tu código de verificación para ParkingMX es: *${otp}*\n\nVálido por 10 minutos.`,
        from: fromNumber,
        to: `whatsapp:+${waPhone}`,
      });
      console.log(`✅ WhatsApp enviado a +${waPhone}`);
    } catch (e) {
      console.error(`❌ Twilio error: ${e?.message} (código: ${e?.code})`);
    }
  }
}
