import { useState, useEffect, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Event } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const STATUS_OPTS = ['all', 'active', 'draft', 'sold_out', 'finished'];
const STATUS_TAB_LABELS: Record<string, string> = { all: 'Todos', active: 'Activos', draft: 'Borrador', sold_out: 'Agotado', finished: 'Finalizado' };

const CATEGORIES = [
  { value: 'conciertos', label: 'Conciertos' },
  { value: 'deportes',   label: 'Deportes'   },
  { value: 'teatro',     label: 'Teatro'     },
  { value: 'festival',   label: 'Festival'   },
];

const EMPTY_EVENT = {
  id: '', name: '', venueId: '', venueName: '',
  startsAt: '', endsAt: '',
  price: '',
  status: 'active' as const,
  category: '',
};

// El input datetime-local trabaja en hora local del navegador, sin timezone.
// La API devuelve/espera ISO en UTC — hay que convertir en ambos sentidos para
// que la hora mostrada/guardada no se desplace por el offset de zona horaria.
const isoToLocalInput = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminEvents({ token }: Props) {
  const [events, setEvents]   = useState<Event[]>([]);
  const [venues, setVenues]   = useState<any[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [modal, setModal]         = useState<any | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState('');

  const load = () => {
    setLoading(true);
    api.admin.events(token)
      .then(d => setEvents((d as any)?.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);
  useEffect(() => {
    setVenuesLoading(true);
    api.admin.venues(token)
      .then(d => setVenues((d as any)?.data || d || []))
      .catch(() => setVenuesError(true))
      .finally(() => setVenuesLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter(e => {
      const name     = (e.name || '').toLowerCase();
      const venue    = (e.venueName || e.venue_name || '').toLowerCase();
      const matchQ   = !q || name.includes(q) || venue.includes(q);
      const matchSt  = filter === 'all' || e.status === filter;
      return matchQ && matchSt;
    });
  }, [events, filter, search]);

  const save = async () => {
    if (!modal?.name?.trim()) { setError('El nombre es requerido'); return; }
    if (!modal?.venueName?.trim()) { setError('Selecciona un venue'); return; }
    setSaving(true); setError('');
    try {
      const data = {
        name:       modal.name,
        venueId:    modal.venueId || undefined,
        venueName:  modal.venueName,
        startsAt:   modal.startsAt ? new Date(modal.startsAt).toISOString() : undefined,
        endsAt:     modal.endsAt   ? new Date(modal.endsAt).toISOString()   : undefined,
        price:    parseFloat(modal.price) || 0,
        status:   modal.status,
        category: modal.category || undefined,
      };
      if (modal.id) await api.admin.updateEvent(token, modal.id, data);
      else          await api.admin.createEvent(token, data);
      setModal(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.admin.deleteEvent(token, deleteId);
      setDeleteId(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al eliminar'); }
    finally { setDeleting(false); }
  };

  const IVA_RATE = 0.16;
  const fmtDate  = (iso: string) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
  const fmtMXN   = (n: number)   => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const calcIva  = (base: number | string) => { const b = parseFloat(base as string) || 0; return { base: b, iva: b * IVA_RATE, total: b * (1 + IVA_RATE) }; };

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Eventos</h1><p className="adm-ps">{events.length} eventos en total</p></div>
          <button className="adm-btn" onClick={() => { setModal({...EMPTY_EVENT}); setError(''); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nuevo evento
          </button>
        </div>

        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{opacity:0.3,flexShrink:0}}><circle cx="5.5" cy="5.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.4"/><path d="M9 9L12 12" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o venue..." />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:18,lineHeight:1}}>×</button>}
        </div>
        <div className="adm-filter-row">
          {STATUS_OPTS.map(s => <button key={s} onClick={() => setFilter(s)} className={`adm-filter${filter===s?' on':''}`}>{STATUS_TAB_LABELS[s]}</button>)}
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : (
          <div className="adm-tw">
            {filtered.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-icon"><CalendarDays /></div><div className="adm-empty-text">Sin eventos</div></div>
            ) : (
              <table className="adm-t">
                <thead>
                  <tr>
                    <th>Evento</th><th>Venue</th><th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Precio base</th>
                    <th style={{ textAlign: 'right' }}>IVA 16%</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Lugares</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const total    = Number(e.totalSlots || e.total_slots) || 0;
                    const reserved = Number(e.slotsReserved || e.slots_reserved) || 0;
                    const sc       = STATUS_COLORS[e.status] || STATUS_COLORS.draft;
                    const pv       = calcIva(e.price);
                    const openEdit = () => { const vn = e.venueName||e.venue_name||''; const mv = venues.find((v:any) => v.name === vn); setModal({ id: e.id, name: e.name, venueId: mv?.id||'', venueName: vn, startsAt: isoToLocalInput(e.startsAt||e.starts_at||''), endsAt: isoToLocalInput(e.endsAt||e.ends_at||''), price: String(e.price), status: e.status, category: (e as any).category||'' }); setError(''); };
                    return (
                      <tr key={e.id} onClick={openEdit}>
                        <td style={{ fontWeight: 600 }}>{e.name}</td>
                        <td style={{ color: '#555' }}>{e.venueName || e.venue_name}</td>
                        <td style={{ color: '#555', fontSize: 12 }}>{fmtDate(e.startsAt || e.starts_at || '')}</td>
                        <td style={{ textAlign: 'right', color: '#555' }}>{fmtMXN(pv.base)}</td>
                        <td style={{ textAlign: 'right', color: '#888', fontSize: 12 }}>{fmtMXN(pv.iva)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMXN(pv.total)}</td>
                        <td><span style={{ fontWeight: 600 }}>{reserved}</span><span style={{ color: '#bbb' }}>/{total}</span></td>
                        <td><span className="adm-pill" style={sc}>{STATUS_LABELS[e.status]}</span></td>
                        <td style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={ev => { ev.stopPropagation(); openEdit(); }}>Editar</button>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ color:'#dc2626', borderColor:'rgba(220,38,38,.25)' }}
                            onClick={ev => { ev.stopPropagation(); setDeleteId(e.id); setError(''); }}>Eliminar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteId && (
        <div className="adm-overlay">
          <div className="adm-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Eliminar evento</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 20, lineHeight: 1.5 }}>
              ¿Estás seguro que quieres eliminar este evento? Esta acción no se puede deshacer y se borrarán todas las reservaciones asociadas.
            </p>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#991b1b', marginBottom:16 }}>{error}</div>}
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => { setDeleteId(null); setError(''); }}>Cancelar</button>
              <button className="adm-btn" style={{ background:'#dc2626' }} onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="adm-overlay">
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">{modal.id ? 'Editar evento' : 'Nuevo evento'}</div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
            <div className="adm-field"><label className="adm-label">Nombre</label><input className="adm-input" value={modal.name} onChange={e => setModal((m: any) => ({...m, name: e.target.value}))} placeholder="Natanael Cano" autoFocus /></div>
            <div className="adm-field">
              <label className="adm-label">Venue</label>
              <select
                className="adm-input"
                value={modal.venueId}
                disabled={venuesLoading || venuesError || venues.length === 0}
                onChange={e => {
                  const v = venues.find((v: any) => v.id === e.target.value);
                  setModal((m: any) => ({ ...m, venueId: e.target.value, venueName: v?.name || '' }));
                }}
              >
                <option value="">
                  {venuesLoading ? 'Cargando venues…' : venuesError ? 'Error al cargar venues' : venues.length === 0 ? 'No hay venues registrados' : '— Selecciona un venue —'}
                </option>
                {venues.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name}{v.city ? ` · ${v.city}` : ''}</option>
                ))}
              </select>
              {venuesError && (
                <p style={{ fontSize: 11, color: '#9f1239', marginTop: 5 }}>
                  No se pudo cargar la lista de venues. Recarga la página o crea el venue primero en la sección Venues.
                </p>
              )}
              {modal.venueId && (() => { const v = venues.find((x:any) => x.id === modal.venueId); return v ? <p style={{ fontSize: 11, color: '#bbb', marginTop: 5 }}>{v.address}{v.capacity ? ` · ${v.capacity.toLocaleString()} cap.` : ''}</p> : null; })()}
            </div>
            <div className="adm-field">
              <label className="adm-label">Categoría</label>
              <select
                className="adm-input"
                value={modal.category}
                onChange={e => setModal((m: any) => ({ ...m, category: e.target.value }))}
              >
                <option value="">— Sin categoría —</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Fechas — apiladas para evitar overflow del datetime picker */}
            <div className="adm-field">
              <label className="adm-label">Inicio del evento</label>
              <input className="adm-input" type="datetime-local" value={modal.startsAt} onChange={e => setModal((m: any) => ({...m, startsAt: e.target.value}))} style={{ width: '100%', minWidth: 0 }} />
            </div>
            <div className="adm-field">
              <label className="adm-label">Fin del evento</label>
              <input className="adm-input" type="datetime-local" value={modal.endsAt} onChange={e => setModal((m: any) => ({...m, endsAt: e.target.value}))} style={{ width: '100%', minWidth: 0 }} />
            </div>

            {/* Precio base (solo respaldo) */}
            <div style={{ marginBottom: 16 }}>
              <label className="adm-label" style={{ marginBottom: 6, display: 'block' }}>Precio base de respaldo (MXN)</label>
              <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '10px 12px', maxWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13, color: '#bbb', flexShrink: 0 }}>$</span>
                  <input
                    type="number"
                    value={modal.price}
                    onChange={e => setModal((m: any) => ({...m, price: e.target.value}))}
                    placeholder="180"
                    style={{ background: 'none', border: 'none', outline: 'none', fontSize: 15, fontWeight: 700, color: '#1a1a1a', width: '100%', fontFamily: 'Inter, sans-serif', minWidth: 0 }}
                  />
                </div>
                {modal.price !== '' && parseFloat(modal.price) > 0 && (() => {
                  const pv = calcIva(modal.price);
                  return (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#aaa' }}>
                      <span>IVA&nbsp;{fmtMXN(pv.iva)}</span>
                      <span style={{ fontWeight: 700, color: '#555' }}>Total {fmtMXN(pv.total)}</span>
                    </div>
                  );
                })()}
              </div>
              <p style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>
                Los precios reales por tipo de vehículo se configuran en el estacionamiento
                (Estacionamientos → Editar) y se calculan ahí con el margen dinámico + IVA.
                Este precio base solo se usa como respaldo si el estacionamiento no tiene
                tarifa configurada para ese tipo de vehículo.
              </p>
            </div>
            <div className="adm-field">
              <label className="adm-label">Status</label>
              <select className="adm-input" value={modal.status} onChange={e => setModal((m: any) => ({...m, status: e.target.value}))}>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="sold_out">Agotado</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>
            <div className="adm-modal-footer" style={{ justifyContent:'space-between' }}>
              <div style={{ display:'flex', gap:8 }}>
                <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                {modal.id && (
                  <button className="adm-btn adm-btn-ghost" style={{ color:'#dc2626', borderColor:'rgba(220,38,38,.25)' }}
                    onClick={() => { setDeleteId(modal.id); setModal(null); }}>
                    Eliminar
                  </button>
                )}
              </div>
              <button className="adm-btn" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
