import { useState, useEffect, useMemo } from 'react';
import { Event } from '../../types';
import { ADMIN_CSS, STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const STATUS_OPTS = ['all', 'active', 'draft', 'sold_out', 'finished'];
const STATUS_TAB_LABELS: Record<string, string> = { all: 'Todos', active: 'Activos', draft: 'Borrador', sold_out: 'Agotado', finished: 'Finalizado' };

const EMPTY_EVENT = { id: '', name: '', venueName: '', parkingId: '', startsAt: '', endsAt: '', price: '', totalSlots: '', status: 'active' as const };

export default function AdminEvents({ token }: Props) {
  const [events, setEvents]     = useState<Event[]>([]);
  const [parkings, setParkings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState<any | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = () => {
    setLoading(true);
    api.events.list()
      .then(d => setEvents((d as any)?.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);
  useEffect(() => {
    api.admin.parkings(token)
      .then(d => setParkings((d as any)?.data || []))
      .catch(() => {});
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
    setSaving(true); setError('');
    try {
      const data = {
        name: modal.name,
        venueName: modal.venueName,
        parkingId: modal.parkingId || undefined,
        startsAt: modal.startsAt ? new Date(modal.startsAt).toISOString() : undefined,
        endsAt:   modal.endsAt   ? new Date(modal.endsAt).toISOString()   : undefined,
        price: parseFloat(modal.price) || 0,
        totalSlots: parseInt(modal.totalSlots) || 0,
        status: modal.status,
      };
      if (modal.id) await api.admin.updateEvent(token, modal.id, data);
      else          await api.admin.createEvent(token, data);
      setModal(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
  const fmtPrice = (p: number | string) => `$${parseFloat(p as string).toLocaleString('es-MX')}`;

  return (
    <>
      <style>{ADMIN_CSS}</style>
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
              <div className="adm-empty"><div className="adm-empty-icon">📅</div><div className="adm-empty-text">Sin eventos</div></div>
            ) : (
              <table className="adm-t">
                <thead><tr><th>Evento</th><th>Venue</th><th>Fecha</th><th>Precio</th><th>Lugares</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(e => {
                    const total    = Number(e.totalSlots || e.total_slots) || 0;
                    const reserved = Number(e.slotsReserved || e.slots_reserved) || 0;
                    const sc       = STATUS_COLORS[e.status] || STATUS_COLORS.draft;
                    return (
                      <tr key={e.id} onClick={() => { setModal({ id: e.id, name: e.name, venueName: e.venueName||e.venue_name||'', startsAt: (e.startsAt||e.starts_at||'').slice(0,16), endsAt: (e.endsAt||e.ends_at||'').slice(0,16), price: String(e.price), totalSlots: String(total), status: e.status }); setError(''); }}>
                        <td style={{ fontWeight: 600 }}>{e.name}</td>
                        <td style={{ color: '#555' }}>{e.venueName || e.venue_name}</td>
                        <td style={{ color: '#555', fontSize: 12 }}>{fmtDate(e.startsAt || e.starts_at || '')}</td>
                        <td style={{ fontWeight: 600 }}>{fmtPrice(e.price)}</td>
                        <td><span style={{ fontWeight: 600 }}>{reserved}</span><span style={{ color: '#bbb' }}>/{total}</span></td>
                        <td><span className="adm-pill" style={sc}>{STATUS_LABELS[e.status]}</span></td>
                        <td><button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={ev => { ev.stopPropagation(); setModal({ id: e.id, name: e.name, venueName: e.venueName||e.venue_name||'', startsAt: (e.startsAt||e.starts_at||'').slice(0,16), endsAt: (e.endsAt||e.ends_at||'').slice(0,16), price: String(e.price), totalSlots: String(total), status: e.status }); setError(''); }}>Editar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-overlay" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">{modal.id ? 'Editar evento' : 'Nuevo evento'}</div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
            <div className="adm-field"><label className="adm-label">Nombre</label><input className="adm-input" value={modal.name} onChange={e => setModal((m: any) => ({...m, name: e.target.value}))} placeholder="Natanael Cano" /></div>
            <div className="adm-field"><label className="adm-label">Venue</label><input className="adm-input" value={modal.venueName} onChange={e => setModal((m: any) => ({...m, venueName: e.target.value}))} placeholder="Foro Sol" /></div>
            <div className="adm-field">
              <label className="adm-label">Estacionamiento</label>
              <select className="adm-input" value={modal.parkingId} onChange={e => setModal((m: any) => ({...m, parkingId: e.target.value}))}>
                <option value="">— Selecciona —</option>
                {parkings.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="adm-field"><label className="adm-label">Inicio</label><input className="adm-input" type="datetime-local" value={modal.startsAt} onChange={e => setModal((m: any) => ({...m, startsAt: e.target.value}))} /></div>
              <div className="adm-field"><label className="adm-label">Fin</label><input className="adm-input" type="datetime-local" value={modal.endsAt} onChange={e => setModal((m: any) => ({...m, endsAt: e.target.value}))} /></div>
              <div className="adm-field"><label className="adm-label">Precio (MXN)</label><input className="adm-input" type="number" value={modal.price} onChange={e => setModal((m: any) => ({...m, price: e.target.value}))} placeholder="180" /></div>
              <div className="adm-field"><label className="adm-label">Total slots</label><input className="adm-input" type="number" value={modal.totalSlots} onChange={e => setModal((m: any) => ({...m, totalSlots: e.target.value}))} placeholder="150" /></div>
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
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="adm-btn" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
