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
  async sendOtp(phone: string): Promise<{ message: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guardar OTP hasheado en BD (en producción, hashear con bcrypt)
    await this.otpRepo.upsert(
      { phone: cleanPhone, otp, expiresAt, verified: false },
      ['phone'],
    );

    // Enviar por WhatsApp vía Twilio
    await this.sendWhatsAppOtp(cleanPhone, otp);

    return { message: 'Código enviado por WhatsApp' };
  }

  // Paso 2: Verificar OTP y devolver JWT
  async verifyOtp(phone: string, otp: string): Promise<{ access_token: string; token: string; isNewUser: boolean }> {
    const cleanPhone = phone.replace(/\D/g, '');

    const record = await this.otpRepo.findOne({
      where: { phone: cleanPhone, verified: false },
    });

    if (!record) throw new UnauthorizedException('Código no encontrado');
    if (record.otp !== otp) throw new UnauthorizedException('Código incorrecto');
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Código expirado');

    // Marcar como usado
    await this.otpRepo.update({ phone: cleanPhone }, { verified: true });

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

    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return { access_token: token, token, isNewUser };
  }

  private async sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
    // Integración con Twilio WhatsApp
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get('TWILIO_WHATSAPP_NUMBER');

    // En desarrollo: solo log
    if (this.config.get('NODE_ENV') === 'development') {
      console.log(`📱 OTP para ${phone}: ${otp}`);
      return;
    }

    const twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({
      body: `Tu código de verificación para ParkingMX es: *${otp}*\n\nVálido por 10 minutos.`,
      from: fromNumber,
      to: `whatsapp:+${phone}`,
    });
  }
}
