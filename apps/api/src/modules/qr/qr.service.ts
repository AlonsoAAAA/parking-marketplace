import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import * as QRCode from 'qrcode';
import { ScanResult } from '@parking/shared';
import { FraudService } from '../fraud/fraud.service';

@Injectable()
export class QrService {
  constructor(
    private config: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
    private fraud: FraudService,
  ) {}

  // Generar QR token para una reserva pagada
  async generateQR(reservationId: string): Promise<string> {
    const secret = this.config.get('QR_SECRET');

    const token = jwt.sign(
      { reservation_id: reservationId, type: 'parking_ticket' },
      secret,
      { expiresIn: '7d' },
    );

    // Guardar token — ON CONFLICT para idempotencia
    await this.dataSource.query(
      `INSERT INTO qr_tokens (reservation_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')
       ON CONFLICT (reservation_id) DO NOTHING`,
      [reservationId, token],
    );

    return token;
  }

  // Generar imagen PNG del QR como base64
  async generateQRImage(token: string): Promise<string> {
    const qrData = JSON.stringify({ t: token }); // payload mínimo
    return QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }

  // Validar QR al escanear — operación crítica con UPDATE atómico
  async validateScan(token: string, operatorId: string): Promise<ScanResult> {
    const secret = this.config.get('QR_SECRET');

    // 1. Verificar firma JWT
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return { valid: false, reason: 'TOKEN_INVÁLIDO' };
    }

    // 2. Buscar en BD con info completa
    const result = await this.dataSource.query(
      `SELECT q.*, r.status as reservation_status, r.event_id, r.user_id, r.vehicle_plate,
              e.name as event_name, e.starts_at, e.ends_at,
              u.name as user_name, u.phone as user_phone
       FROM qr_tokens q
       JOIN reservations r ON r.id = q.reservation_id
       JOIN events e ON e.id = r.event_id
       JOIN users u ON u.id = r.user_id
       WHERE q.token = $1`,
      [token],
    );

    if (!result.length) {
      return { valid: false, reason: 'NO_ENCONTRADO' };
    }

    const record = result[0];

    // 3. Validaciones de negocio
    if (record.scanned_at) {
      this.fraud
        .checkDuplicateScan(record.user_id, record.reservation_id, operatorId)
        .catch(() => {});
      return {
        valid: false,
        reason: 'YA_USADO',
        scannedAt: record.scanned_at,
      };
    }

    if (record.reservation_status !== 'paid') {
      return { valid: false, reason: 'NO_PAGADO' };
    }

    // 4. Marcar como usado — UPDATE atómico para evitar doble escaneo simultáneo
    const updateResult = await this.dataSource.query(
      `UPDATE qr_tokens
       SET scanned_at = NOW(), scanned_by = $1
       WHERE token = $2 AND scanned_at IS NULL
       RETURNING *`,
      [operatorId, token],
    );

    if (!updateResult.length) {
      return { valid: false, reason: 'CONDICIÓN_DE_CARRERA' };
    }

    // 5. Marcar reserva como usada
    await this.dataSource.query(
      `UPDATE reservations SET status = 'used' WHERE id = $1`,
      [payload.reservation_id],
    );

    return {
      valid: true,
      reason: 'ACCESO_PERMITIDO',
      reservationId: record.reservation_id,
      userName: record.user_name,
      eventName: record.event_name,
      vehiclePlate: record.vehicle_plate ?? undefined,
      reservation: {
        id: record.reservation_id,
        userId: record.user_id,
        eventId: record.event_id,
        status: 'used',
        expiresAt: record.expires_at,
        createdAt: record.created_at,
      },
    };
  }
}
