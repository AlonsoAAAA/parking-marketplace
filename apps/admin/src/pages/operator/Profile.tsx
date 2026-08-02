import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface Props { token: string; }

const STORAGE_KEY = 'pm_operator_profile';

const BANCOS = ['BBVA', 'Santander', 'Citibanamex', 'Banorte', 'HSBC', 'Scotiabank', 'Inbursa', 'Otro'];
// Catálogo oficial del SAT (c_RegimenFiscal, CFDI 4.0) — completo, sin "Otro".
const REGIMENES = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606 - Arrendamiento',
  '607 - Régimen de Enajenación o Adquisición de Bienes',
  '608 - Demás ingresos',
  '610 - Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611 - Ingresos por Dividendos (socios y accionistas)',
  '612 - Personas Físicas con Actividades Empresariales y Profesionales',
  '614 - Ingresos por intereses',
  '615 - Régimen de los ingresos por obtención de premios',
  '616 - Sin obligaciones fiscales',
  '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621 - Incorporación Fiscal',
  '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623 - Opcional para Grupos de Sociedades',
  '624 - Coordinados',
  '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626 - Régimen Simplificado de Confianza (RESICO)',
];

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
    rfc: '', razonSocial: '', regimenFiscal: REGIMENES[0],
    calle: '', cp: '', colonia: '', delegacion: '', ciudad: '', estado: '',
    clabe: '', banco: BANCOS[0], titular: '',
  });
  const [cpLoading, setCpLoading] = useState(false);
  const [cpNotFound, setCpNotFound] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) try { setForm(f => ({ ...f, ...JSON.parse(stored) })); } catch {}

    // Try to decode name/phone from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      setForm(f => ({ ...f, phone: payload.phone || '' }));
    } catch {}
  }, [token]);

  // Autocompleta delegación/municipio y estado al capturar un CP de 5 dígitos.
  // La colonia no se autocompleta: el servicio gratuito de CP que usamos
  // (zippopotam.us) da un solo lugar por CP, no el listado completo de
  // colonias — se captura a mano.
  useEffect(() => {
    const cp = form.cp;
    if (cp.length !== 5) { setCpNotFound(false); return; }
    let cancelled = false;
    setCpLoading(true); setCpNotFound(false);
    const t = setTimeout(() => {
      api.codigoPostal(cp)
        .then(res => {
          if (cancelled) return;
          if (res.data) {
            setForm(f => ({ ...f, delegacion: res.data!.municipio, ciudad: res.data!.ciudad, estado: res.data!.estado }));
          } else {
            setCpNotFound(true);
          }
        })
        .catch(() => { if (!cancelled) setCpNotFound(true); })
        .finally(() => { if (!cancelled) setCpLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.cp]);

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

          <div className="adm-field"><label className="adm-label">Calle y número</label><input className="adm-input" value={form.calle} onChange={f('calle')} placeholder="Av. Principal 123" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label className="adm-label">Código postal</label>
              <input
                className="adm-input"
                value={form.cp}
                onChange={e => setForm(p => ({ ...p, cp: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                placeholder="06600"
                inputMode="numeric"
                maxLength={5}
                style={{ fontFamily: 'monospace' }}
              />
              {cpLoading && <p style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>Buscando…</p>}
              {cpNotFound && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>CP no encontrado, captura manual</p>}
            </div>
            <div className="adm-field">
              <label className="adm-label">Colonia</label>
              <input className="adm-input" value={form.colonia} onChange={f('colonia')} placeholder="Centro" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="adm-field">
              <label className="adm-label">Delegación / Municipio</label>
              <input className="adm-input" value={form.delegacion} onChange={f('delegacion')} placeholder="Cuauhtémoc" />
            </div>
            <div className="adm-field">
              <label className="adm-label">Ciudad</label>
              <input className="adm-input" value={form.ciudad} onChange={f('ciudad')} placeholder="Ciudad de México" />
            </div>
          </div>

          <div className="adm-field"><label className="adm-label">Estado</label><input className="adm-input" value={form.estado} onChange={f('estado')} placeholder="Ciudad de México" /></div>
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
        {saved && (
          <div style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#065F46', marginTop: 12, textAlign: 'center', fontWeight: 600 }}>
            ✓ Datos guardados correctamente
          </div>
        )}
      </div>
    </>
  );
}
