import { useState, useEffect, useMemo, useCallback } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Event, Reservation } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; initialEventId?: string; }

// Solo 4 estatus visibles para el operador: "paid" (pagada, aún sin
// escanear) se agrupa visualmente bajo "Pendiente" junto con "pending"
// (reserva sin pagar aún) — ver matchSt más abajo.
const STATUS_TABS = ['all', 'pending', 'used', 'cancelled', 'expired'];

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

// Botón de status más visible que el .adm-pill genérico — usado en las
// tarjetas de reserva para que el estatus (sobre todo "Pendiente") salte a
// la vista de inmediato en vez de un texto chico.
function StatusBadge({ status }: { status: string }) {
  const sc = STATUS_COLORS[status] || STATUS_COLORS.expired;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 14px', borderRadius: 999,
        fontSize: 12, fontWeight: 800, letterSpacing: '0.3px', textTransform: 'uppercase',
        background: sc.bg, color: sc.color,
        border: `1.5px solid ${sc.color}33`,
        boxShadow: `0 1px 3px ${sc.color}22`,
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── Ticket modal ────────────────────────────────────────────────────────────────
function TicketModal({ r, events, onClose }: { r: Reservation; events: Event[]; onClose: () => void }) {
  const ev = events.find(e => e.id === r.event_id);

  const rows: [string, string][] = [
    ['Nombre',    r.user_name || '—'],
    ['Teléfono',  r.phone     || '—'],
    ['Evento',    r.event_name || ev?.name || '—'],
    ['Venue',     ev?.venueName || ev?.venue_name || '—'],
    ['Fecha',     ev ? fmtDate(ev.startsAt || ev.starts_at || '') : '—'],
    ['Estacionamiento', r.parkingName || ev?.parkingName || '—'],
    ['Dirección', r.parkingAddress || ev?.parkingAddress || '—'],
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
            <StatusBadge status={r.status} />
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
        const list: Event[] = (d as any).data || [];
        setEvents(list);
        const firstActive = list.find(e => e.status === 'active') ?? list[0];
        // Only auto-select first event if no initialEventId was provided
        if (!initialEventId && firstActive) setSelectedEvent(firstActive.id);
        // If initialEventId was provided but doesn't exist in list, fall back to first activo
        if (initialEventId && firstActive && !list.find((e: any) => e.id === initialEventId)) {
          setSelectedEvent(firstActive.id);
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeEvents   = useMemo(() => events.filter(e => e.status === 'active'), [events]);
  const archivedEvents = useMemo(() => events.filter(e => e.status !== 'active'), [events]);

  const loadReservations = useCallback((showSpinner = true) => {
    if (!selectedEvent) return;
    if (showSpinner) setLoading(true);
    api.reservations.byEvent(token, selectedEvent)
      .then(d => setReservations(Array.isArray(d) ? d : []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [selectedEvent, token]);

  useEffect(() => {
    loadReservations(true);
  }, [selectedEvent, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Las reservas "pendientes" son las más sensibles al tiempo — un cliente
  // puede iniciar el checkout mientras el operador ya tiene la pantalla
  // abierta, y sin refrescar nunca aparecería. Se refresca en segundo plano
  // cada 20s sin mostrar el spinner de carga completo.
  useEffect(() => {
    if (!selectedEvent) return;
    const iv = setInterval(() => loadReservations(false), 20000);
    return () => clearInterval(iv);
  }, [selectedEvent, loadReservations]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reservations.filter(r => {
      const matchSt = status === 'all' || r.status === status
        || (status === 'pending' && r.status === 'paid');
      const matchQ  = !q
        || (r.user_name || '').toLowerCase().includes(q)
        || r.phone.includes(q)
        || (r.plates || '').toLowerCase().includes(q);
      return matchSt && matchQ;
    });
  }, [reservations, status, search]);

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div>
            <h1 className="adm-pt">Reservaciones</h1>
            <p className="adm-ps">Lista de reservas por evento</p>
          </div>
          <button
            className="adm-btn adm-btn-ghost"
            onClick={() => loadReservations(true)}
            disabled={loading || !selectedEvent}
            title="Actualizar lista (se refresca automáticamente cada 20s)"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />
            Actualizar
          </button>
        </div>

        {/* Event selector */}
        {!eventsLoading && (
          <div className="adm-field" style={{ maxWidth: 420, marginBottom: 16 }}>
            <label className="adm-label">Evento</label>
            <select className="adm-input" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
              {activeEvents.length > 0 && (
                <optgroup label="Activos">
                  {activeEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name} — {ev.venueName || ev.venue_name}</option>)}
                </optgroup>
              )}
              {archivedEvents.length > 0 && (
                <optgroup label="Archivados">
                  {archivedEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.name} — {ev.venueName || ev.venue_name}</option>)}
                </optgroup>
              )}
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
              <div className="adm-empty-icon"><ClipboardList /></div>
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
                return (
                  <div key={r.id} className="res-card" onClick={() => setSelected(r)}>
                    <div className="res-card-top">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name}</div>
                        <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{r.phone}</div>
                      </div>
                      <StatusBadge status={r.status} />
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
