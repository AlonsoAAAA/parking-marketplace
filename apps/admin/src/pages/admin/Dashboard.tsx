import { useState, useEffect } from 'react';
import { Event } from '../../types';
import { ADMIN_CSS, STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; onNavigate: (page: string) => void; }

const fmtMoney = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

const SHORTCUTS = [
  { id: 'venues',     label: 'Venues',            icon: '🏟️' },
  { id: 'events',     label: 'Eventos',            icon: '📅' },
  { id: 'parkings',   label: 'Estacionamientos',   icon: '🅿️' },
  { id: 'customers',  label: 'Clientes',           icon: '👥' },
  { id: 'claims',     label: 'Reclamos',           icon: '⚠️' },
  { id: 'payments',   label: 'Pagos',              icon: '💳' },
];

export default function AdminDashboard({ token, onNavigate }: Props) {
  const [events, setEvents]     = useState<Event[]>([]);
  const [metrics, setMetrics]   = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    Promise.allSettled([
      api.admin.metrics(token),
      api.events.list({ status: 'active' }),
      api.admin.payments(token),
    ]).then(([m, e, p]) => {
      if (m.status === 'fulfilled') setMetrics((m.value as any)?.data);
      if (e.status === 'fulfilled') setEvents((e.value as any)?.data || []);
      if (p.status === 'fulfilled') setPayments(((p.value as any)?.data || []).slice(0, 6));
    }).finally(() => setLoading(false));
  }, [token]);

  const totalReserved = events.reduce((s, e) => s + (Number(e.slotsReserved) || 0), 0);
  const activeCount   = events.length;

  const CARDS = [
    { label: 'Reservas hoy',     value: metrics?.reservationsToday ?? '—', accent: '#D1FAE5' },
    { label: 'Ingresos hoy',     value: metrics?.revenueToday != null ? `$${fmtMoney(metrics.revenueToday)}` : '—', accent: '#DBEAFE' },
    { label: 'Eventos activos',  value: activeCount || '—', accent: '#FEF3C7' },
    { label: 'Slots reservados', value: totalReserved || '—', accent: '#E2D6E8' },
  ];

  return (
    <>
      <style>{ADMIN_CSS + `
        .occ-bar { height: 4px; background: #EDEDED; border-radius: 4px; overflow: hidden; margin-top: 8px; }
        .occ-fill { height: 100%; border-radius: 4px; background: #1a1a1a; }
        .shortcuts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        @media(max-width:480px){ .shortcuts { grid-template-columns: repeat(2, 1fr); } }
        .sc-btn { background: #fff; border-radius: 12px; padding: 16px; border: none; cursor: pointer; font-family: 'Inter', sans-serif; text-align: left; transition: opacity 0.15s; }
        .sc-btn:hover { opacity: 0.8; }
        .sc-icon { font-size: 24px; margin-bottom: 8px; }
        .sc-label { font-size: 12px; font-weight: 600; color: #1a1a1a; }
      `}</style>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>{today}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>{loading ? 'Cargando...' : 'Panel Admin'}</h1>
        </div>

        <div className="adm-metrics">
          {CARDS.map(c => (
            <div key={c.label} className="adm-metric">
              <div className="adm-metric-dot" style={{ background: c.accent }} />
              <div className="adm-metric-lbl">{c.label}</div>
              <div className="adm-metric-val">{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Active events */}
          <div>
            <p className="adm-section-lbl">Eventos activos — ocupación</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.length === 0 && !loading && (
                <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon">📅</div><div className="adm-empty-text">Sin eventos activos</div></div></div>
              )}
              {events.map(e => {
                const total    = Number(e.totalSlots    || e.total_slots)    || 1;
                const reserved = Number(e.slotsReserved || e.slots_reserved) || 0;
                const pct      = Math.round((reserved / total) * 100);
                return (
                  <div key={e.id} className="adm-tw" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</span>
                      <span style={{ fontSize: 11, color: '#bbb' }}>{e.venueName || e.venue_name} · {fmtDate(e.startsAt || e.starts_at || '')}</span>
                    </div>
                    <div className="occ-bar">
                      <div className="occ-fill" style={{ width: `${pct}%`, background: pct >= 90 ? '#991B1B' : '#1a1a1a' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#bbb' }}>
                      <span>{reserved}/{total} lugares</span>
                      <span style={{ fontWeight: 700, color: pct >= 90 ? '#991B1B' : '#1a1a1a' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent payments */}
          <div>
            <p className="adm-section-lbl">Pagos recientes</p>
            <div className="adm-tw">
              {payments.length === 0 ? (
                <div className="adm-empty"><div className="adm-empty-icon">💳</div><div className="adm-empty-text">Sin pagos</div><div className="adm-empty-sub">Disponible cuando el endpoint /admin/payments esté activo</div></div>
              ) : payments.map((p: any, i: number) => {
                const s = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.userName}</div>
                      <div style={{ fontSize: 11, color: '#bbb' }}>{p.eventName}</div>
                    </div>
                    <span className="adm-pill" style={s}>{STATUS_LABELS[p.status]}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>${Number(p.amount).toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="adm-section-lbl">Acceso rápido</p>
        <div className="shortcuts">
          {SHORTCUTS.map(s => (
            <button key={s.id} className="sc-btn" onClick={() => onNavigate(s.id)}>
              <div className="sc-icon">{s.icon}</div>
              <div className="sc-label">{s.label}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
