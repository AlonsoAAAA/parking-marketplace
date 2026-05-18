import { useState, useEffect, useMemo } from 'react';
import { Event, Reservation } from '../../types';
import { ADMIN_CSS, STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const STATUS_TABS = ['all', 'paid', 'pending', 'used', 'cancelled', 'expired'];
const fmtDT = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function OperatorReservations({ token }: Props) {
  const [events, setEvents]             = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]           = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [status, setStatus]             = useState('all');
  const [search, setSearch]             = useState('');

  useEffect(() => {
    api.events.list()
      .then(d => {
        const list = (d as any).data || [];
        setEvents(list);
        if (list.length > 0) setSelectedEvent(list[0].id);
      })
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [token]);

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
        || r.phone.includes(q);
      return matchSt && matchQ;
    });
  }, [reservations, status, search]);

  return (
    <>
      <style>{ADMIN_CSS + `
        .show-dt { display: none; }
        @media(min-width:640px){ .show-dt { display: block; } .hide-dt { display: none; } }
        .res-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }
        .res-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
      `}</style>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Reservaciones</h1><p className="adm-ps">Lista de reservas por evento</p></div>
        </div>

        {/* Event selector */}
        {eventsLoading ? null : (
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
            <button key={s} onClick={() => setStatus(s)} className={`adm-filter${status===s?' on':''}`}>
              {STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{opacity:0.3,flexShrink:0}}><circle cx="5.5" cy="5.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.4"/><path d="M9 9L12 12" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..." />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:18,lineHeight:1}}>×</button>}
        </div>

        <p style={{ fontSize: 11, color: '#bbb', marginBottom: 12 }}>
          {loading ? 'Cargando...' : `${filtered.length} reserva${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {!loading && filtered.length === 0 && (
          <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon">📋</div><div className="adm-empty-text">Sin resultados</div></div></div>
        )}

        {/* Desktop table */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="show-dt">
              <div className="adm-tw">
                <table className="adm-t">
                  <thead><tr><th>Usuario</th><th>Teléfono</th><th>Status</th><th>Ticket</th><th>Escaneado</th><th>Fecha</th></tr></thead>
                  <tbody>
                    {filtered.map(r => {
                      const sc = STATUS_COLORS[r.status] || STATUS_COLORS.expired;
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.user_name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.phone}</td>
                          <td><span className="adm-pill" style={sc}>{STATUS_LABELS[r.status]}</span></td>
                          <td>{(r as any).has_ticket ? <span style={{ color: '#065F46', fontSize: 12, fontWeight: 600 }}>✓ Sí</span> : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}</td>
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
                  <div key={r.id} className="res-card">
                    <div className="res-card-top">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name}</div>
                        <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{r.phone}</div>
                      </div>
                      <span className="adm-pill" style={sc}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#bbb' }}>{fmtDT(r.created_at)}</span>
                      {r.scanned_at && <span style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>✓ Escaneado</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
