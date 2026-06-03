import { useState, useEffect, useMemo } from 'react';
import { Claim } from '../../types';
import { ADMIN_CSS, STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const TABS = ['all', 'open', 'in_progress', 'resolved'];
const TAB_LABELS: Record<string, string> = { all: 'Todos', open: 'Abiertos', in_progress: 'En proceso', resolved: 'Resueltos' };

export default function AdminClaims({ token }: Props) {
  const [claims, setClaims]   = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [selected, setSelected] = useState<Claim | null>(null);
  const [saving, setSaving]   = useState(false);

  const load = () => {
    setLoading(true);
    api.admin.claims(token)
      .then(d => setClaims((d as any)?.data || []))
      .catch(() => setClaims([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const filtered = useMemo(() =>
    claims.filter(c => filter === 'all' || c.status === filter)
  , [claims, filter]);

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.admin.updateClaim(token, selected.id, { status });
      setSelected(null);
      load();
    } catch { } finally { setSaving(false); }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Reclamos</h1><p className="adm-ps">Gestión de incidencias y disputas</p></div>
        </div>

        <div className="adm-filter-row">
          {TABS.map(t => <button key={t} onClick={() => setFilter(t)} className={`adm-filter${filter===t?' on':''}`}>{TAB_LABELS[t]}</button>)}
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : claims.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">⚠️</div>
              <div className="adm-empty-text">Sin reclamos</div>
              <div className="adm-empty-sub">Disponible cuando el endpoint /admin/claims esté activo</div>
            </div>
          </div>
        ) : (
          <div className="adm-tw">
            {filtered.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-text">Sin reclamos en esta categoría</div></div>
            ) : (
              <table className="adm-t">
                <thead><tr><th>ID</th><th>Usuario</th><th>Evento</th><th>Descripción</th><th>Status</th><th>Fecha</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(c => {
                    const sc = STATUS_COLORS[c.status] || STATUS_COLORS.open;
                    return (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#bbb' }}>{c.id.slice(0,8)}</td>
                        <td style={{ fontWeight: 600 }}>{c.userName}</td>
                        <td style={{ color: '#555', fontSize: 12 }}>{c.eventName}</td>
                        <td style={{ fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                        <td><span className="adm-pill" style={sc}>{STATUS_LABELS[c.status]}</span></td>
                        <td style={{ fontSize: 11, color: '#bbb' }}>{fmtDate(c.created_at)}</td>
                        <td><button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setSelected(c)}>Ver</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="adm-overlay">
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Reclamo</div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#bbb', marginBottom: 4 }}>Usuario</p>
              <p style={{ fontWeight: 600 }}>{selected.userName}</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#bbb', marginBottom: 4 }}>Evento</p>
              <p>{selected.eventName}</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#bbb', marginBottom: 4 }}>Descripción</p>
              <p style={{ fontSize: 13, lineHeight: 1.6, background: '#f5f5f5', borderRadius: 8, padding: 12 }}>{selected.description}</p>
            </div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>Cambiar status</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['open', 'in_progress', 'resolved'].map(s => (
                <button key={s} className={`adm-btn${selected.status === s ? '' : ' adm-btn-ghost'}`} style={{ flex: 1 }}
                  onClick={() => updateStatus(s)} disabled={saving || selected.status === s}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
