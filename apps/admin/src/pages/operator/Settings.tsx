import { useState, useEffect, useRef } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { SubOperator } from '../../types';
import { api } from '../../lib/api';

interface Props { token: string; }

// ── Add/Edit modal ─────────────────────────────────────────────────────────────
function SubOpModal({
  initial,
  onSave,
  onClose,
  saving,
  error,
}: {
  initial?: SubOperator;
  onSave: (data: { name: string; phone: string; isActive: boolean; role: string; otp: string }) => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}) {
  const [step,     setStep]     = useState<1 | 2>(1);
  const [name,     setName]     = useState(initial?.name     ?? '');
  const [phone,    setPhone]    = useState(initial?.phone ? formatPhone(initial.phone) : '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [role,     setRole]     = useState<'sub_admin' | 'sub_operator'>(initial?.role ?? 'sub_operator');
  const [otp,      setOtp]      = useState('');
  const [sending,  setSending]  = useState(false);
  const [sendErr,  setSendErr]  = useState('');
  const [resent,   setResent]   = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  function formatPhone(raw: string) {
    const d = raw.replace(/\D/g, '');
    return d.length >= 10 ? d.slice(-10) : d;
  }

  const isEdit    = !!initial;
  const phoneOk   = phone.replace(/\D/g, '').length === 10;
  const step1Ok   = name.trim().length >= 2 && (isEdit || phoneOk);
  const step2Ok   = otp.length === 6;

  // ── Send OTP ─────────────────────────────────────────────────────────────────
  async function handleSendOtp(resend = false) {
    setSending(true); setSendErr(''); if (resend) setResent(false);
    try {
      await api.auth.sendOtp(phone);
      setStep(2);
      if (resend) setResent(true);
      setTimeout(() => otpRef.current?.focus(), 80);
    } catch (e: any) {
      setSendErr(e.message || 'Error al enviar el código');
    } finally {
      setSending(false);
    }
  }

  // ── Phone display helper ──────────────────────────────────────────────────────
  const fmtDisplay = (p: string) => {
    const d = p.replace(/\D/g, '');
    if (d.length < 10) return `+52 ${d}`;
    const t = d.slice(-10);
    return `+52 ${t.slice(0,2)} ${t.slice(2,6)} ${t.slice(6)}`;
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, padding: '24px 24px 28px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
              {isEdit ? 'Editar usuario' : step === 1 ? 'Agregar usuario' : 'Verificar número'}
            </h2>
            {!isEdit && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {[1, 2].map(s => (
                  <div key={s} style={{ height: 3, width: 28, borderRadius: 2, background: step >= s ? '#1a1a1a' : '#e5e5e5', transition: 'background 0.25s' }} />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: '#f5f5f5', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 18, color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}
          >×</button>
        </div>

        {/* ── STEP 1: datos ── */}
        {(isEdit || step === 1) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(error || sendErr) && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
                {error || sendErr}
              </div>
            )}

            {/* Name */}
            <div className="adm-field">
              <label className="adm-label">Nombre completo</label>
              <input
                className="adm-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Carlos García"
                autoFocus
              />
            </div>

            {/* Phone — only on create */}
            {!isEdit && (
              <div className="adm-field">
                <label className="adm-label">Número celular</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ padding: '12px 14px', background: '#f5f5f5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#1a1a1a', flexShrink: 0 }}>+52</div>
                  <input
                    className="adm-input"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="55 1234 5678"
                    maxLength={10}
                  />
                </div>
                <p style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>
                  Se enviará un código de verificación por SMS
                </p>
              </div>
            )}

            {/* Role selector — only on create */}
            {!isEdit && (
              <div className="adm-field">
                <label className="adm-label">Rol de acceso</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { value: 'sub_admin',    label: 'Administrativo', desc: 'Dashboard · Reservas · Escáner' },
                    { value: 'sub_operator', label: 'Operador',       desc: 'Solo Reservas y Escáner' },
                  ] as const).map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      style={{
                        flex: 1, padding: '10px 12px',
                        border: `2px solid ${role === r.value ? '#1a1a1a' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: 10,
                        background: role === r.value ? '#1a1a1a' : '#fff',
                        color: role === r.value ? '#fff' : '#1a1a1a',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.65 }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active toggle — edit only */}
            {isEdit && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f9f9f9', borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Cuenta activa</div>
                  <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>
                    {isActive ? 'Puede acceder al panel' : 'Bloqueado temporalmente'}
                  </div>
                </div>
                <button
                  onClick={() => setIsActive(a => !a)}
                  style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: isActive ? '#1a1a1a' : '#ddd', position: 'relative', transition: 'background 0.2s' }}
                >
                  <span style={{ position: 'absolute', top: 3, left: isActive ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
              </div>
            )}

            {/* CTA */}
            <button
              className="adm-btn"
              disabled={!step1Ok || sending}
              onClick={() => isEdit ? onSave({ name: name.trim(), phone, isActive, role, otp: '' }) : handleSendOtp()}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', opacity: step1Ok && !sending ? 1 : 0.45, marginTop: 4 }}
            >
              {isEdit
                ? (saving ? 'Guardando…' : 'Guardar cambios')
                : (sending ? 'Enviando código…' : 'Enviar código de verificación →')}
            </button>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {!isEdit && step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Description */}
            <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                Código enviado al número
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginTop: 2, fontFamily: 'monospace' }}>
                {fmtDisplay(phone)}
              </div>
              {resent && (
                <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>✓ Código reenviado</div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
                {error}
              </div>
            )}

            {/* OTP input */}
            <div className="adm-field">
              <label className="adm-label">Código de 6 dígitos</label>
              <input
                ref={otpRef}
                className="adm-input"
                type="tel"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                style={{ fontSize: 26, letterSpacing: 12, textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            {/* Confirm button */}
            <button
              className="adm-btn"
              disabled={!step2Ok || saving}
              onClick={() => onSave({ name: name.trim(), phone, isActive: true, role, otp })}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', opacity: step2Ok && !saving ? 1 : 0.45 }}
            >
              {saving ? 'Creando usuario…' : 'Crear usuario'}
            </button>

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => { setStep(1); setOtp(''); setSendErr(''); }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#999', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                ← Cambiar número
              </button>
              <button
                onClick={() => handleSendOtp(true)}
                disabled={sending}
                style={{ background: 'none', border: 'none', fontSize: 13, color: sending ? '#bbb' : '#1a1a1a', cursor: sending ? 'default' : 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
              >
                {sending ? 'Enviando…' : 'Reenviar código'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function OperatorSettings({ token }: Props) {
  const [team,    setTeam]    = useState<SubOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<SubOperator | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [modalErr, setModalErr] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const activeCount = team.filter(s => s.is_active).length;

  const load = () => {
    setLoading(true);
    api.operator.listTeam(token)
      .then(d => setTeam((d as any).data || []))
      .catch(() => setTeam([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (data: { name: string; phone: string; isActive: boolean; role: string; otp: string }) => {
    setSaving(true); setModalErr('');
    try {
      await api.operator.createSubOperator(token, { name: data.name, phone: data.phone, role: data.role, otp: data.otp });
      setShowAdd(false);
      load();
    } catch (e: any) {
      setModalErr(e.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleEdit = async (data: { name: string; phone: string; isActive: boolean; role: string; otp: string }) => {
    if (!editing) return;
    setSaving(true); setModalErr('');
    try {
      await api.operator.updateSubOperator(token, editing.id, { name: data.name, isActive: data.isActive });
      setEditing(null);
      load();
    } catch (e: any) {
      setModalErr(e.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  // ── Quick toggle active ─────────────────────────────────────────────────────
  const toggleActive = async (sub: SubOperator) => {
    try {
      await api.operator.updateSubOperator(token, sub.id, { isActive: !sub.is_active });
      setTeam(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: !s.is_active } : s));
    } catch {}
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este operador? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      await api.operator.deleteSubOperator(token, id);
      setTeam(prev => prev.filter(s => s.id !== id));
    } catch {}
    finally { setDeleting(null); }
  };

  const fmtPhone = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    return d.length >= 10 ? `+52 ${d.slice(-10, -6)} ${d.slice(-6, -4)} ${d.slice(-4)}` : raw;
  };

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="adm-ph">
          <div>
            <h1 className="adm-pt">Configuración</h1>
            <p className="adm-ps">Gestión de sub-operadores de tu equipo</p>
          </div>
          <button className="adm-btn" onClick={() => { setShowAdd(true); setModalErr(''); }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Agregar operador
          </button>
        </div>

        {/* Summary card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Operadores activos', value: activeCount,           accent: '#D1FAE5' },
            { label: 'Total en equipo',    value: loading ? '…' : team.length, accent: '#DBEAFE' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -12, right: -12, width: 60, height: 60, borderRadius: '50%', background: c.accent, opacity: 0.25 }} />
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px', lineHeight: 1 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Team list */}
        <p className="adm-section-lbl">Equipo de operadores</p>

        {loading ? (
          <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon"><Loader2 className="animate-spin" /></div><div className="adm-empty-text">Cargando…</div></div></div>
        ) : team.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty">
              <div className="adm-empty-icon"><Users /></div>
              <div className="adm-empty-text">Sin operadores aún</div>
              <div style={{ fontSize: 12, color: '#bbb', marginTop: 6 }}>
                Agrega operadores para delegar el escáner y reservas
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {team.map(sub => (
              <div key={sub.id} className="sub-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                {/* Fila 1: avatar + nombre/teléfono/rol + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="sub-avatar">
                    {(sub.name || '?').charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sub.name || '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 12, color: '#bbb', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {fmtPhone(sub.phone)}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                        padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                        background: sub.role === 'sub_admin' ? '#EEF2FF' : '#F0FDF4',
                        color:      sub.role === 'sub_admin' ? '#4338CA' : '#166534',
                      }}>
                        {sub.role === 'sub_admin' ? 'Admin' : 'Operador'}
                      </span>
                    </div>
                  </div>

                  <span
                    className="adm-pill"
                    style={{
                      flexShrink: 0,
                      ...(sub.is_active
                        ? { background: '#D1FAE5', color: '#065F46' }
                        : { background: '#F3F4F6', color: '#6B7280' }),
                    }}
                  >
                    {sub.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Fila 2: acciones */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    className="sub-toggle"
                    style={{ background: sub.is_active ? '#1a1a1a' : '#ddd', marginRight: 'auto' }}
                    onClick={() => toggleActive(sub)}
                    title={sub.is_active ? 'Desactivar' : 'Activar'}
                  >
                    <span className="sub-toggle-knob" style={{ left: sub.is_active ? 20 : 2 }} />
                  </button>

                  <button
                    onClick={() => { setEditing(sub); setModalErr(''); }}
                    style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    title="Editar"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5 4.5 12H2v-2.5L9.5 2z" stroke="#666" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                  </button>

                  <button
                    onClick={() => handleDelete(sub.id)}
                    disabled={deleting === sub.id}
                    style={{ background: '#fef2f2', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: deleting === sub.id ? 0.5 : 1 }}
                    title="Eliminar"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2h4v1.5M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div style={{ marginTop: 24, background: '#f9f9f9', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 }}>
            Los usuarios <strong>Administrativos</strong> acceden al Dashboard, Reservas y Escáner.
            Los usuarios <strong>Operadores</strong> solo acceden a Reservas y Escáner.
            Ninguno puede ver Configuración ni Perfil del operador principal.
            Al desactivar una cuenta se bloquea el acceso inmediatamente.
          </p>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <SubOpModal
          onSave={handleCreate}
          onClose={() => setShowAdd(false)}
          saving={saving}
          error={modalErr}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <SubOpModal
          initial={editing}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
          saving={saving}
          error={modalErr}
        />
      )}
    </>
  );
}
