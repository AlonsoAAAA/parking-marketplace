import { useState, useEffect } from 'react';
import { Promotion } from '../../types';
import { api } from '../../lib/api';

interface Props { token: string; }

const EMPTY = { id: '', code: '', type: 'percent' as const, value: '', eventName: '', usageLimit: '', expiresAt: '' };

export default function AdminPromotions({ token }: Props) {
  const [promos, setPromos]   = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<any | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = () => {
    setLoading(true);
    api.admin.promotions(token)
      .then(d => setPromos((d as any)?.data || []))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const save = async () => {
    if (!modal?.code?.trim()) { setError('El código es requerido'); return; }
    if (!modal?.value)        { setError('El descuento es requerido'); return; }
    setSaving(true); setError('');
    try {
      await api.admin.createPromotion(token, {
        code: modal.code.toUpperCase(),
        type: modal.type,
        value: parseFloat(modal.value),
        maxUses: modal.usageLimit ? parseInt(modal.usageLimit) : undefined,
        expiresAt: modal.expiresAt ? new Date(modal.expiresAt).toISOString() : undefined,
      });
      setModal(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 900 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Promociones</h1><p className="adm-ps">Códigos de descuento y ofertas por evento</p></div>
          <button className="adm-btn" onClick={() => { setModal({...EMPTY, code: genCode()}); setError(''); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nueva promo
          </button>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : promos.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">🏷️</div>
              <div className="adm-empty-text">Sin promociones activas</div>
              <div className="adm-empty-sub">Crea códigos de descuento para eventos específicos o para toda la plataforma</div>
              <button className="adm-btn" style={{ marginTop: 16 }} onClick={() => { setModal({...EMPTY, code: genCode()}); setError(''); }}>Crear primera promoción</button>
            </div>
          </div>
        ) : (
          <div className="adm-tw">
            <table className="adm-t">
              <thead><tr><th>Código</th><th>Descuento</th><th>Evento</th><th>Usos</th><th>Vence</th><th>Status</th></tr></thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, background: '#f5f5f5', padding: '4px 8px', borderRadius: 6 }}>{p.code}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.type === 'percent' ? `${p.value}%` : `$${p.value}`}</td>
                    <td style={{ color: '#555', fontSize: 12 }}>{p.eventName || 'Todos los eventos'}</td>
                    <td>{p.uses_count}{p.max_uses ? `/${p.max_uses}` : ''}</td>
                    <td style={{ fontSize: 12, color: '#bbb' }}>{fmtDate(p.expires_at)}</td>
                    <td>
                      <span className="adm-pill" style={{ background: p.is_active ? '#D1FAE5' : '#F3F4F6', color: p.is_active ? '#065F46' : '#6B7280' }}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
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
            <div className="adm-modal-title">Nueva promoción</div>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
            <div className="adm-field">
              <label className="adm-label">Código</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="adm-input" value={modal.code} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }}
                  onChange={e => setModal((m: any) => ({...m, code: e.target.value.toUpperCase()}))} placeholder="VERANO25" />
                <button className="adm-btn adm-btn-ghost" style={{ flexShrink: 0 }} onClick={() => setModal((m: any) => ({...m, code: genCode()}))}>↻</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="adm-field">
                <label className="adm-label">Tipo</label>
                <select className="adm-input" value={modal.type} onChange={e => setModal((m: any) => ({...m, type: e.target.value}))}>
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">{modal.type === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}</label>
                <input className="adm-input" type="number" value={modal.value} onChange={e => setModal((m: any) => ({...m, value: e.target.value}))} placeholder={modal.type === 'percent' ? '20' : '50'} />
              </div>
            </div>
            <div className="adm-field"><label className="adm-label">Evento (dejar vacío = todos)</label><input className="adm-input" value={modal.eventName} onChange={e => setModal((m: any) => ({...m, eventName: e.target.value}))} placeholder="Natanael Cano" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="adm-field"><label className="adm-label">Límite de usos</label><input className="adm-input" type="number" value={modal.usageLimit} onChange={e => setModal((m: any) => ({...m, usageLimit: e.target.value}))} placeholder="100" /></div>
              <div className="adm-field"><label className="adm-label">Vence el</label><input className="adm-input" type="date" value={modal.expiresAt} onChange={e => setModal((m: any) => ({...m, expiresAt: e.target.value}))} /></div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="adm-btn" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Crear promoción'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
