import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface Props { token: string; }

const STORAGE_KEY = 'pm_operator_profile';

const BANCOS = ['BBVA', 'Santander', 'Citibanamex', 'Banorte', 'HSBC', 'Scotiabank', 'Inbursa', 'Otro'];
const REGIMENES = ['Persona Física con Actividad Empresarial', 'Régimen Simplificado de Confianza', 'Persona Moral', 'Otro'];

// Declarado fuera de OperatorProfile: si vive dentro del componente, React lo
// recrea en cada render y desmonta/remonta el subárbol en cada tecleo,
// perdiendo el foco del input (y cerrando el teclado en móvil).
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="adm-tw" style={{ marginBottom: 16 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#bbb' }}>{title}</p>
      </div>
      <div style={{ padding: '18px 18px 6px' }}>{children}</div>
    </div>
  );
}

export default function OperatorProfile({ token }: Props) {
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const [form, setForm] = useState({
    name: '', email: '',
    rfc: '', razonSocial: '', domicilioFiscal: '', regimenFiscal: REGIMENES[0],
    clabe: '', banco: BANCOS[0], titular: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) try { setForm(f => ({ ...f, ...JSON.parse(stored) })); } catch {}

    // Try to decode name/phone from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      setForm(f => ({ ...f, phone: payload.phone || '' }));
    } catch {}
  }, [token]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      await api.operator.updateProfile(token, { name: form.name, email: form.email }).catch(() => {});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 560 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Mi Perfil</h1><p className="adm-ps">Datos personales, fiscales y bancarios</p></div>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
        {saved && <div style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#065F46', marginBottom: 16 }}>✓ Cambios guardados</div>}

        <Section title="Datos personales">
          <div className="adm-field"><label className="adm-label">Nombre completo</label><input className="adm-input" value={form.name} onChange={f('name')} placeholder="Carlos García" /></div>
          <div className="adm-field"><label className="adm-label">Correo electrónico</label><input className="adm-input" type="email" value={form.email} onChange={f('email')} placeholder="carlos@email.com" /></div>
        </Section>

        <Section title="Datos fiscales">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label className="adm-label">RFC</label>
              <input className="adm-input" value={form.rfc} onChange={f('rfc')} placeholder="GARC800101XXX" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} maxLength={13} />
            </div>
            <div className="adm-field">
              <label className="adm-label">Régimen fiscal</label>
              <select className="adm-input" value={form.regimenFiscal} onChange={f('regimenFiscal')}>
                {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="adm-field"><label className="adm-label">Razón social</label><input className="adm-input" value={form.razonSocial} onChange={f('razonSocial')} placeholder="Carlos García S.A. de C.V." /></div>
          <div className="adm-field"><label className="adm-label">Domicilio fiscal</label><input className="adm-input" value={form.domicilioFiscal} onChange={f('domicilioFiscal')} placeholder="Av. Principal 123, Col. Centro, CDMX, CP 06600" /></div>
        </Section>

        <Section title="Datos bancarios">
          <div className="adm-field">
            <label className="adm-label">CLABE interbancaria</label>
            <input className="adm-input" value={form.clabe} onChange={f('clabe')} placeholder="012 180 00123456 789 0" style={{ fontFamily: 'monospace', letterSpacing: 1 }} maxLength={18} />
            <p style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>18 dígitos · usada para recibir depósitos</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label className="adm-label">Banco</label>
              <select className="adm-input" value={form.banco} onChange={f('banco')}>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label className="adm-label">Nombre del titular</label>
              <input className="adm-input" value={form.titular} onChange={f('titular')} placeholder="Carlos García" />
            </div>
          </div>
        </Section>

        <button className="adm-btn" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </>
  );
}
