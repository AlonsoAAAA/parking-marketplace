import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { QrService } from './qr.service';
import { JwtGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/guards';
import { IsString } from 'class-validator';

class ScanQrDto {
  @IsString()
  token: string;
}

@Controller('scan')
export class ScanController {
  constructor(private qrService: QrService) {}

  // POST /api/v1/scan
  // Solo operadores y admins pueden escanear
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('operator', 'admin')
  async scan(@Body() dto: ScanQrDto, @Req() req: any) {
    return this.qrService.validateScan(dto.token, req.user.id);
  }
}
