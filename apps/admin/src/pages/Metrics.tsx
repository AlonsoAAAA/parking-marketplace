import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, CartesianGrid, XAxis } from 'recharts';
import { api } from '../lib/api';

interface Props { token: string; scope: 'admin' | 'operator'; }

type Period = 'diario' | 'semanal' | 'mensual';
type MetricKey = 'ventas' | 'reservas' | 'ocupacion' | 'reclamos';

const PERIOD_DAYS: Record<Period, number> = { diario: 14, semanal: 12 * 7, mensual: 6 * 30 };
const BUCKET: Record<Period, 'day' | 'week' | 'month'> = { diario: 'day', semanal: 'week', mensual: 'month' };

function bucketKey(date: Date, unit: 'day' | 'week' | 'month') {
  if (unit === 'day') return date.toISOString().slice(0, 10);
  if (unit === 'month') return date.toISOString().slice(0, 7);
  const d = new Date(date);
  const day = (d.getUTCDay() + 6) % 7; // Monday-start ISO week
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

const fmtMoney = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const TOOLTIP_STYLE = { background: '#04210f', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 };

export default function Metrics({ token, scope }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('diario');
  const [metric, setMetric] = useState<MetricKey>('ventas');
  const [view, setView] = useState<'resumen' | 'detalle'>('resumen');

  useEffect(() => {
    setLoading(true);
    const load = scope === 'admin'
      ? Promise.all([
          api.admin.payments(token).catch(() => []),
          api.admin.events(token).catch(() => ({ data: [] })),
          api.admin.claims(token).catch(() => ({ data: [] })),
        ])
      : Promise.all([
          Promise.resolve([]),
          api.operator.events(token).catch(() => ({ data: [] })),
          Promise.resolve({ data: [] }),
        ]);

    load.then(([pay, ev, cl]) => {
      setPayments(Array.isArray(pay) ? pay : (pay?.data ?? []));
      setEvents(Array.isArray(ev) ? ev : (ev?.data ?? []));
      setClaims(Array.isArray(cl) ? cl : (cl?.data ?? []));
      setLoading(false);
    }).catch(e => { setError(e.message || 'Error al cargar métricas'); setLoading(false); });
  }, [token, scope]);

  // ── Series por periodo, agregadas de datos reales ────────────────────────
  const series = useMemo(() => {
    const unit = BUCKET[period];
    const days = PERIOD_DAYS[period];
    const since = new Date();
    since.setDate(since.getDate() - days);

    const buckets = new Map<string, { ventas: number; reservas: number; reclamos: number }>();
    const pushBucket = (key: string) => {
      if (!buckets.has(key)) buckets.set(key, { ventas: 0, reservas: 0, reclamos: 0 });
      return buckets.get(key)!;
    };

    for (const p of payments) {
      if (p.status !== 'completed') continue;
      const dateStr = p.paid_at || p.created_at;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (d < since) continue;
      const b = pushBucket(bucketKey(d, unit));
      b.ventas += Number(p.amount) || 0;
      b.reservas += 1;
    }
    for (const c of claims) {
      const d = new Date(c.created_at);
      if (d < since) continue;
      pushBucket(bucketKey(d, unit)).reclamos += 1;
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ label: key, ...v }));
  }, [payments, claims, period]);

  // ── KPIs resumen ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const completed = payments.filter(p => p.status === 'completed');
    const totalVentas = completed.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalReservas = completed.length;
    const totalSlots = events.reduce((s, e) => s + (Number(e.totalSlots ?? e.total_slots) || 0), 0);
    const reservedSlots = events.reduce((s, e) => s + (Number(e.slotsReserved ?? e.slots_reserved) || 0), 0);
    const ocupacion = totalSlots > 0 ? Math.round((reservedSlots / totalSlots) * 100) : 0;
    const reclamosAbiertos = claims.filter(c => c.status !== 'resolved').length;
    return { totalVentas, totalReservas, ocupacion, reclamosAbiertos };
  }, [payments, events, claims]);

  const CARDS: Array<{ key: MetricKey; label: string; value: string; color: string }> = [
    { key: 'ventas',    label: 'Ganancias / Ventas',      value: fmtMoney(kpis.totalVentas), color: '#DFF085' },
    { key: 'reservas',  label: 'Reservas de Cajones',     value: String(kpis.totalReservas), color: '#c3c0ff' },
    { key: 'ocupacion', label: '% Ocupación',             value: `${kpis.ocupacion}%`,       color: '#86B49F' },
    { key: 'reclamos',  label: 'Reportes y Reclamos',     value: String(kpis.reclamosAbiertos), color: '#72B8BC' },
  ];

  if (loading) return (
    <div className="flex h-72 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-indigo" />
    </div>
  );

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brand-green-dark">Métricas</h2>
          <p className="text-sm text-slate-500">Desempeño real basado en pagos y reservas.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
          {(['diario', 'semanal', 'mensual'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1.5 capitalize transition-colors ${period === p ? 'bg-brand-green-dark text-white' : 'text-slate-500 hover:text-brand-green-dark'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CARDS.map(c => (
          <button
            key={c.key}
            onClick={() => { setMetric(c.key); setView('detalle'); }}
            className={`rounded-2xl border p-4 text-left shadow-sm transition-all ${metric === c.key && view === 'detalle' ? 'border-brand-indigo ring-2 ring-brand-indigo/30' : 'border-slate-100 hover:border-slate-200'} bg-white`}
          >
            <div className="mb-2 h-1.5 w-8 rounded-full" style={{ background: c.color }} />
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</div>
            <div className="mt-1 text-xl font-black text-brand-green-dark">{c.value}</div>
          </button>
        ))}
      </div>

      {view === 'resumen' ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="ventas" stroke="#383497" fill="#c3c0ff" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-green-dark">{CARDS.find(c => c.key === metric)?.label}</h3>
            <button onClick={() => setView('resumen')} className="text-xs font-semibold text-brand-indigo hover:underline">← Volver al resumen</button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {metric === 'ventas' ? (
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtMoney(v)} />
                <Area type="monotone" dataKey="ventas" stroke="#383497" fill="#c3c0ff" fillOpacity={0.5} />
              </AreaChart>
            ) : metric === 'ocupacion' ? (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="reservas" stroke="#86B49F" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey={metric === 'reclamos' ? 'reclamos' : 'reservas'} fill="#72B8BC" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {scope === 'admin' && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-brand-green-dark px-5 py-3 text-[11px] font-mono uppercase tracking-wider text-brand-lime">
            Desglose por evento
          </div>
          <div className="divide-y divide-slate-100">
            {events.slice(0, 10).map((e: any) => {
              const total = Number(e.totalSlots ?? e.total_slots) || 0;
              const used = Number(e.slotsReserved ?? e.slots_reserved) || 0;
              const pct = total > 0 ? Math.round((used / total) * 100) : 0;
              return (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-brand-green-dark">{e.name}</div>
                    <div className="text-xs text-slate-400">{e.venueName ?? e.venue_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-brand-indigo">{pct}%</div>
                    <div className="text-xs text-slate-400">{used}/{total} lugares</div>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && <div className="px-5 py-6 text-center text-sm text-slate-400">Sin eventos registrados.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
