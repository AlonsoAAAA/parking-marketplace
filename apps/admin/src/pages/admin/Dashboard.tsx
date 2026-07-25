import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Percent, AlertCircle, MapPin, ParkingCircle, Users, CreditCard, CalendarDays } from 'lucide-react';
import { Event } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; onNavigate: (page: string) => void; }

const fmtMoney = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

const SHORTCUTS = [
  { id: 'venues',     label: 'Venues',            icon: MapPin },
  { id: 'events',     label: 'Eventos',            icon: CalendarDays },
  { id: 'parkings',   label: 'Estacionamientos',   icon: ParkingCircle },
  { id: 'customers',  label: 'Clientes',           icon: Users },
  { id: 'claims',     label: 'Reclamos',           icon: AlertCircle },
  { id: 'payments',   label: 'Pagos',              icon: CreditCard },
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

  const totalReserved = events.reduce((s, e) => s + (Number(e.slotsReserved ?? e.slots_reserved) || 0), 0);
  const totalSlots     = events.reduce((s, e) => s + (Number(e.totalSlots ?? e.total_slots) || 0), 0);
  const occupancyPct   = totalSlots > 0 ? Math.round((totalReserved / totalSlots) * 100) : 0;
  const openClaims     = metrics?.openClaims ?? 0;

  const CARDS = [
    { label: 'Reservas de hoy',    value: metrics?.reservationsToday ?? '—', icon: Calendar,    color: 'text-brand-indigo',  bg: 'bg-brand-indigo/10' },
    { label: 'Ingresos del día',   value: metrics?.revenueToday != null ? `$${fmtMoney(metrics.revenueToday)}` : '—', icon: DollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Ocupación total',    value: `${occupancyPct}%`, icon: Percent,     color: 'text-[#72B8BC]',     bg: 'bg-[#72B8BC]/10' },
    { label: 'Reclamos abiertos',  value: openClaims, icon: AlertCircle, color: openClaims > 0 ? 'text-red-600' : 'text-slate-500', bg: openClaims > 0 ? 'bg-red-50' : 'bg-slate-100' },
  ];

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>{today}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>{loading ? 'Cargando...' : 'Panel Admin'}</h1>
        </div>

        <p className="adm-section-lbl">Métricas de operación del día</p>
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CARDS.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex flex-col justify-between rounded-[14px] border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold uppercase leading-tight tracking-tight text-slate-500">{c.label}</span>
                  <div className={`rounded-lg p-2 ${c.bg}`}>
                    <Icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                </div>
                <span className="mt-4 block text-2xl font-extrabold text-slate-900">{c.value}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Active events */}
          <div>
            <p className="adm-section-lbl">Eventos activos — ocupación</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.length === 0 && !loading && (
                <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon"><CalendarDays /></div><div className="adm-empty-text">Sin eventos activos</div></div></div>
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
                <div className="adm-empty"><div className="adm-empty-icon"><CreditCard /></div><div className="adm-empty-text">Sin pagos</div><div className="adm-empty-sub">Disponible cuando el endpoint /admin/payments esté activo</div></div>
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
          {SHORTCUTS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} className="sc-btn" onClick={() => onNavigate(s.id)}>
                <div className="sc-icon"><Icon /></div>
                <div className="sc-label">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
