import { Controller, Post, Get, Param, Body, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { QrService } from './qr.service';
import { JwtGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/guards';
import { IsString } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

class ScanQrDto {
  @IsString()
  token: string;
}

@Controller()
export class ScanController {
  constructor(
    private qrService: QrService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  // POST /api/v1/scan — solo operadores y admins
  @Post('scan')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('operator', 'sub_operator', 'sub_admin', 'admin')
  async scan(@Body() dto: ScanQrDto, @Req() req: any) {
    return this.qrService.validateScan(dto.token, req.user.id);
  }

  // GET /api/v1/qr/:reservationId/image — imagen QR pública para Twilio mediaUrl
  @Get('qr/:reservationId/image')
  async qrImage(@Param('reservationId') reservationId: string, @Res() res: Response) {
    const rows = await this.dataSource.query(
      `SELECT token FROM qr_tokens WHERE reservation_id = $1 AND scanned_at IS NULL`,
      [reservationId],
    );
    if (!rows.length) throw new NotFoundException('QR no encontrado');

    const dataUrl = await this.qrService.generateQRImage(rows[0].token);
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buf = Buffer.from(base64, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  }
}
