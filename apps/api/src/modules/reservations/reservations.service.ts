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
import { VehiculosMxService } from '../vehiculos-mx/vehiculos-mx.service';

/**
 * Normaliza cualquier variante de número mexicano a formato display: +52 XXXXXXXXXX
 * Acepta: 10d, 52+10d (12d), 521+10d (13d — formato Twilio legacy)
 */
function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('521') && d.length === 13) return `+52 ${d.slice(3)}`;
  if (d.startsWith('52')  && d.length === 12) return `+52 ${d.slice(2)}`;
  return `+52 ${d}`;
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private fraud: FraudService,
    private qrService: QrService,
    private vehiculos: VehiculosMxService,
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
    // Soporta operadores directos Y sub-operadores (que heredan el owner_id del padre).
    // Igual que listOperatorEvents: el evento es del operador si su parking_id
    // directo le pertenece, O si el venue del evento tiene ligado (via
    // venue_parkings) algún estacionamiento del operador — antes solo se
    // checaba parking_id directo, lo que bloqueaba (403) eventos ligados al
    // operador solo por venue_parkings, ocultando sus reservas reales.
    const authorized = await this.dataSource.query(
      `SELECT e.id FROM events e
       WHERE e.id = $1
         AND (
           e.parking_id IN (
             SELECT id FROM parkings
             WHERE owner_id = $2
                OR owner_id = (SELECT parent_operator_id FROM users WHERE id = $2 AND role IN ('sub_operator', 'sub_admin'))
           )
           OR e.venue_id IN (
             SELECT vp.venue_id FROM venue_parkings vp
             JOIN parkings pk ON pk.id = vp.parking_id
             WHERE pk.owner_id = $2
                OR pk.owner_id = (SELECT parent_operator_id FROM users WHERE id = $2 AND role IN ('sub_operator', 'sub_admin'))
           )
         )`,
      [eventId, operatorId],
    );

    if (!authorized.length) {
      throw new BadRequestException('No tienes acceso a este evento');
    }

    // r.* no traía el nombre/dirección del estacionamiento ni el monto pagado
    // (faltaban los JOINs a parkings/payments), y el frontend lee "plates"
    // mientras la columna real es vehicle_plate — de ahí que el boleto del
    // operador mostrara Estacionamiento/Dirección/Placas/Monto en blanco.
    return this.dataSource.query(
      `SELECT r.*, u.phone, u.name as user_name,
              q.scanned_at, q.token IS NOT NULL as has_ticket,
              r.vehicle_plate AS plates,
              p.name AS "parkingName", p.address AS "parkingAddress",
              pay.amount AS amount
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN qr_tokens q ON q.reservation_id = r.id
       LEFT JOIN events e2 ON e2.id = r.event_id
       LEFT JOIN parkings p ON p.id = COALESCE(r.parking_id, e2.parking_id)
       LEFT JOIN payments pay ON pay.reservation_id = r.id AND pay.status = 'completed'
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

  // ─── Mapa interno: categoría del vehículo → columna de precio en events ──
  private readonly PRECIO_COL: Record<string, string> = {
    auto:          'price_auto',
    suv_camioneta: 'price_sub',    // price_sub = precio de SUV/Camioneta
    pickup:        'price_pickup',
    moto:          'price_moto',
  };

  async getPricing(reservationId: string, userId: string) {
    const rows = await this.dataSource.query(
      `SELECT e.price, e.price_auto, e.price_sub, e.price_pickup, e.price_moto, r.user_id
       FROM reservations r JOIN events e ON e.id = r.event_id
       WHERE r.id = $1`,
      [reservationId],
    );
    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    const e = rows[0];
    if (e.user_id !== userId) throw new ForbiddenException();
    // Exponer con los nuevos nombres de categoría (el frontend usa esto solo como fallback)
    return {
      base:          parseFloat(e.price),
      auto:          e.price_auto   ? parseFloat(e.price_auto)   : null,
      suv_camioneta: e.price_sub    ? parseFloat(e.price_sub)    : null,
      pickup:        e.price_pickup ? parseFloat(e.price_pickup) : null,
      moto:          e.price_moto   ? parseFloat(e.price_moto)   : null,
    };
  }

  /**
   * Devuelve el precio que le corresponde a un vehículo específico para esta reserva.
   * La categoría se resuelve en el servidor — el cliente solo recibe el precio.
   */
  async getPrecioVehiculo(
    reservationId: string,
    userId: string,
    marca: string,
    modelo: string,
    version?: string,
  ): Promise<{ precio: number | null; error?: string }> {
    const rows = await this.dataSource.query(
      `SELECT e.price, e.price_auto, e.price_sub, e.price_pickup, e.price_moto, r.user_id
       FROM reservations r JOIN events e ON e.id = r.event_id
       WHERE r.id = $1`,
      [reservationId],
    );
    if (!rows.length) throw new NotFoundException('Reserva no encontrada');
    if (rows[0].user_id !== userId) throw new ForbiddenException();

    const clasif = this.vehiculos.resolverVehiculo(marca, modelo, version);
    if (!clasif.ok) return { precio: null, error: clasif.error };

    const e      = rows[0];
    const col    = this.PRECIO_COL[clasif.categoria];
    const precio = e[col] ? parseFloat(e[col]) : parseFloat(e.price);
    return { precio };
  }

  async saveVehicle(
    reservationId: string,
    userId: string,
    dto: {
      plate: string;
      make: string;
      model: string;
      version?: string;
      year?: number;
      color?: string;
    },
  ) {
    // 1. Clasificar en el servidor (el cliente nunca envía la categoría)
    const clasif = this.vehiculos.resolverVehiculo(dto.make, dto.model, dto.version);
    if (!clasif.ok) throw new BadRequestException(clasif.error);

    // 2. Guardar todos los datos del vehículo
    const result = await this.dataSource.query(
      `UPDATE reservations
       SET vehicle_plate   = $1,
           vehicle_make    = $2,
           vehicle_model   = $3,
           vehicle_type    = $4,
           vehicle_year    = $5,
           vehicle_color   = $6,
           vehicle_version = $7
       WHERE id = $8 AND user_id = $9 AND status = 'pending'
       RETURNING id`,
      [
        dto.plate.toUpperCase(),
        dto.make.trim(),
        dto.model.trim(),
        clasif.categoria,           // categoría determinada por el servidor
        dto.year ?? null,
        dto.color?.trim() ?? null,
        dto.version ?? null,
        reservationId,
        userId,
      ],
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
      `SELECT r.id, r.status, r.created_at, r.vehicle_plate,
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
      userPhone: row.user_phone ? formatPhoneDisplay(row.user_phone) : null,
      vehiclePlate: row.vehicle_plate ?? null,
    };
  }

  async createRefundRequest(reservationId: string, userId: string, reason: string, evidencePhotos: string[]) {
    const [row] = await this.dataSource.query(
      `SELECT r.id, r.status, r.user_id,
              e.starts_at
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id = $1`,
      [reservationId],
    );
    if (!row) throw new NotFoundException('Reserva no encontrada');
    if (row.user_id !== userId) throw new ForbiddenException();
    if (row.status !== 'paid') throw new BadRequestException('Solo puedes solicitar reembolso de reservas pagadas');

    const hoursUntilEvent = (new Date(row.starts_at).getTime() - Date.now()) / 3600000;
    if (hoursUntilEvent <= 24) {
      throw new BadRequestException('El plazo para solicitar reembolso (24 horas antes del evento) ha vencido');
    }

    const [claim] = await this.dataSource.query(
      `INSERT INTO claims (user_id, reservation_id, subject, description, type, evidence_photos)
       VALUES ($1, $2, 'Solicitud de reembolso', $3, 'refund_request', $4)
       RETURNING id`,
      [userId, reservationId, reason, JSON.stringify(evidencePhotos)],
    );
    return { data: { claimId: claim.id, message: 'Tu solicitud fue enviada. El equipo la revisará en breve.' } };
  }
}
