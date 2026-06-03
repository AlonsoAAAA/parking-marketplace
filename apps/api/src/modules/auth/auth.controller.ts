import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { IsString, Matches } from 'class-validator';

class SendOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Teléfono inválido' })
  phone: string;
}

class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'OTP debe ser 6 dígitos' })
  otp: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/v1/auth/send-otp
  // Límite: 5 solicitudes por minuto por IP (evita spam de OTPs / costo Twilio)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  // POST /api/v1/auth/verify-otp
  // Límite: 10 intentos por minuto por IP (la lógica de bloqueo está en el service)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }
}
