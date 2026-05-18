import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Injectable()
export class CheckinService {
  constructor(private dataSource: DataSource) {}

  async createCheckin(reservationId: string, dto: CreateCheckinDto, operatorId: string) {
    const [reservation] = await this.dataSource.query<any[]>(
      `SELECT r.id, r.status, u.name as user_name, e.name as event_name
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       JOIN events e ON e.id = r.event_id
       WHERE r.id = $1`,
      [reservationId],
    );

    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (!['paid', 'used'].includes(reservation.status)) {
      throw new BadRequestException(`Estado de reserva inválido: ${reservation.status}`);
    }

    await this.dataSource.query(
      `INSERT INTO vehicle_checkins
         (reservation_id, plate, photo_front, photo_back, photo_left, photo_right, checked_in_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (reservation_id) DO UPDATE SET
         plate         = EXCLUDED.plate,
         photo_front   = EXCLUDED.photo_front,
         photo_back    = EXCLUDED.photo_back,
         photo_left    = EXCLUDED.photo_left,
         photo_right   = EXCLUDED.photo_right,
         checked_in_by = EXCLUDED.checked_in_by,
         created_at    = NOW()`,
      [
        reservationId,
        dto.plate.toUpperCase(),
        dto.photoFront,
        dto.photoBack,
        dto.photoLeft,
        dto.photoRight,
        operatorId,
      ],
    );

    const [checkin] = await this.dataSource.query<any[]>(
      `SELECT id, created_at FROM vehicle_checkins WHERE reservation_id = $1`,
      [reservationId],
    );

    return {
      reservationId,
      plate: dto.plate.toUpperCase(),
      userName: reservation.user_name,
      eventName: reservation.event_name,
      checkedInAt: checkin.created_at,
    };
  }
}
