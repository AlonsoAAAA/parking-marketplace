import { useState, useEffect } from 'react';
import { Venue } from '../../types';
import { api } from '../../lib/api';

interface Props { token: string; }

const EMPTY: Venue = { id: '', name: '', city: 'Ciudad de México', address: '', capacity: undefined, lat: undefined, lng: undefined };

export default function AdminVenues({ token }: Props) {
  const [venues, setVenues]   = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<Venue | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    api.admin.venues(token)
      .then(v => setVenues((v as any)?.data || []))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const save = async () => {
    if (!modal?.name.trim() || !modal?.address.trim()) { setError('Nombre y dirección son requeridos'); return; }
    setSaving(true); setError('');
    try {
      const data = { name: modal.name, city: modal.city, address: modal.address, capacity: modal.capacity, lat: modal.lat, lng: modal.lng };
      if (modal.id) await api.admin.updateVenue(token, modal.id, data);
      else          await api.admin.createVenue(token, data);
      setModal(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este venue?')) return;
    try { await api.admin.deleteVenue(token, id); load(); }
    catch (e: any) { alert(e.message || 'Error al eliminar'); }
  };

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 900 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Venues</h1><p className="adm-ps">Estadios, recintos y centros de eventos</p></div>
          <button className="adm-btn" onClick={() => { setModal({...EMPTY}); setError(''); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nuevo venue
          </button>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : venues.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">🏟️</div>
              <div className="adm-empty-text">Sin venues registrados</div>
              <div className="adm-empty-sub">Agrega el primer venue para poder crear eventos</div>
              <button className="adm-btn" style={{ marginTop: 16 }} onClick={() => { setModal({...EMPTY}); setError(''); }}>Agregar venue</button>
            </div>
          </div>
        ) : (
          <div className="adm-tw">
            <table className="adm-t">
              <thead><tr><th>Venue</th><th>Ciudad</th><th>Dirección</th><th>Capacidad</th><th></th></tr></thead>
              <tbody>
                {venues.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td style={{ color: '#555' }}>{v.city}</td>
                    <td style={{ color: '#555', fontSize: 12 }}>{v.address}</td>
                    <td>{v.capacity?.toLocaleString('es-MX') ?? '—'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setModal({...v}); setError(''); }}>Editar</button>
                      <button className="adm-btn adm-btn-sm" style={{ background: '#fef2f2', color: '#991b1b' }} onClick={() => del(v.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-overlay">
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">{modal.id ? 'Editar venue' : 'Nuevo venue'}</div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
            <div className="adm-field"><label className="adm-label">Nombre</label><input className="adm-input" value={modal.name} onChange={e => setModal(m => m && ({...m, name: e.target.value}))} placeholder="Foro Sol" /></div>
            <div className="adm-field"><label className="adm-label">Ciudad</label><input className="adm-input" value={modal.city} onChange={e => setModal(m => m && ({...m, city: e.target.value}))} /></div>
            <div className="adm-field"><label className="adm-label">Dirección</label><input className="adm-input" value={modal.address} onChange={e => setModal(m => m && ({...m, address: e.target.value}))} placeholder="Av. Principal 123, Col. Centro" /></div>
            <div className="adm-field"><label className="adm-label">Capacidad</label><input className="adm-input" type="number" value={modal.capacity ?? ''} onChange={e => setModal(m => m && ({...m, capacity: Number(e.target.value) || undefined}))} placeholder="65000" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="adm-field"><label className="adm-label">Latitud</label><input className="adm-input" type="number" step="any" value={modal.lat ?? ''} onChange={e => setModal(m => m && ({...m, lat: e.target.value ? Number(e.target.value) : undefined}))} placeholder="19.4326" /></div>
              <div className="adm-field"><label className="adm-label">Longitud</label><input className="adm-input" type="number" step="any" value={modal.lng ?? ''} onChange={e => setModal(m => m && ({...m, lng: e.target.value ? Number(e.target.value) : undefined}))} placeholder="-99.1332" /></div>
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
