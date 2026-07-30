import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { normalizePhone } from '../../lib/phone';

@Injectable()
export class AdminService {
  private stripe: Stripe;
  constructor(
    @InjectDataSource() private db: DataSource,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });
  }

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
    return this.db.query(`SELECT *, photo_url AS "photoUrl" FROM venues ORDER BY name`);
  }

  async createVenue(data: { name: string; city: string; address: string; capacity: number; lat?: number; lng?: number; photoUrl?: string }) {
    const [row] = await this.db.query(
      `INSERT INTO venues (name, city, address, capacity, lat, lng, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.name, data.city ?? 'CDMX', data.address ?? '', data.capacity ?? 0, data.lat ?? null, data.lng ?? null, data.photoUrl ?? null],
    );
    return row;
  }

  async updateVenue(id: string, data: Partial<{ name: string; city: string; address: string; capacity: number; lat: number; lng: number; photoUrl: string }>) {
    await this.db.query(
      `UPDATE venues
       SET name      = COALESCE($1, name),
           city      = COALESCE($2, city),
           address   = COALESCE($3, address),
           capacity  = COALESCE($4, capacity),
           lat       = COALESCE($5, lat),
           lng       = COALESCE($6, lng),
           photo_url = COALESCE($7, photo_url)
       WHERE id = $8`,
      [data.name, data.city, data.address, data.capacity, data.lat, data.lng, data.photoUrl, id],
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
      SELECT p.*,
             u.name  AS "ownerName",
             u.phone AS "ownerPhone",
             (SELECT COUNT(*) FROM events e WHERE e.parking_id = p.id)::int AS "eventsCount",
             (SELECT COALESCE(json_agg(
                json_build_object('vehicleType', sp.vehicle_type, 'slots', sp.slots, 'price', sp.price)
                ORDER BY sp.vehicle_type
              ), '[]'::json)
              FROM parking_slots_pricing sp WHERE sp.parking_id = p.id
             ) AS pricing,
             (SELECT COALESCE(json_agg(
                json_build_object('id', v.id, 'name', v.name, 'distanceMeters', vp.distance_meters, 'walkMinutes', vp.walk_minutes)
                ORDER BY v.name
              ), '[]'::json)
              FROM venue_parkings vp JOIN venues v ON v.id = vp.venue_id WHERE vp.parking_id = p.id
             ) AS venues
      FROM parkings p
      LEFT JOIN users u ON u.id = p.owner_id
      ORDER BY p.created_at DESC
    `);
  }

  async createParking(data: {
    ownerId?: string; name: string; address: string;
    lat?: number; lng?: number;
    pricing?: Array<{ vehicleType: string; slots: number; price: number }>;
  }) {
    const totalCapacity = (data.pricing ?? []).reduce((s, p) => s + (Number(p.slots) || 0), 0);

    const [row] = await this.db.query(
      `INSERT INTO parkings (owner_id, name, address, lat, lng, total_capacity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.ownerId ?? null, data.name, data.address, data.lat ?? null, data.lng ?? null, totalCapacity],
    );

    await this.upsertPricing(row.id, data.pricing ?? []);
    return row;
  }

  async updateParking(id: string, data: Partial<{
    name: string; address: string; isActive: boolean; ownerId: string; lat: number; lng: number;
    pricing: Array<{ vehicleType: string; slots: number; price: number }>;
  }>) {
    let totalCapacity: number | null = null;
    if (data.pricing) {
      totalCapacity = data.pricing.reduce((s, p) => s + (Number(p.slots) || 0), 0);
      await this.upsertPricing(id, data.pricing);
    }

    await this.db.query(
      `UPDATE parkings
       SET name           = COALESCE($1, name),
           address        = COALESCE($2, address),
           total_capacity = COALESCE($3, total_capacity),
           is_active      = COALESCE($4, is_active),
           owner_id       = COALESCE($5, owner_id),
           lat            = COALESCE($7, lat),
           lng            = COALESCE($8, lng)
       WHERE id = $6`,
      [data.name, data.address, totalCapacity, data.isActive, data.ownerId ?? null, id, data.lat ?? null, data.lng ?? null],
    );
    const rows = await this.db.query(`SELECT * FROM parkings WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Estacionamiento no encontrado');
    return rows[0];
  }

  private async upsertPricing(
    parkingId: string,
    pricing: Array<{ vehicleType: string; slots: number; price: number }>,
  ) {
    for (const p of pricing) {
      await this.db.query(
        `INSERT INTO parking_slots_pricing (parking_id, vehicle_type, price, slots)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (parking_id, vehicle_type)
         DO UPDATE SET price = EXCLUDED.price, slots = EXCLUDED.slots`,
        [parkingId, p.vehicleType, Number(p.price) || 0, Number(p.slots) || 0],
      );
    }
  }

  async deleteParking(id: string) {
    await this.db.query(`DELETE FROM parkings WHERE id = $1`, [id]);
    return { message: 'Estacionamiento eliminado' };
  }

  // ─── Venue-Parking associations ───────────────────────────────────────────

  listParkingVenues(parkingId: string) {
    return this.db.query(
      `SELECT v.id, v.name, v.city, v.address,
              vp.distance_meters AS "distanceMeters",
              vp.walk_minutes    AS "walkMinutes"
       FROM venue_parkings vp
       JOIN venues v ON v.id = vp.venue_id
       WHERE vp.parking_id = $1
       ORDER BY v.name`,
      [parkingId],
    );
  }

  async setParkingVenues(
    parkingId: string,
    venues: Array<{ venueId: string; distanceMeters?: number; walkMinutes?: number }>,
  ) {
    await this.db.query(`DELETE FROM venue_parkings WHERE parking_id = $1`, [parkingId]);
    for (const v of venues) {
      const walkMins = v.walkMinutes ?? Math.round((v.distanceMeters ?? 0) / 80);
      await this.db.query(
        `INSERT INTO venue_parkings (venue_id, parking_id, distance_meters, walk_minutes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (venue_id, parking_id) DO UPDATE
           SET distance_meters = EXCLUDED.distance_meters,
               walk_minutes    = EXCLUDED.walk_minutes`,
        [v.venueId, parkingId, v.distanceMeters ?? 0, walkMins],
      );
    }
    return this.listParkingVenues(parkingId);
  }

  // ─── Events (admin CRUD) ──────────────────────────────────────────────────

  listEvents(status?: string) {
    const params: any[] = [];
    let where = '';
    if (status) { params.push(status); where = `WHERE e.status = $1`; }
    return this.db.query(
      `SELECT e.*, p.name AS "parkingName", p.address AS "parkingAddress"
       FROM events e
       LEFT JOIN parkings p ON p.id = e.parking_id
       ${where}
       ORDER BY e.starts_at DESC`,
      params,
    );
  }

  async createEvent(data: {
    parkingId?: string; venueId?: string; name: string; venueName: string;
    startsAt: string; endsAt: string; price: number; status?: string;
    priceAuto?: number; priceSub?: number; pricePickup?: number; priceMoto?: number;
  }) {
    const [row] = await this.db.query(
      `INSERT INTO events (parking_id, venue_id, name, venue_name, starts_at, ends_at, price, total_slots, status,
                           category, price_auto, price_sub, price_pickup, price_moto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [data.parkingId ?? null, data.venueId ?? null, data.name, data.venueName, data.startsAt, data.endsAt,
       data.price, 0, data.status ?? 'draft',
       (data as any).category ?? null,
       data.priceAuto ?? null, data.priceSub ?? null, data.pricePickup ?? null, data.priceMoto ?? null],
    );
    return row;
  }

  async updateEvent(id: string, data: Partial<{
    name: string; venueId: string; venueName: string; startsAt: string; endsAt: string;
    price: number; status: string; category: string;
    priceAuto: number; priceSub: number; pricePickup: number; priceMoto: number;
  }>) {
    await this.db.query(
      `UPDATE events
       SET name         = COALESCE($1, name),
           venue_id     = COALESCE($2, venue_id),
           venue_name   = COALESCE($3, venue_name),
           starts_at    = COALESCE($4::timestamptz, starts_at),
           ends_at      = COALESCE($5::timestamptz, ends_at),
           price        = COALESCE($6, price),
           status       = COALESCE($7, status),
           category     = COALESCE($8, category),
           price_auto   = COALESCE($9,  price_auto),
           price_sub    = COALESCE($10, price_sub),
           price_pickup = COALESCE($11, price_pickup),
           price_moto   = COALESCE($12, price_moto)
       WHERE id = $13`,
      [data.name, data.venueId ?? null, data.venueName, data.startsAt ?? null, data.endsAt ?? null,
       data.price, data.status, data.category ?? null,
       data.priceAuto ?? null, data.priceSub ?? null, data.pricePickup ?? null, data.priceMoto ?? null, id],
    );
    const rows = await this.db.query(`SELECT * FROM events WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Evento no encontrado');
    return rows[0];
  }

  async listOperatorEvents(operatorId: string, status?: string) {
    return this.db.query(
      `SELECT e.*, p.name AS "parkingName", p.address AS "parkingAddress"
       FROM events e
       JOIN parkings p ON p.id = e.parking_id
       WHERE (
         p.owner_id = $1
         OR p.owner_id = (
           SELECT parent_operator_id FROM users
           WHERE id = $1 AND role IN ('sub_operator', 'sub_admin')
         )
       )
       ${status ? 'AND e.status = $2' : ''}
       ORDER BY e.starts_at DESC`,
      status ? [operatorId, status] : [operatorId],
    );
  }

  async updateEventPrices(eventId: string, operatorId: string, prices: {
    priceAuto?: number; priceSub?: number; pricePickup?: number; priceMoto?: number;
  }) {
    const rows = await this.db.query(
      `UPDATE events e
       SET price_auto   = COALESCE($1, e.price_auto),
           price_sub    = COALESCE($2, e.price_sub),
           price_pickup = COALESCE($3, e.price_pickup),
           price_moto   = COALESCE($4, e.price_moto)
       FROM parkings p
       WHERE e.id = $5 AND e.parking_id = p.id AND p.owner_id = $6
       RETURNING e.*`,
      [prices.priceAuto ?? null, prices.priceSub ?? null,
       prices.pricePickup ?? null, prices.priceMoto ?? null,
       eventId, operatorId],
    );
    if (!rows.length) throw new NotFoundException('Evento no encontrado o sin permiso');
    return rows[0];
  }

  async deleteEvent(id: string) {
    await this.db.query(`DELETE FROM events WHERE id = $1`, [id]);
    return { message: 'Evento eliminado' };
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async createUser(data: { phone: string; name: string; role: string }) {
    const clean = normalizePhone(data.phone);
    try {
      const rows = await this.db.query(
        `INSERT INTO users (phone, name, role, channel)
         VALUES ($1, $2, $3, 'web') RETURNING *`,
        [clean, data.name, data.role],
      );
      return rows[0];
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('Ya existe un usuario con ese teléfono');
      throw e;
    }
  }

  async updateUserRole(id: string, role: string) {
    await this.db.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);
    const rows = await this.db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Usuario no encontrado');
    return rows[0];
  }

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

  async approveRefund(claimId: string) {
    const [claim] = await this.db.query(
      `SELECT id, type, status, reservation_id, description FROM claims WHERE id = $1`,
      [claimId],
    );
    if (!claim) throw new NotFoundException('Reclamo no encontrado');
    if (claim.type !== 'refund_request') throw new BadRequestException('Este reclamo no es una solicitud de reembolso');
    if (claim.status === 'resolved') throw new BadRequestException('Este reclamo ya fue resuelto');

    const [payment] = await this.db.query(
      `SELECT id, provider_payment_id, amount FROM payments WHERE reservation_id = $1 AND status = 'completed'`,
      [claim.reservation_id],
    );
    if (!payment) throw new BadRequestException('No se encontró un pago completado para esta reserva');

    const refund = await this.stripe.refunds.create({ payment_intent: payment.provider_payment_id });

    await this.db.query(
      `UPDATE payments SET status='refunded', refund_id=$1, refunded_at=NOW(), refund_reason=$2 WHERE id=$3`,
      [refund.id, claim.description, payment.id],
    );
    await this.db.query(
      `UPDATE reservations SET status='cancelled' WHERE id=$1`,
      [claim.reservation_id],
    );
    await this.db.query(
      `UPDATE claims SET status='resolved', admin_notes='Reembolso aprobado y procesado.', resolved_at=NOW(), updated_at=NOW() WHERE id=$1`,
      [claimId],
    );
    return { refundId: refund.id };
  }
}
