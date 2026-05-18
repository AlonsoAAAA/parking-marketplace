import { useState, useEffect } from 'react';
import { Event } from '../../types';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export default function OperatorDashboard({ token }: Props) {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    api.events.list({ status: 'active' })
      .then(d => setEvents((d as any).data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [token]);

  const totalReserved = events.reduce((s, e) => s + (Number(e.slotsReserved || e.slots_reserved) || 0), 0);
  const totalSlots    = events.reduce((s, e) => s + (Number(e.totalSlots    || e.total_slots)    || 0), 0);
  const occupancyPct  = totalSlots > 0 ? Math.round((totalReserved / totalSlots) * 100) : 0;

  const CARDS = [
    { label: 'Reservas activas', value: totalReserved || '—', accent: '#D1FAE5' },
    { label: 'Ocupación global',  value: totalSlots > 0 ? `${occupancyPct}%` : '—', accent: '#DBEAFE' },
    { label: 'Eventos activos',  value: events.length || '—', accent: '#FEF3C7' },
    { label: 'Slots disponibles', value: totalSlots > 0 ? totalSlots - totalReserved : '—', accent: '#E2D6E8' },
  ];

  return (
    <>
      <style>{ADMIN_CSS + `
        .occ-bar { height: 4px; background: #EDEDED; border-radius: 4px; overflow: hidden; margin-top: 8px; }
        .occ-fill { height: 100%; border-radius: 4px; }
      `}</style>
      <div className="adm-page" style={{ maxWidth: 840 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>{today}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>{loading ? 'Cargando...' : 'Mi Dashboard'}</h1>
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

        <p className="adm-section-lbl" style={{ marginTop: 8 }}>Eventos activos — ocupación</p>
        {events.length === 0 && !loading ? (
          <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon">📅</div><div className="adm-empty-text">Sin eventos activos</div></div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(e => {
              const total    = Number(e.totalSlots    || e.total_slots)    || 1;
              const reserved = Number(e.slotsReserved || e.slots_reserved) || 0;
              const pct      = Math.round((reserved / total) * 100);
              const color    = pct >= 90 ? '#991B1B' : pct >= 70 ? '#92400E' : '#065F46';
              return (
                <div key={e.id} className="adm-tw" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{e.venueName || e.venue_name} · {fmtDate(e.startsAt || e.starts_at || '')}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: '#bbb' }}>{reserved}/{total}</div>
                    </div>
                  </div>
                  <div className="occ-bar">
                    <div className="occ-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <span style={{ fontSize: 11, color: '#999' }}>Precio: <strong style={{ color: '#1a1a1a' }}>${Number(e.price).toLocaleString('es-MX')}</strong></span>
                    <span style={{ fontSize: 11, color: '#999' }}>{total - reserved} lugares libres</span>
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
