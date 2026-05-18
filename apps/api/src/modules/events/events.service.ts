import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class EventsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private readonly SELECT = `
    SELECT e.id, e.name, e.status, e.price,
           e.venue_name       AS "venueName",
           e.starts_at        AS "startsAt",
           e.ends_at          AS "endsAt",
           e.total_slots      AS "totalSlots",
           e.slots_reserved   AS "slotsReserved",
           e.parking_id       AS "parkingId",
           e.created_at       AS "createdAt",
           p.name             AS "parkingName",
           p.address          AS "parkingAddress",
           p.lat, p.lng
    FROM events e
    JOIN parkings p ON p.id = e.parking_id`;

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
}
