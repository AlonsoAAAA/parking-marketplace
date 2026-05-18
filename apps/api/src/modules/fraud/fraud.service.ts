import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class FraudService {
  constructor(@InjectDataSource() private db: DataSource) {}

  // ─── Internal helpers ────────────────────────────────────────────────────

  private async getRule(key: string) {
    const rows = await this.db.query(
      `SELECT * FROM fraud_rules WHERE rule_key = $1`,
      [key],
    );
    return rows[0] ?? null;
  }

  private async createAlert(
    userId: string | null,
    ruleKey: string,
    level: string,
    detail: Record<string, any>,
  ) {
    const ruleRows = await this.db.query(
      `SELECT id FROM fraud_rules WHERE rule_key = $1`,
      [ruleKey],
    );
    await this.db.query(
      `INSERT INTO fraud_alerts (user_id, rule_id, rule_key, level, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        ruleRows[0]?.id ?? null,
        ruleKey,
        level,
        JSON.stringify(detail),
      ],
    );
    console.log(`🚨 Fraude detectado [${level}] ${ruleKey} userId=${userId}`);
  }

  // ─── Fraud checks (called from business logic, never throws) ─────────────

  async checkRapidReservations(userId: string): Promise<void> {
    try {
      const rule = await this.getRule('rapid_reservations');
      if (!rule?.is_active) return;

      const [{ count }] = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM reservations
         WHERE user_id = $1
           AND created_at > NOW() - ($2 || ' minutes')::interval`,
        [userId, String(rule.window_minutes)],
      );
      if (count > rule.threshold) {
        await this.createAlert(userId, 'rapid_reservations', rule.level, {
          count,
          threshold: rule.threshold,
          windowMinutes: rule.window_minutes,
        });
      }
    } catch (e) {
      console.error('FraudService.checkRapidReservations error:', e);
    }
  }

  async checkFailedPayments(userId: string): Promise<void> {
    try {
      const rule = await this.getRule('failed_payments');
      if (!rule?.is_active) return;

      const [{ count }] = await this.db.query(
        `SELECT COUNT(*)::int AS count
         FROM payments p
         JOIN reservations r ON r.id = p.reservation_id
         WHERE r.user_id = $1
           AND p.status = 'failed'
           AND p.created_at > NOW() - ($2 || ' minutes')::interval`,
        [userId, String(rule.window_minutes)],
      );
      if (count > rule.threshold) {
        await this.createAlert(userId, 'failed_payments', rule.level, {
          count,
          threshold: rule.threshold,
          windowMinutes: rule.window_minutes,
        });
      }
    } catch (e) {
      console.error('FraudService.checkFailedPayments error:', e);
    }
  }

  async checkDuplicateScan(
    userId: string | null,
    reservationId: string,
    operatorId: string,
  ): Promise<void> {
    try {
      const rule = await this.getRule('duplicate_scan');
      if (!rule?.is_active) return;
      await this.createAlert(userId, 'duplicate_scan', rule.level, {
        reservationId,
        scannedBy: operatorId,
      });
    } catch (e) {
      console.error('FraudService.checkDuplicateScan error:', e);
    }
  }

  async checkRepeatCancels(userId: string, eventId: string): Promise<void> {
    try {
      const rule = await this.getRule('repeat_cancel');
      if (!rule?.is_active) return;

      const [{ count }] = await this.db.query(
        `SELECT COUNT(*)::int AS count FROM reservations
         WHERE user_id = $1 AND event_id = $2 AND status = 'cancelled'`,
        [userId, eventId],
      );
      if (count > rule.threshold) {
        await this.createAlert(userId, 'repeat_cancel', rule.level, {
          count,
          threshold: rule.threshold,
          eventId,
        });
      }
    } catch (e) {
      console.error('FraudService.checkRepeatCancels error:', e);
    }
  }

  // ─── Admin queries ────────────────────────────────────────────────────────

  async getStats() {
    const [today] = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE level = 'high'   AND created_at::date = CURRENT_DATE)::int AS "highToday",
        COUNT(*) FILTER (WHERE level = 'medium' AND created_at::date = CURRENT_DATE)::int AS "mediumToday",
        COUNT(*) FILTER (WHERE level = 'low'    AND created_at::date = CURRENT_DATE)::int AS "lowToday",
        COUNT(*) FILTER (WHERE status = 'pending')::int                                   AS "pendingTotal",
        COUNT(*)::int                                                                     AS "totalAlerts"
      FROM fraud_alerts
    `);

    const daily = await this.db.query(`
      SELECT
        created_at::date AS day,
        COUNT(*)::int    AS count,
        COUNT(*) FILTER (WHERE level = 'high')::int   AS high,
        COUNT(*) FILTER (WHERE level = 'medium')::int AS medium,
        COUNT(*) FILTER (WHERE level = 'low')::int    AS low
      FROM fraud_alerts
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `);

    return { today, daily };
  }

  async listAlerts(status?: string, level?: string) {
    const conditions: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (status && status !== 'all') {
      conditions.push(`fa.status = $${p++}`);
      params.push(status);
    }
    if (level && level !== 'all') {
      conditions.push(`fa.level = $${p++}`);
      params.push(level);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    return this.db.query(
      `SELECT fa.*,
              u.name  AS "userName",
              u.phone AS "userPhone",
              fr.name AS "ruleName"
       FROM fraud_alerts fa
       LEFT JOIN users       u  ON u.id  = fa.user_id
       LEFT JOIN fraud_rules fr ON fr.id = fa.rule_id
       ${where}
       ORDER BY fa.created_at DESC
       LIMIT 500`,
      params,
    );
  }

  async updateAlert(id: string, status: string) {
    await this.db.query(
      `UPDATE fraud_alerts SET status = $1 WHERE id = $2`,
      [status, id],
    );
    const rows = await this.db.query(
      `SELECT fa.*, u.name AS "userName", fr.name AS "ruleName"
       FROM fraud_alerts fa
       LEFT JOIN users u ON u.id = fa.user_id
       LEFT JOIN fraud_rules fr ON fr.id = fa.rule_id
       WHERE fa.id = $1`,
      [id],
    );
    return rows[0];
  }

  listRules() {
    return this.db.query(
      `SELECT * FROM fraud_rules ORDER BY level DESC, name`,
    );
  }

  async updateRule(
    id: string,
    data: { threshold?: number; windowMinutes?: number; isActive?: boolean },
  ) {
    await this.db.query(
      `UPDATE fraud_rules
       SET threshold      = COALESCE($1, threshold),
           window_minutes = COALESCE($2, window_minutes),
           is_active      = COALESCE($3, is_active),
           updated_at     = NOW()
       WHERE id = $4`,
      [data.threshold ?? null, data.windowMinutes ?? null, data.isActive ?? null, id],
    );
    const rows = await this.db.query(
      `SELECT * FROM fraud_rules WHERE id = $1`,
      [id],
    );
    return rows[0];
  }
}
