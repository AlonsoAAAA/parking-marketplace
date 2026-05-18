import { useState, useEffect, useMemo } from 'react';
import { Customer } from '../../types';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const ROLE_LABELS: Record<string, string> = { user: 'Usuario', operator: 'Operador', admin: 'Admin' };

export default function AdminCustomers({ token }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    api.admin.customers(token)
      .then(data => setCustomers((data as any)?.data || []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c =>
      !q || (c.name || '').toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Clientes</h1><p className="adm-ps">Usuarios registrados en la plataforma</p></div>
        </div>

        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{opacity:0.3,flexShrink:0}}><circle cx="5.5" cy="5.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.4"/><path d="M9 9L12 12" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono o email..." />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:18,lineHeight:1}}>×</button>}
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : customers.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">👥</div>
              <div className="adm-empty-text">Sin clientes</div>
              <div className="adm-empty-sub">Disponible cuando el endpoint /admin/users esté activo en el API</div>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, color: '#bbb', marginBottom: 10 }}>{filtered.length} de {customers.length} usuarios</p>
            <div className="adm-tw">
              <table className="adm-t">
                <thead><tr><th>Usuario</th><th>Teléfono</th><th>Email</th><th>Rol</th><th>Registro</th></tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.phone}</td>
                      <td style={{ color: '#555', fontSize: 12 }}>{c.email || '—'}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: c.role === 'admin' ? '#1a1a1a' : c.role === 'operator' ? '#DBEAFE' : '#f5f5f5',
                          color: c.role === 'admin' ? '#fff' : c.role === 'operator' ? '#1E40AF' : '#999'
                        }}>
                          {ROLE_LABELS[c.role] || c.role}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#bbb' }}>{fmtDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
