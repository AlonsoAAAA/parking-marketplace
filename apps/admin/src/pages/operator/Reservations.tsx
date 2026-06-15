import { useState, useEffect, useMemo } from 'react';
import { Event, Reservation } from '../../types';
import { ADMIN_CSS, STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; initialEventId?: string; }

const STATUS_TABS = ['all', 'paid', 'pending', 'used', 'cancelled', 'expired'];

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

// ── Ticket modal ────────────────────────────────────────────────────────────────
function TicketModal({ r, events, onClose }: { r: Reservation; events: Event[]; onClose: () => void }) {
  const ev = events.find(e => e.id === r.event_id);
  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.expired;

  const rows: [string, string][] = [
    ['Nombre',    r.user_name || '—'],
    ['Teléfono',  r.phone     || '—'],
    ['Evento',    r.event_name || ev?.name || '—'],
    ['Venue',     ev?.venueName || ev?.venue_name || '—'],
    ['Fecha',     ev ? fmtDate(ev.startsAt || ev.starts_at || '') : '—'],
    ['Estacionamiento', ev?.parkingName || '—'],
    ['Dirección', ev?.parkingAddress || '—'],
    ['Lugar asignado', r.assigned_spot || '—'],
    ['Placas',    r.plates        || '—'],
    ['Tipo de auto',  r.vehicle_type  || '—'],
    ['Modelo',    r.vehicle_model || '—'],
    ['Monto pagado', r.amount != null ? `$${Number(r.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : '—'],
    ['Creado',    fmtDT(r.created_at)],
    r.scanned_at ? ['Escaneado', fmtDT(r.scanned_at)] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', paddingBottom: 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 4 }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px 12px' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Boleto</h2>
            <p style={{ fontSize: 11, color: '#bbb', fontFamily: 'monospace', marginTop: 3 }}>
              TKT-{r.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="adm-pill" style={sc}>{STATUS_LABELS[r.status]}</span>
            <button
              onClick={onClose}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >×</button>
          </div>
        </div>

        {/* Rows */}
        <div style={{ margin: '0 16px', background: '#f9f9f9', borderRadius: 14, overflow: 'hidden' }}>
          {rows.map(([label, value], i) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '11px 16px', borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
            >
              <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0, paddingTop: 1 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: value === '—' ? '#ccc' : '#1a1a1a', textAlign: 'right', wordBreak: 'break-all', fontFamily: label === 'Placas' ? 'monospace' : 'inherit', letterSpacing: label === 'Placas' ? 2 : 0 }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function OperatorReservations({ token, initialEventId }: Props) {
  const [events, setEvents]               = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(initialEventId ?? '');
  const [reservations, setReservations]   = useState<Reservation[]>([]);
  const [loading, setLoading]             = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [status, setStatus]               = useState('all');
  const [search, setSearch]               = useState('');
  const [selected, setSelected]           = useState<Reservation | null>(null);

  useEffect(() => {
    api.operator.events(token)
      .then(d => {
        const list = (d as any).data || [];
        setEvents(list);
        // Only auto-select first event if no initialEventId was provided
        if (!initialEventId && list.length > 0) setSelectedEvent(list[0].id);
        // If initialEventId was provided but doesn't exist in list, fall back to first
        if (initialEventId && list.length > 0 && !list.find((e: any) => e.id === initialEventId)) {
          setSelectedEvent(list[0].id);
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedEvent) return;
    setLoading(true);
    api.reservations.byEvent(token, selectedEvent)
      .then(d => setReservations(Array.isArray(d) ? d : []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [selectedEvent, token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reservations.filter(r => {
      const matchSt = status === 'all' || r.status === status;
      const matchQ  = !q
        || (r.user_name || '').toLowerCase().includes(q)
        || r.phone.includes(q)
        || (r.plates || '').toLowerCase().includes(q);
      return matchSt && matchQ;
    });
  }, [reservations, status, search]);

  return (
    <>
      <style>{ADMIN_CSS + `
        .show-dt { display: none; }
        @media(min-width:640px){ .show-dt { display: block; } .hide-dt { display: none; } }
        .res-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; cursor: pointer; transition: box-shadow 0.15s; }
        .res-card:active { box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
        .res-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
        .adm-t tbody tr { cursor: pointer; }
        .adm-t tbody tr:hover { background: #fafafa; }
      `}</style>

      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div>
            <h1 className="adm-pt">Reservaciones</h1>
            <p className="adm-ps">Lista de reservas por evento</p>
          </div>
        </div>

        {/* Event selector */}
        {!eventsLoading && (
          <div className="adm-field" style={{ maxWidth: 420, marginBottom: 16 }}>
            <label className="adm-label">Evento</label>
            <select className="adm-input" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} — {ev.venueName || ev.venue_name}</option>)}
              {events.length === 0 && <option value="">Sin eventos disponibles</option>}
            </select>
          </div>
        )}

        {/* Status tabs */}
        <div className="adm-filter-row">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`adm-filter${status === s ? ' on' : ''}`}>
              {STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.4" />
            <path d="M9 9L12 12" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono o placas..." />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 18, lineHeight: 1 }}>×</button>}
        </div>

        <p style={{ fontSize: 11, color: '#bbb', marginBottom: 12 }}>
          {loading ? 'Cargando...' : `${filtered.length} reserva${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {!loading && filtered.length === 0 && (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">📋</div>
              <div className="adm-empty-text">Sin resultados</div>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="show-dt">
              <div className="adm-tw">
                <table className="adm-t">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Teléfono</th>
                      <th>Placas</th>
                      <th>Tipo de auto</th>
                      <th>Status</th>
                      <th>Escaneado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const sc = STATUS_COLORS[r.status] || STATUS_COLORS.expired;
                      return (
                        <tr key={r.id} onClick={() => setSelected(r)}>
                          <td style={{ fontWeight: 600 }}>{r.user_name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.phone}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 }}>{r.plates || '—'}</td>
                          <td style={{ fontSize: 12, color: '#555' }}>{r.vehicle_type || '—'}</td>
                          <td><span className="adm-pill" style={sc}>{STATUS_LABELS[r.status]}</span></td>
                          <td style={{ fontSize: 11, color: '#bbb' }}>{r.scanned_at ? fmtDT(r.scanned_at) : '—'}</td>
                          <td style={{ fontSize: 11, color: '#bbb' }}>{fmtDT(r.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="hide-dt">
              {filtered.map(r => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.expired;
                return (
                  <div key={r.id} className="res-card" onClick={() => setSelected(r)}>
                    <div className="res-card-top">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name}</div>
                        <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{r.phone}</div>
                      </div>
                      <span className="adm-pill" style={sc}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {r.plates && (
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#1a1a1a', fontWeight: 700, letterSpacing: 1 }}>
                            {r.plates}
                          </span>
                        )}
                        {r.vehicle_type && (
                          <span style={{ fontSize: 11, color: '#999' }}>{r.vehicle_type}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#bbb' }}>{fmtDT(r.created_at)}</span>
                        {r.scanned_at && <span style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>✓ Esc.</span>}
                        <span style={{ fontSize: 11, color: '#bbb' }}>›</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Full-ticket modal */}
      {selected && (
        <TicketModal r={selected} events={events} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
