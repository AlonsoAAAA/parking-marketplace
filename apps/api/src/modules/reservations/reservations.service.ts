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
import { QrService } from '../qr/qr.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private fraud: FraudService,
    private qrService: QrService,
  ) {}

  // Crear reserva con bloqueo atómico de slot
  async create(userId: string, eventId: string, parkingId?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar que el evento existe y está activo
      //    Si total_slots > 0: bloquear slot con UPDATE atómico
      //    Si total_slots = 0: el evento no gestiona slots directamente (usa venue_parkings)
      const eventCheck = await queryRunner.query(
        `SELECT id, price, name, total_slots, slots_reserved FROM events
         WHERE id = $1 AND status = 'active'`,
        [eventId],
      );
      if (!eventCheck.length) {
        throw new BadRequestException('Evento no disponible');
      }
      const ev = eventCheck[0];

      let event = ev;
      if (ev.total_slots > 0) {
        // Bloqueo atómico solo cuando hay slots configurados en el evento
        const eventResult = await queryRunner.query(
          `UPDATE events
           SET slots_reserved = slots_reserved + 1
           WHERE id = $1 AND slots_reserved < total_slots AND status = 'active'
           RETURNING id, price, name, slots_reserved, total_slots`,
          [eventId],
        );
        if (!eventResult.length) {
          throw new BadRequestException('No hay lugares disponibles para este evento');
        }
        event = eventResult[0];
        if (event.slots_reserved >= event.total_slots) {
          await queryRunner.query(
            `UPDATE events SET status = 'sold_out' WHERE id = $1`,
            [eventId],
          );
        }
      }

      // 3a. Bloquear slot a nivel de estacionamiento
      if (parkingId) {
        // Intentar con event_parkings (asignación directa por evento)
        const epResult = await queryRunner.query(
          `UPDATE event_parkings
           SET slots_reserved = slots_reserved + 1
           WHERE event_id = $1 AND parking_id = $2
             AND slots_reserved < total_slots
           RETURNING parking_id`,
          [eventId, parkingId],
        );

        if (!epResult.length) {
          // Fallback: venue_parkings — verificar capacidad con conteo de reservas activas
          const vpCheck = await queryRunner.query(
            `SELECT p.total_capacity,
                    (SELECT COUNT(*)::int FROM reservations r
                     WHERE r.event_id = $1 AND r.parking_id = $2
                       AND r.status IN ('pending','paid','used')) AS reserved
             FROM venue_parkings vp
             JOIN parkings p ON p.id = vp.parking_id
             JOIN events e   ON e.venue_id = vp.venue_id
             WHERE e.id = $1 AND vp.parking_id = $2 AND p.is_active = true`,
            [eventId, parkingId],
          );
          if (!vpCheck.length) {
            throw new BadRequestException('Estacionamiento no disponible para este evento');
          }
          const { total_capacity, reserved } = vpCheck[0];
          if (reserved >= total_capacity) {
            throw new BadRequestException('No hay lugares disponibles en ese estacionamiento');
          }
        }
      }

      // 3b. Crear reserva con expiración de 15 minutos
      const reservationResult = await queryRunner.query(
        `INSERT INTO reservations (user_id, event_id, parking_id, status, expires_at)
         VALUES ($1, $2, $3, 'pending', NOW() + INTERVAL '15 minutes')
         RETURNING *`,
        [userId, eventId, parkingId ?? null],
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
              p.name as parking_name, p.address as parking_address,
              q.token as qr_token, q.scanned_at,
              pay.amount as payment_amount
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN parkings p ON p.id = COALESCE(r.parking_id, e.parking_id)
       LEFT JOIN qr_tokens q ON q.reservation_id = r.id
       LEFT JOIN payments pay ON pay.reservation_id = r.id AND pay.status = 'completed'
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId],
    );
  }

  async findByEvent(eventId: string, operatorId: string) {
    // Soporta operadores directos Y sub-operadores (que heredan el owner_id del padre)
    const authorized = await this.dataSource.query(
      `SELECT e.id FROM events e
       JOIN parkings p ON p.id = e.parking_id
       WHERE e.id = $1
         AND (
           p.owner_id = $2
           OR p.owner_id = (
             SELECT parent_operator_id FROM users
             WHERE id = $2 AND role IN ('sub_operator', 'sub_admin')
           )
         )`,
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

  async getPricing(reservationId: string) {
    const rows = await this.dataSource.query(
      `SELECT e.price, e.price_auto, e.price_sub, e.price_pickup, e.price_moto
       FROM reservations r JOIN events e ON e.id = r.event_id
       WHERE r.id = $1`,
      [reservationId],
    );
    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    const e = rows[0];
    return {
      base:   parseFloat(e.price),
      auto:   e.price_auto   ? parseFloat(e.price_auto)   : null,
      sub:    e.price_sub    ? parseFloat(e.price_sub)    : null,
      pickup: e.price_pickup ? parseFloat(e.price_pickup) : null,
      moto:   e.price_moto   ? parseFloat(e.price_moto)   : null,
    };
  }

  async saveVehicle(reservationId: string, userId: string, dto: { plate: string; make: string; model: string; type: string }) {
    const result = await this.dataSource.query(
      `UPDATE reservations
       SET vehicle_plate = $1, vehicle_make = $2, vehicle_model = $3, vehicle_type = $4
       WHERE id = $5 AND user_id = $6 AND status = 'pending'
       RETURNING id`,
      [dto.plate.toUpperCase(), dto.make, dto.model, dto.type, reservationId, userId],
    );
    if (!result.length) throw new NotFoundException('Reserva no encontrada o no editable');
    return { ok: true };
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
       JOIN parkings p  ON p.id  = COALESCE(r.parking_id, e.parking_id)
       LEFT JOIN payments pay ON pay.reservation_id = r.id AND pay.status = 'completed'
       LEFT JOIN qr_tokens q  ON q.reservation_id  = r.id
       JOIN users u     ON u.id  = r.user_id
       WHERE r.id = $1`,
      [reservationId],
    );

    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    const row = rows[0];
    if (row.user_id !== userId) throw new ForbiddenException();

    // Webhook puede llegar después del redirect de Stripe — generar QR lazily si ya está pagado
    let qrToken: string | null = row.qr_token ?? null;
    if (!qrToken && row.status === 'paid') {
      qrToken = await this.qrService.generateQR(reservationId);
    }

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
      qrToken,
      userPhone: row.user_phone ? `+52 ${row.user_phone}` : null,
    };
  }
}
