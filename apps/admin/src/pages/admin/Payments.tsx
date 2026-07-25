import { useState, useEffect, useMemo } from 'react';
import { Payment } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const STATUS_OPTS = ['all', 'completed', 'pending', 'failed', 'refunded'];
const STATUS_TAB_LABELS: Record<string, string> = { all: 'Todos', completed: 'Completado', pending: 'Pendiente', failed: 'Fallido', refunded: 'Reembolsado' };

const fmtMoney  = (n: number | string) => `$${parseFloat(n as string).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtDate   = (iso?: string)       => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminPayments({ token }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.admin.payments(token)
      .then(d => setPayments((d as any)?.data || []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter(p => {
      const matchSt = filter === 'all' || p.status === filter;
      const matchQ  = !q || (p.userName || '').toLowerCase().includes(q) || (p.eventName || '').toLowerCase().includes(q) || (p.provider_payment_id || '').toLowerCase().includes(q);
      return matchSt && matchQ;
    });
  }, [payments, filter, search]);

  const total = filtered.reduce((s, p) => s + (p.status === 'completed' ? parseFloat(p.amount as string) : 0), 0);

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 1080 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Pagos</h1><p className="adm-ps">Historial completo de transacciones</p></div>
          {total > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px 20px', textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#bbb', marginBottom: 4 }}>Total filtrado</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>{fmtMoney(total)} <span style={{ fontSize: 11, color: '#bbb' }}>MXN</span></div>
            </div>
          )}
        </div>

        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{opacity:0.3,flexShrink:0}}><circle cx="5.5" cy="5.5" r="4.5" stroke="#04210f" strokeWidth="1.4"/><path d="M9 9L12 12" stroke="#04210f" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario, evento o ID de Stripe..." />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:18,lineHeight:1}}>×</button>}
        </div>
        <div className="adm-filter-row">
          {STATUS_OPTS.map(s => <button key={s} onClick={() => setFilter(s)} className={`adm-filter${filter===s?' on':''}`}>{STATUS_TAB_LABELS[s]}</button>)}
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : payments.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">💳</div>
              <div className="adm-empty-text">Sin pagos registrados</div>
              <div className="adm-empty-sub">Disponible cuando el endpoint /admin/payments esté activo en el API</div>
            </div>
          </div>
        ) : (
          <div className="adm-tw">
            {filtered.length === 0 ? (
              <div className="adm-empty"><div className="adm-empty-text">Sin resultados</div></div>
            ) : (
              <table className="adm-t">
                <thead><tr><th>Reserva</th><th>Usuario</th><th>Evento</th><th>Monto</th><th>Status</th><th>Stripe ID</th><th>Fecha</th></tr></thead>
                <tbody>
                  {filtered.map(p => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#bbb' }}>{(p.reservationId || '').slice(0, 8)}</td>
                        <td style={{ fontWeight: 600 }}>{p.userName || '—'}</td>
                        <td style={{ color: '#555', fontSize: 12 }}>{p.eventName || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{fmtMoney(p.amount)}</td>
                        <td><span className="adm-pill" style={sc}>{STATUS_LABELS[p.status]}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#bbb' }}>{(p.provider_payment_id || '').slice(0, 18)}{(p.provider_payment_id?.length ?? 0) > 18 ? '…' : ''}</td>
                        <td style={{ fontSize: 11, color: '#bbb' }}>{fmtDate(p.created_at)}</td>
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
