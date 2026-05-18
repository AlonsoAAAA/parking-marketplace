import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(@InjectDataSource() private db: DataSource) {}

  // ─── Metrics ──────────────────────────────────────────────────────────────

  async getMetrics() {
    const [row] = await this.db.query(`
      SELECT
        (SELECT COUNT(*)            FROM users         WHERE role = 'user')::int                                    AS "totalUsers",
        (SELECT COUNT(*)            FROM events        WHERE status = 'active')::int                                AS "activeEvents",
        (SELECT COUNT(*)            FROM reservations  WHERE status IN ('paid','used'))::int                        AS "paidReservations",
        (SELECT COALESCE(SUM(amount),0) FROM payments  WHERE status = 'completed')                                 AS "totalRevenue",
        (SELECT COUNT(*)            FROM reservations  WHERE created_at::date = CURRENT_DATE)::int                  AS "reservationsToday",
        (SELECT COALESCE(SUM(amount),0) FROM payments  WHERE status = 'completed' AND paid_at::date = CURRENT_DATE) AS "revenueToday",
        (SELECT COUNT(*)            FROM claims        WHERE status = 'open')::int                                  AS "openClaims",
        (SELECT COUNT(*)            FROM parkings      WHERE is_active = true)::int                                 AS "activeParkings"
    `);
    return {
      ...row,
      totalRevenue:  parseFloat(row.totalRevenue  ?? '0'),
      revenueToday:  parseFloat(row.revenueToday  ?? '0'),
    };
  }

  // ─── Venues ───────────────────────────────────────────────────────────────

  listVenues() {
    return this.db.query(`SELECT * FROM venues ORDER BY name`);
  }

  async createVenue(data: { name: string; city: string; address: string; capacity: number }) {
    const [row] = await this.db.query(
      `INSERT INTO venues (name, city, address, capacity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.city ?? 'CDMX', data.address ?? '', data.capacity ?? 0],
    );
    return row;
  }

  async updateVenue(id: string, data: Partial<{ name: string; city: string; address: string; capacity: number }>) {
    await this.db.query(
      `UPDATE venues
       SET name     = COALESCE($1, name),
           city     = COALESCE($2, city),
           address  = COALESCE($3, address),
           capacity = COALESCE($4, capacity)
       WHERE id = $5`,
      [data.name, data.city, data.address, data.capacity, id],
    );
    const rows = await this.db.query(`SELECT * FROM venues WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Venue no encontrado');
    return rows[0];
  }

  async deleteVenue(id: string) {
    await this.db.query(`DELETE FROM venues WHERE id = $1`, [id]);
    return { message: 'Venue eliminado' };
  }

  // ─── Parkings ─────────────────────────────────────────────────────────────

  listParkings() {
    return this.db.query(`
      SELECT p.*, u.name AS "ownerName", u.phone AS "ownerPhone",
             (SELECT COUNT(*) FROM events e WHERE e.parking_id = p.id)::int AS "eventsCount"
      FROM parkings p
      LEFT JOIN users u ON u.id = p.owner_id
      ORDER BY p.created_at DESC
    `);
  }

  async createParking(data: {
    ownerId?: string; name: string; address: string;
    lat?: number; lng?: number; totalCapacity: number;
  }) {
    const [row] = await this.db.query(
      `INSERT INTO parkings (owner_id, name, address, lat, lng, total_capacity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.ownerId ?? null, data.name, data.address, data.lat ?? null, data.lng ?? null, data.totalCapacity ?? 0],
    );
    return row;
  }

  async updateParking(id: string, data: Partial<{
    name: string; address: string; totalCapacity: number; isActive: boolean; ownerId: string;
  }>) {
    await this.db.query(
      `UPDATE parkings
       SET name           = COALESCE($1, name),
           address        = COALESCE($2, address),
           total_capacity = COALESCE($3, total_capacity),
           is_active      = COALESCE($4, is_active),
           owner_id       = COALESCE($5, owner_id)
       WHERE id = $6`,
      [data.name, data.address, data.totalCapacity, data.isActive, data.ownerId ?? null, id],
    );
    const rows = await this.db.query(`SELECT * FROM parkings WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Estacionamiento no encontrado');
    return rows[0];
  }

  async deleteParking(id: string) {
    await this.db.query(`DELETE FROM parkings WHERE id = $1`, [id]);
    return { message: 'Estacionamiento eliminado' };
  }

  // ─── Events (admin CRUD) ──────────────────────────────────────────────────

  listEvents(status?: string) {
    const params: any[] = [];
    let where = '';
    if (status) { params.push(status); where = `WHERE e.status = $1`; }
    return this.db.query(
      `SELECT e.*, p.name AS "parkingName", p.address AS "parkingAddress"
       FROM events e
       JOIN parkings p ON p.id = e.parking_id
       ${where}
       ORDER BY e.starts_at DESC`,
      params,
    );
  }

  async createEvent(data: {
    parkingId: string; name: string; venueName: string;
    startsAt: string; endsAt: string; price: number; totalSlots: number; status?: string;
  }) {
    const [row] = await this.db.query(
      `INSERT INTO events (parking_id, name, venue_name, starts_at, ends_at, price, total_slots, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.parkingId, data.name, data.venueName, data.startsAt, data.endsAt,
       data.price, data.totalSlots, data.status ?? 'draft'],
    );
    return row;
  }

  async updateEvent(id: string, data: Partial<{
    name: string; venueName: string; startsAt: string; endsAt: string;
    price: number; totalSlots: number; status: string; parkingId: string;
  }>) {
    await this.db.query(
      `UPDATE events
       SET name         = COALESCE($1, name),
           venue_name   = COALESCE($2, venue_name),
           starts_at    = COALESCE($3::timestamptz, starts_at),
           ends_at      = COALESCE($4::timestamptz, ends_at),
           price        = COALESCE($5, price),
           total_slots  = COALESCE($6, total_slots),
           status       = COALESCE($7, status),
           parking_id   = COALESCE($8::uuid, parking_id)
       WHERE id = $9`,
      [data.name, data.venueName, data.startsAt ?? null, data.endsAt ?? null,
       data.price, data.totalSlots, data.status, data.parkingId ?? null, id],
    );
    const rows = await this.db.query(`SELECT * FROM events WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Evento no encontrado');
    return rows[0];
  }

  async deleteEvent(id: string) {
    await this.db.query(`DELETE FROM events WHERE id = $1`, [id]);
    return { message: 'Evento eliminado' };
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  listUsers(search?: string) {
    const q = search ? `%${search}%` : null;
    return this.db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.channel, u.created_at,
              (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id)::int               AS "totalReservations",
              (SELECT COUNT(*) FROM reservations r WHERE r.user_id = u.id AND r.status = 'paid')::int AS "paidReservations"
       FROM users u
       WHERE ($1::text IS NULL OR u.name ILIKE $1 OR u.phone ILIKE $1 OR u.email ILIKE $1)
       ORDER BY u.created_at DESC`,
      [q],
    );
  }

  // ─── Claims ───────────────────────────────────────────────────────────────

  listClaims(status?: string) {
    const params: any[] = [];
    let where = '';
    if (status && status !== 'all') { params.push(status); where = `WHERE c.status = $1`; }
    return this.db.query(
      `SELECT c.*,
              u.name  AS "userName",  u.phone AS "userPhone",
              e.name  AS "eventName"
       FROM claims c
       LEFT JOIN users u        ON u.id = c.user_id
       LEFT JOIN reservations r ON r.id = c.reservation_id
       LEFT JOIN events e       ON e.id = r.event_id
       ${where}
       ORDER BY c.created_at DESC`,
      params,
    );
  }

  async getClaim(id: string) {
    const [row] = await this.db.query(
      `SELECT c.*,
              u.name  AS "userName",  u.phone AS "userPhone",  u.email AS "userEmail",
              e.name  AS "eventName", e.starts_at AS "eventStartsAt",
              r.status AS "reservationStatus"
       FROM claims c
       LEFT JOIN users u        ON u.id = c.user_id
       LEFT JOIN reservations r ON r.id = c.reservation_id
       LEFT JOIN events e       ON e.id = r.event_id
       WHERE c.id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException('Reclamo no encontrado');
    return row;
  }

  async createClaim(data: { userId?: string; reservationId?: string; subject: string; description: string }) {
    const [row] = await this.db.query(
      `INSERT INTO claims (user_id, reservation_id, subject, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.userId ?? null, data.reservationId ?? null, data.subject, data.description ?? ''],
    );
    return row;
  }

  async updateClaim(id: string, data: { status?: string; adminNotes?: string }) {
    await this.db.query(
      `UPDATE claims
       SET status      = COALESCE($1, status),
           admin_notes = COALESCE($2, admin_notes),
           updated_at  = NOW(),
           resolved_at = CASE WHEN $1 = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END
       WHERE id = $3`,
      [data.status ?? null, data.adminNotes ?? null, id],
    );
    const rows = await this.db.query(`SELECT * FROM claims WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Reclamo no encontrado');
    return rows[0];
  }

  async deleteClaim(id: string) {
    await this.db.query(`DELETE FROM claims WHERE id = $1`, [id]);
    return { message: 'Reclamo eliminado' };
  }

  // ─── Promotions ───────────────────────────────────────────────────────────

  listPromotions() {
    return this.db.query(`
      SELECT pr.*, e.name AS "eventName"
      FROM promotions pr
      LEFT JOIN events e ON e.id = pr.event_id
      ORDER BY pr.created_at DESC
    `);
  }

  async createPromotion(data: {
    code: string; type: string; value: number;
    eventId?: string; maxUses?: number; expiresAt?: string;
  }) {
    const [row] = await this.db.query(
      `INSERT INTO promotions (code, type, value, event_id, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.code.toUpperCase(), data.type, data.value,
       data.eventId ?? null, data.maxUses ?? null, data.expiresAt ?? null],
    );
    return row;
  }

  async updatePromotion(id: string, data: Partial<{
    code: string; type: string; value: number;
    eventId: string; maxUses: number; expiresAt: string; isActive: boolean;
  }>) {
    await this.db.query(
      `UPDATE promotions
       SET code       = COALESCE($1, code),
           type       = COALESCE($2, type),
           value      = COALESCE($3, value),
           event_id   = COALESCE($4::uuid, event_id),
           max_uses   = COALESCE($5, max_uses),
           expires_at = COALESCE($6::timestamptz, expires_at),
           is_active  = COALESCE($7, is_active)
       WHERE id = $8`,
      [data.code?.toUpperCase() ?? null, data.type, data.value,
       data.eventId ?? null, data.maxUses, data.expiresAt ?? null, data.isActive, id],
    );
    const rows = await this.db.query(`SELECT * FROM promotions WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Promoción no encontrada');
    return rows[0];
  }

  async deletePromotion(id: string) {
    await this.db.query(`DELETE FROM promotions WHERE id = $1`, [id]);
    return { message: 'Promoción eliminada' };
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  listPayments(status?: string) {
    const params: any[] = [];
    let where = '';
    if (status && status !== 'all') { params.push(status); where = `WHERE pay.status = $1`; }
    return this.db.query(
      `SELECT pay.id, pay.amount, pay.currency, pay.status, pay.provider_payment_id,
              pay.paid_at, pay.created_at,
              u.name  AS "userName",  u.phone AS "userPhone",
              e.name  AS "eventName",
              r.id    AS "reservationId"
       FROM payments pay
       JOIN reservations r ON r.id = pay.reservation_id
       JOIN users u         ON u.id = r.user_id
       JOIN events e        ON e.id = r.event_id
       ${where}
       ORDER BY pay.created_at DESC`,
      params,
    );
  }
}
