import { useState, useEffect } from 'react';
import { Parking } from '../../types';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const EMPTY: Partial<Parking & { totalSlots: number }> = { id: '', name: '', address: '', totalSlots: undefined, operatorName: '' };

export default function AdminParkings({ token }: Props) {
  const [parkings, setParkings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<any | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = () => {
    setLoading(true);
    api.admin.parkings(token)
      .then(data => setParkings((data as any)?.data || []))
      .catch(() => setParkings([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const save = async () => {
    if (!modal?.name?.trim()) { setError('Nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      const data = { name: modal.name, address: modal.address, totalCapacity: modal.totalSlots };
      if (modal.id) await api.admin.updateParking(token, modal.id, data);
      else          await api.admin.createParking(token, data);
      setModal(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este estacionamiento?')) return;
    try { await api.admin.deleteParking(token, id); load(); }
    catch (e: any) { alert(e.message || 'Error al eliminar'); }
  };

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <div className="adm-page" style={{ maxWidth: 900 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Estacionamientos</h1><p className="adm-ps">{parkings.length} registros encontrados</p></div>
          <button className="adm-btn" onClick={() => { setModal({...EMPTY}); setError(''); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nuevo
          </button>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : parkings.length === 0 ? (
          <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon">🅿️</div><div className="adm-empty-text">Sin estacionamientos</div></div></div>
        ) : (
          <div className="adm-tw">
            <table className="adm-t">
              <thead><tr><th>Nombre</th><th>Dirección</th><th>Coordenadas</th><th></th></tr></thead>
              <tbody>
                {parkings.map((p: any) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontSize: 12, color: '#555' }}>{p.address}</td>
                    <td style={{ fontSize: 11, color: '#bbb', fontFamily: 'monospace' }}>{p.lat && p.lng ? `${p.lat}, ${p.lng}` : '—'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setModal({...p, totalSlots: p.total_capacity}); setError(''); }}>Editar</button>
                      <button className="adm-btn adm-btn-sm" style={{ background: '#fef2f2', color: '#991b1b' }} onClick={() => del(p.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-overlay" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">{modal.id ? 'Editar estacionamiento' : 'Nuevo estacionamiento'}</div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
            <div className="adm-field"><label className="adm-label">Nombre</label><input className="adm-input" value={modal.name || ''} onChange={e => setModal((m: any) => ({...m, name: e.target.value}))} /></div>
            <div className="adm-field"><label className="adm-label">Dirección</label><input className="adm-input" value={modal.address || ''} onChange={e => setModal((m: any) => ({...m, address: e.target.value}))} /></div>
            <div className="adm-field"><label className="adm-label">Total de lugares</label><input className="adm-input" type="number" value={modal.totalSlots || ''} onChange={e => setModal((m: any) => ({...m, totalSlots: Number(e.target.value)}))} /></div>
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
