import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FraudService } from '../fraud/fraud.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private fraud: FraudService,
  ) {}

  // Crear reserva con bloqueo atómico de slot
  async create(userId: string, eventId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Bloquear slot atómicamente — evita condición de carrera
      const eventResult = await queryRunner.query(
        `UPDATE events
         SET slots_reserved = slots_reserved + 1
         WHERE id = $1 AND slots_reserved < total_slots AND status = 'active'
         RETURNING id, price, name, slots_reserved, total_slots`,
        [eventId],
      );

      if (!eventResult.length) {
        throw new BadRequestException(
          'No hay lugares disponibles para este evento',
        );
      }

      const event = eventResult[0];

      // 2. Actualizar status a sold_out si se llenó
      if (event.slots_reserved >= event.total_slots) {
        await queryRunner.query(
          `UPDATE events SET status = 'sold_out' WHERE id = $1`,
          [eventId],
        );
      }

      // 3. Crear reserva con expiración de 15 minutos
      const reservationResult = await queryRunner.query(
        `INSERT INTO reservations (user_id, event_id, status, expires_at)
         VALUES ($1, $2, 'pending', NOW() + INTERVAL '15 minutes')
         RETURNING *`,
        [userId, eventId],
      );

      const reservation = reservationResult[0];

      await queryRunner.commitTransaction();

      // Fire fraud check outside transaction — never blocks the reservation
      this.fraud.checkRapidReservations(userId).catch(() => {});

      return {
        reservation,
        event: { id: event.id, name: event.name, price: event.price },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByUser(userId: string) {
    return this.dataSource.query(
      `SELECT r.*, e.name as event_name, e.starts_at, e.venue_name,
              p.name as parking_name, p.address as parking_address
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       JOIN parkings p ON p.id = e.parking_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId],
    );
  }

  async findByEvent(eventId: string, operatorId: string) {
    // Verificar que el operador sea dueño del estacionamiento del evento
    const authorized = await this.dataSource.query(
      `SELECT e.id FROM events e
       JOIN parkings p ON p.id = e.parking_id
       WHERE e.id = $1 AND p.owner_id = $2`,
      [eventId, operatorId],
    );

    if (!authorized.length) {
      throw new BadRequestException('No tienes acceso a este evento');
    }

    return this.dataSource.query(
      `SELECT r.*, u.phone, u.name as user_name,
              q.scanned_at, q.token IS NOT NULL as has_ticket
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN qr_tokens q ON q.reservation_id = r.id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId],
    );
  }

  // Cron: expirar reservas pendientes cada 5 minutos y liberar slots
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireReservations() {
    const result = await this.dataSource.query(
      `WITH expired AS (
         UPDATE reservations
         SET status = 'expired'
         WHERE status = 'pending' AND expires_at < NOW()
         RETURNING event_id
       )
       UPDATE events
       SET slots_reserved = GREATEST(0, slots_reserved - (
         SELECT COUNT(*) FROM expired WHERE event_id = events.id
       )),
       status = CASE
         WHEN status = 'sold_out' THEN 'active'
         ELSE status
       END
       WHERE id IN (SELECT DISTINCT event_id FROM expired)
       RETURNING id`,
    );

    if (result.length > 0) {
      console.log(`⏰ ${result.length} reservas expiradas y slots liberados`);
    }
  }

  async cancel(reservationId: string, userId: string) {
    const reservation = await this.dataSource.query(
      `SELECT * FROM reservations WHERE id = $1 AND user_id = $2`,
      [reservationId, userId],
    );

    if (!reservation.length) throw new NotFoundException('Reserva no encontrada');
    if (reservation[0].status !== 'pending') {
      throw new BadRequestException('Solo se pueden cancelar reservas pendientes');
    }

    await this.dataSource.query(
      `UPDATE reservations SET status = 'cancelled' WHERE id = $1`,
      [reservationId],
    );

    // Liberar slot
    await this.dataSource.query(
      `UPDATE events SET slots_reserved = GREATEST(0, slots_reserved - 1)
       WHERE id = $1`,
      [reservation[0].event_id],
    );

    // Fraud check after cancel
    this.fraud.checkRepeatCancels(userId, reservation[0].event_id).catch(() => {});

    return { message: 'Reserva cancelada' };
  }

  async getTicket(reservationId: string, userId: string) {
    const rows = await this.dataSource.query(
      `SELECT r.id, r.status, r.created_at,
              e.name          AS event_name,
              e.venue_name,
              e.starts_at,
              p.name          AS parking_name,
              p.address       AS parking_address,
              pay.amount,
              q.token         AS qr_token,
              u.phone         AS user_phone,
              u.id            AS user_id
       FROM reservations r
       JOIN events e    ON e.id  = r.event_id
       JOIN parkings p  ON p.id  = e.parking_id
       LEFT JOIN payments pay ON pay.reservation_id = r.id AND pay.status = 'completed'
       LEFT JOIN qr_tokens q  ON q.reservation_id  = r.id
       JOIN users u     ON u.id  = r.user_id
       WHERE r.id = $1`,
      [reservationId],
    );

    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    const row = rows[0];
    if (row.user_id !== userId) throw new ForbiddenException();

    return {
      reservation: { id: row.id, status: row.status, createdAt: row.created_at },
      event: {
        name: row.event_name,
        venueName: row.venue_name,
        startsAt: row.starts_at,
        parkingName: row.parking_name,
        parkingAddress: row.parking_address,
      },
      payment: { amount: parseFloat(row.amount ?? '0') },
      qrToken: row.qr_token ?? null,
      userPhone: row.user_phone ? `+52 ${row.user_phone}` : null,
    };
  }
}
