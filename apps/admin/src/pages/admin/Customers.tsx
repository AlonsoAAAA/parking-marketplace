import { useState, useEffect, useMemo } from 'react';
import { Customer } from '../../types';
import { api } from '../../lib/api';

interface Props { token: string; }

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const ROLE_LABELS: Record<string, string> = { user: 'Usuario', operator: 'Operador', admin: 'Admin' };
const ROLES = ['user', 'operator', 'admin'] as const;

const MODAL_CSS = `
  .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:1000;padding:24px; }
  .modal-card { background:#fff;border-radius:16px;padding:32px;width:100%;max-width:400px; }
  .modal-title { font-size:18px;font-weight:700;letter-spacing:-0.3px;margin-bottom:4px; }
  .modal-sub { font-size:13px;color:#999;margin-bottom:24px; }
  .modal-lbl { font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#999;display:block;margin-bottom:6px; }
  .modal-inp { width:100%;padding:11px 14px;background:#f5f5f5;border:1.5px solid transparent;border-radius:10px;font-size:14px;font-family:inherit;color:#04210f;box-sizing:border-box;margin-bottom:14px; }
  .modal-inp:focus { border-color:#04210f;background:#fff;outline:none; }
  .modal-select { width:100%;padding:11px 14px;background:#f5f5f5;border:1.5px solid transparent;border-radius:10px;font-size:14px;font-family:inherit;color:#04210f;box-sizing:border-box;margin-bottom:20px;appearance:none; }
  .modal-select:focus { border-color:#04210f;background:#fff;outline:none; }
  .modal-actions { display:flex;gap:10px; }
  .modal-btn-primary { flex:1;padding:12px;background:#04210f;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer; }
  .modal-btn-primary:disabled { opacity:0.5;cursor:not-allowed; }
  .modal-btn-secondary { padding:12px 18px;background:#f5f5f5;color:#04210f;border:none;border-radius:10px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer; }
  .modal-err { background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:12px;color:#991b1b;margin-bottom:14px; }
`;

function roleBadge(role: string) {
  const style: React.CSSProperties = {
    padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
    background: role === 'admin' ? '#04210f' : role === 'operator' ? '#DBEAFE' : '#f5f5f5',
    color: role === 'admin' ? '#fff' : role === 'operator' ? '#1E40AF' : '#999',
  };
  return <span style={style}>{ROLE_LABELS[role] || role}</span>;
}

export default function AdminCustomers({ token }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm]     = useState({ phone: '', name: '', role: 'operator' });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  // ── Edit role modal ──────────────────────────────────────────────────────────
  const [editUser, setEditUser]   = useState<Customer | null>(null);
  const [editRole, setEditRole]   = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr]     = useState('');

  const openEdit = (c: Customer) => { setEditUser(c); setEditRole(c.role); setEditErr(''); };
  const closeEdit = () => setEditUser(null);

  const handleRoleChange = async () => {
    if (!editUser) return;
    setEditSaving(true); setEditErr('');
    try {
      await api.admin.updateUserRole(token, editUser.id, editRole);
      setCustomers(prev => prev.map(c => c.id === editUser.id ? { ...c, role: editRole } : c));
      closeEdit();
    } catch (e: any) {
      setEditErr(e.message || 'Error al actualizar rol');
    } finally { setEditSaving(false); }
  };

  const load = () => {
    setLoading(true);
    api.admin.customers(token)
      .then(data => setCustomers((data as any)?.data || []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c =>
      !q || (c.name || '').toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openModal = () => { setForm({ phone: '', name: '', role: 'operator' }); setFormErr(''); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleCreate = async () => {
    if (!form.phone.trim() || !form.name.trim()) { setFormErr('Teléfono y nombre son requeridos.'); return; }
    setSaving(true); setFormErr('');
    try {
      await (api.admin as any).createUser(token, { phone: form.phone.replace(/\D/g, ''), name: form.name.trim(), role: form.role });
      setShowModal(false);
      load();
    } catch (e: any) {
      setFormErr(e.message || 'Error al crear usuario');
    } finally { setSaving(false); }
  };

  return (
    <>
      <style>{MODAL_CSS}</style>
      <div className="adm-page" style={{ maxWidth: 960 }}>
        <div className="adm-ph">
          <div>
            <h1 className="adm-pt">Usuarios</h1>
            <p className="adm-ps">Gestiona clientes y operadores de la plataforma</p>
          </div>
          <button className="adm-btn" onClick={openModal}>+ Crear operador</button>
        </div>

        <div className="adm-search-bar">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{opacity:0.3,flexShrink:0}}><circle cx="5.5" cy="5.5" r="4.5" stroke="#04210f" strokeWidth="1.4"/><path d="M9 9L12 12" stroke="#04210f" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono o email..." />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:18,lineHeight:1}}>×</button>}
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : customers.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon">👥</div>
              <div className="adm-empty-text">Sin usuarios</div>
              <div className="adm-empty-sub">Crea el primer operador con el botón de arriba</div>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, color: '#bbb', marginBottom: 10 }}>{filtered.length} de {customers.length} usuarios</p>
            <div className="adm-tw">
              <table className="adm-t">
                <thead><tr><th>Usuario</th><th>Teléfono</th><th>Email</th><th>Rol</th><th>Registro</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.phone}</td>
                      <td style={{ color: '#555', fontSize: 12 }}>{c.email || '—'}</td>
                      <td>{roleBadge(c.role)}</td>
                      <td style={{ fontSize: 12, color: '#bbb' }}>{fmtDate(c.created_at)}</td>
                      <td>
                        <button
                          onClick={() => openEdit(c)}
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          title="Cambiar rol"
                        >
                          Editar rol
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Edit role modal ── */}
      {editUser && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="modal-card">
            <div className="modal-title">Cambiar rol</div>
            <div className="modal-sub">{editUser.name || editUser.phone}</div>

            {editErr && <div className="modal-err">{editErr}</div>}

            <label className="modal-lbl">Rol</label>
            <select
              className="modal-select"
              value={editRole}
              onChange={e => setEditRole(e.target.value)}
              autoFocus
            >
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>

            {editRole !== editUser.role && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 14 }}>
                ⚠️ Cambiarás el rol de <strong>{ROLE_LABELS[editUser.role]}</strong> a <strong>{ROLE_LABELS[editRole]}</strong>.
                {editRole === 'operator' && ' Este usuario podrá acceder al panel de operador.'}
                {editRole === 'admin' && ' Este usuario tendrá acceso completo al panel de administración.'}
                {editRole === 'user' && ' Este usuario perderá acceso al panel.'}
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeEdit}>Cancelar</button>
              <button
                className="modal-btn-primary"
                onClick={handleRoleChange}
                disabled={editSaving || editRole === editUser.role}
              >
                {editSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-card">
            <div className="modal-title">Crear operador</div>
            <div className="modal-sub">El operador podrá escanear QR y registrar entradas de vehículos</div>

            {formErr && <div className="modal-err">{formErr}</div>}

            <label className="modal-lbl">Nombre completo</label>
            <input
              className="modal-inp"
              placeholder="Ej. Juan Pérez"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />

            <label className="modal-lbl">Teléfono</label>
            <input
              className="modal-inp"
              type="tel"
              placeholder="5512345678"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />

            <label className="modal-lbl">Rol</label>
            <select
              className="modal-select"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="modal-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
