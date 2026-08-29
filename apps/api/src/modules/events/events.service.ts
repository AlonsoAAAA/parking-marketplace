import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EventsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // Cron: mover a "finished" los eventos activos/agotados cuyo fin ya pasó.
  // Sin esto se quedan como "active" para siempre — no aparecen en la
  // pestaña Finalizado del admin y en teoría se podrían seguir reservando.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async finishEndedEvents() {
    // UPDATE...RETURNING devuelve [filas[], contador], no las filas directas.
    const [rows] = await this.dataSource.query(
      `UPDATE events
       SET status = 'finished'
       WHERE status IN ('active', 'sold_out') AND ends_at < NOW()
       RETURNING id`,
    );
    if (rows.length > 0) {
      console.log(`🏁 ${rows.length} eventos marcados como finalizados`);
    }
  }

  private readonly SELECT = `
    SELECT e.id, e.name, e.status, e.price,
           e.venue_name       AS "venueName",
           e.venue_id         AS "venueId",
           e.starts_at        AS "startsAt",
           e.ends_at          AS "endsAt",
           e.parking_id       AS "parkingId",
           e.created_at       AS "createdAt",
           e.category,
           e.image_url        AS "imageUrl",
           p.name             AS "parkingName",
           p.address          AS "parkingAddress",
           COALESCE(p.lat, v.lat)::float AS lat,
           COALESCE(p.lng, v.lng)::float AS lng,
           COALESCE(
             (SELECT SUM(ep.total_slots)    FROM event_parkings ep WHERE ep.event_id = e.id),
             (SELECT SUM(pk.total_capacity) FROM venue_parkings vp JOIN parkings pk ON pk.id = vp.parking_id WHERE vp.venue_id = e.venue_id AND pk.is_active = true),
             0
           )::int AS "totalSlots",
           COALESCE(
             (SELECT SUM(ep.slots_reserved) FROM event_parkings ep WHERE ep.event_id = e.id),
             (SELECT COUNT(*)               FROM reservations r  WHERE r.event_id = e.id AND r.status IN ('paid','used')),
             0
           )::int AS "slotsReserved"
    FROM events e
    LEFT JOIN parkings p ON p.id = e.parking_id
    LEFT JOIN venues   v ON v.id = e.venue_id`;

  async findAll(status?: string, search?: string) {
    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (status) {
      params.push(status);
      where += ` AND e.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (e.name ILIKE $${params.length} OR e.venue_name ILIKE $${params.length})`;
    }

    return this.dataSource.query(
      `${this.SELECT} ${where} ORDER BY e.starts_at ASC`,
      params,
    );
  }

  async findById(id: string) {
    const rows = await this.dataSource.query(
      `${this.SELECT} WHERE e.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  // Parkings disponibles para un evento con distancia y precios.
  // Fuente 1: event_parkings (asignación directa por evento)
  // Fuente 2: venue_parkings (asociación por venue — fallback cuando no hay asignación directa)
  async findParkings(eventId: string) {
    return this.dataSource.query(
      `WITH src AS (
         -- Fuente directa: event_parkings
         SELECT ep.parking_id,
                ep.distance_meters,
                ep.walk_minutes,
                ep.total_slots,
                ep.slots_reserved
         FROM event_parkings ep
         WHERE ep.event_id = $1

         UNION ALL

         -- Fuente de venue: venue_parkings (solo cuando no hay fila en event_parkings)
         SELECT vp.parking_id,
                vp.distance_meters,
                vp.walk_minutes,
                p2.total_capacity                                              AS total_slots,
                (SELECT COUNT(*)::int FROM reservations r
                 WHERE r.event_id = $1 AND r.parking_id = vp.parking_id
                   AND r.status IN ('paid','used'))                            AS slots_reserved
         FROM events e
         JOIN venue_parkings vp ON vp.venue_id = e.venue_id
         JOIN parkings p2       ON p2.id = vp.parking_id
         WHERE e.id = $1
           AND NOT EXISTS (
             SELECT 1 FROM event_parkings ep2
             WHERE ep2.event_id = $1 AND ep2.parking_id = vp.parking_id
           )
       )
       SELECT p.id, p.name, p.address,
              COALESCE(p.lat, v.lat)::float AS lat,
              COALESCE(p.lng, v.lng)::float AS lng,
              src.distance_meters AS "distanceMeters",
              src.walk_minutes    AS "walkMinutes",
              src.total_slots     AS "totalSlots",
              src.slots_reserved  AS "slotsReserved",
              src.total_slots - src.slots_reserved AS "available",
              COALESCE(
                json_object_agg(sp.vehicle_type, sp.price)
                  FILTER (WHERE sp.vehicle_type IS NOT NULL),
                '{}'::json
              ) AS pricing
       FROM src
       JOIN parkings p ON p.id = src.parking_id
       JOIN events ev ON ev.id = $1
       LEFT JOIN venues v ON v.id = ev.venue_id
       LEFT JOIN parking_slots_pricing sp ON sp.parking_id = p.id
       WHERE p.is_active = true
       GROUP BY p.id, p.name, p.address, COALESCE(p.lat, v.lat), COALESCE(p.lng, v.lng),
                src.distance_meters, src.walk_minutes, src.total_slots, src.slots_reserved
       ORDER BY src.distance_meters ASC`,
      [eventId],
    );
  }
}
