import { useState, useEffect } from 'react';
import { Event } from '../../types';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props {
  token: string;
  onNavigateToReservations: (eventId: string) => void;
}

interface EventStats {
  revenue: number;
  paidCount: number;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

const fmtMXN = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function OperatorDashboard({ token, onNavigateToReservations }: Props) {
  const [events, setEvents]           = useState<Event[]>([]);
  const [loading, setLoading]         = useState(true);
  const [dailyRevenue, setDailyRevenue] = useState<number | null>(null);
  const [eventStats, setEventStats]   = useState<Record<string, EventStats>>({});

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    api.operator.events(token, 'active')
      .then(async d => {
        const evList: Event[] = (d as any).data || [];
        setEvents(evList);

        if (evList.length === 0) { setDailyRevenue(0); return; }

        // Fetch reservations for all events in parallel
        const todayStr = new Date().toISOString().slice(0, 10);
        const allPages = await Promise.all(
          evList.map(ev =>
            api.reservations.byEvent(token, ev.id).catch(() => [] as any[]),
          ),
        );

        let totalRevToday = 0;
        const stats: Record<string, EventStats> = {};

        evList.forEach((ev, i) => {
          let revenue = 0, paidCount = 0;
          (allPages[i] as any[]).forEach((r: any) => {
            if (r.status === 'paid' || r.status === 'used') {
              revenue   += Number(r.amount) || 0;
              paidCount += 1;
              if ((r.created_at || '').startsWith(todayStr)) {
                totalRevToday += Number(r.amount) || 0;
              }
            }
          });
          stats[ev.id] = { revenue, paidCount };
        });

        setEventStats(stats);
        setDailyRevenue(totalRevToday);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [token]);

  const totalReserved = events.reduce((s, e) => s + (Number(e.slotsReserved || e.slots_reserved) || 0), 0);
  const totalSlots    = events.reduce((s, e) => s + (Number(e.totalSlots    || e.total_slots)    || 0), 0);
  const occupancyPct  = totalSlots > 0 ? Math.round((totalReserved / totalSlots) * 100) : 0;

  const CARDS = [
    { label: 'Ventas hoy',       value: dailyRevenue === null ? '…' : `$${fmtMXN(dailyRevenue)}`, sub: 'MXN',               accent: '#D1FAE5' },
    { label: 'Reservas activas', value: loading ? '—' : totalReserved,                            sub: 'status: pagado',     accent: '#DBEAFE' },
    { label: 'Ocupación global', value: loading || totalSlots === 0 ? '—' : `${occupancyPct}%`,   sub: `${totalReserved}/${totalSlots} lugares`, accent: '#FEF3C7' },
  ];

  return (
    <>
      <style>{ADMIN_CSS + `
        .occ-bar  { height: 5px; background: #EDEDED; border-radius: 4px; overflow: hidden; margin-top: 8px; }
        .occ-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
        .dash-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        @media(min-width:640px) { .dash-metrics { grid-template-columns: repeat(3, 1fr); } }
        .dash-metrics .dash-m:first-child { grid-column: 1 / -1; }
        @media(min-width:640px) { .dash-metrics .dash-m:first-child { grid-column: auto; } }
        .dash-m { background: #fff; border-radius: 16px; padding: 18px 20px; position: relative; overflow: hidden; }
        .dash-m-dot { position: absolute; top: -16px; right: -16px; width: 80px; height: 80px; border-radius: 50%; opacity: 0.18; }
        .dash-m-lbl { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
        .dash-m-val { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #1a1a1a; line-height: 1; }
        .dash-m-sub { font-size: 11px; color: #bbb; margin-top: 5px; }
        .ev-card { background: #fff; border-radius: 16px; padding: 18px; cursor: pointer; transition: box-shadow 0.15s, transform 0.1s; border: 1.5px solid transparent; }
        .ev-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-color: rgba(0,0,0,0.08); }
        .ev-card:active { transform: scale(0.98); }
        .ev-rev-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 6px; }
        .ev-rev-chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
      `}</style>

      <div className="adm-page" style={{ maxWidth: 840 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>{today}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>{loading ? 'Cargando…' : 'Mi Dashboard'}</h1>
        </div>

        {/* Metric cards */}
        <div className="dash-metrics">
          {CARDS.map(c => (
            <div key={c.label} className="dash-m">
              <div className="dash-m-dot" style={{ background: c.accent }} />
              <div className="dash-m-lbl">{c.label}</div>
              <div className="dash-m-val">{c.value}</div>
              <div className="dash-m-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Events list */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="adm-section-lbl" style={{ margin: 0 }}>Eventos activos</p>
          <span style={{ fontSize: 11, color: '#bbb' }}>Tap para ver reservas →</span>
        </div>

        {events.length === 0 && !loading ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">📅</div>
              <div className="adm-empty-text">Sin eventos activos</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map(e => {
              const total    = Number(e.totalSlots    || e.total_slots)    || 1;
              const reserved = Number(e.slotsReserved || e.slots_reserved) || 0;
              const pct      = Math.round((reserved / total) * 100);
              const barColor = pct >= 90 ? '#991B1B' : pct >= 70 ? '#D97706' : '#059669';
              const st       = eventStats[e.id];
              const paidCount = st?.paidCount ?? reserved;
              const revenue   = st?.revenue   ?? 0;

              return (
                <div
                  key={e.id}
                  className="ev-card"
                  onClick={() => onNavigateToReservations(e.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={k => k.key === 'Enter' && onNavigateToReservations(e.id)}
                >
                  {/* Event name + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                        {e.venueName || e.venue_name} · {fmtDate(e.startsAt || e.starts_at || '')}
                      </div>
                    </div>
                    {/* Occupancy % badge */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: barColor, lineHeight: 1 }}>
                        {pct}%
                      </div>
                      <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>ocupación</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="occ-bar">
                    <div className="occ-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>

                  {/* Stats row */}
                  <div className="ev-rev-row">
                    {/* Paid reservations */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ev-rev-chip" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                        {paidCount} / {total} pagadas
                      </span>
                      <span style={{ fontSize: 11, color: '#bbb' }}>{total - reserved} libres</span>
                    </div>

                    {/* Revenue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {st ? (
                        <span className="ev-rev-chip" style={{ background: '#D1FAE5', color: '#065F46' }}>
                          ${fmtMXN(revenue)} MXN
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#bbb' }}>calculando…</span>
                      )}
                    </div>
                  </div>

                  {/* "Ver reservas" hint */}
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#bbb' }}>Ver reservas</span>
                    <span style={{ fontSize: 13, color: '#bbb' }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
