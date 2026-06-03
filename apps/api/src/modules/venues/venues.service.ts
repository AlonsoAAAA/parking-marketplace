import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class VenuesService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findAll(category?: string) {
    const params: any[] = [];
    let where = 'WHERE v.lat IS NOT NULL';
    if (category) {
      params.push(category);
      where += ` AND v.category = $${params.length}`;
    }

    return this.dataSource.query(
      `SELECT
         v.id, v.name, v.city, v.address, v.lat, v.lng,
         v.photo_url  AS "photoUrl",
         v.category,
         v.capacity,
         COUNT(e.id) FILTER (WHERE e.status = 'active' AND e.starts_at > NOW()) AS "upcomingEvents",
         MIN(e.price) FILTER (WHERE e.status = 'active' AND e.starts_at > NOW()) AS "priceFrom"
       FROM venues v
       LEFT JOIN events e ON e.venue_id = v.id
       ${where}
       GROUP BY v.id
       ORDER BY "upcomingEvents" DESC NULLS LAST, v.name`,
      params,
    );
  }

  async findById(id: string) {
    const rows = await this.dataSource.query(
      `SELECT
         v.id, v.name, v.city, v.address, v.lat, v.lng,
         v.photo_url AS "photoUrl", v.category, v.capacity
       FROM venues v WHERE v.id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException('Venue no encontrado');
    return rows[0];
  }

  async findEvents(venueId: string) {
    await this.findById(venueId); // 404 si no existe
    return this.dataSource.query(
      `SELECT
         e.id, e.name, e.category, e.status,
         e.starts_at AS "startsAt",
         e.ends_at   AS "endsAt",
         e.price,
         -- totalSlots: suma de event_parkings; si no hay, suma de venue_parkings (total_capacity del parking)
         COALESCE(
           (SELECT SUM(ep.total_slots)   FROM event_parkings ep WHERE ep.event_id = e.id),
           (SELECT SUM(p.total_capacity) FROM venue_parkings vp JOIN parkings p ON p.id = vp.parking_id WHERE vp.venue_id = e.venue_id AND p.is_active = true),
           0
         )::int AS "totalSlots",
         -- slotsReserved: suma de event_parkings; si no hay, cuenta reservaciones reales
         COALESCE(
           (SELECT SUM(ep.slots_reserved) FROM event_parkings ep WHERE ep.event_id = e.id),
           (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id AND r.status IN ('paid','used')),
           0
         )::int AS "slotsReserved"
       FROM events e
       WHERE e.venue_id = $1
         AND e.status IN ('active','sold_out')
         AND e.starts_at > NOW()
       ORDER BY e.starts_at ASC`,
      [venueId],
    );
  }
}
