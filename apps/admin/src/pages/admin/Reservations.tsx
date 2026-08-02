import { useState, useEffect, useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { ReservationHistoryRow } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const STATUS_OPTS = ['all', 'paid', 'pending', 'used', 'cancelled', 'expired'];

const fmtMoney = (n?: number | string) => n == null ? '—' : `$${parseFloat(n as string).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtDate  = (iso?: string) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminReservations({ token }: Props) {
  const [reservations, setReservations] = useState<ReservationHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    api.admin.reservations(token)
      .then(d => setReservations((d as any)?.data || []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return reservations.filter(r => {
      const matchSt = filter === 'all' || r.status === filter;
      const matchQ  = !q || (r.userName || '').toLowerCase().includes(q) || (r.eventName || '').toLowerCase().includes(q);
      return matchSt && matchQ;
    });
  }, [reservations, filter, search]);

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 1180 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Reservas</h1><p className="adm-ps">Historial completo de reservas de todos los usuarios y eventos</p></div>
        </div>

        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{opacity:0.3,flexShrink:0}}><circle cx="5.5" cy="5.5" r="4.5" stroke="#04210f" strokeWidth="1.4"/><path d="M9 9L12 12" stroke="#04210f" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario o evento..." />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:18,lineHeight:1}}>×</button>}
        </div>
        <div className="adm-filter-row">
          {STATUS_OPTS.map(s => <button key={s} onClick={() => setFilter(s)} className={`adm-filter${filter===s?' on':''}`}>{s === 'all' ? 'Todos' : STATUS_LABELS[s]}</button>)}
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : reservations.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon"><ClipboardList /></div>
              <div className="adm-empty-text">Sin reservas registradas</div>
            </div>
          </div>
        ) : (
          <div className="adm-tw">
            {filtered.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-text">Sin resultados</div></div>
            ) : (
              <table className="adm-t">
                <thead>
                  <tr>
                    <th>Usuario</th><th>Evento</th><th>Monto</th><th>Fecha</th>
                    <th>Reclamo</th><th>Escaneo</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.userName || '—'}</td>
                        <td style={{ color: '#555', fontSize: 12 }}>{r.eventName || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{fmtMoney(r.amount)}</td>
                        <td style={{ fontSize: 11, color: '#bbb' }}>{fmtDate(r.createdAt)}</td>
                        <td>
                          {r.claimCount > 0 ? (
                            <span className="adm-pill" style={r.lastClaimStatus ? (STATUS_COLORS[r.lastClaimStatus] || STATUS_COLORS.open) : STATUS_COLORS.open}>
                              {r.lastClaimType === 'refund_request' ? 'Reembolso' : 'Reclamo'}{r.claimCount > 1 ? ` (${r.claimCount})` : ''}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: '#ccc' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, color: r.scannedAt ? '#555' : '#ccc' }}>{r.scannedAt ? fmtDate(r.scannedAt) : 'Sin escanear'}</td>
                        <td><span className="adm-pill" style={sc}>{STATUS_LABELS[r.status]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
