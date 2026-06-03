'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const YEARS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => new Date().getFullYear() - i,
);

const COLORES = [
  'Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul',
  'Verde', 'Amarillo', 'Naranja', 'Café / Beige', 'Morado', 'Otro',
];

export default function VehiclePage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const router = useRouter();

  // ── Datos del formulario ─────────────────────────────────────────────────
  const [plate,   setPlate]   = useState('');
  const [marca,   setMarca]   = useState('');
  const [modelo,  setModelo]  = useState('');
  const [version, setVersion] = useState('');
  const [year,    setYear]    = useState('');
  const [color,   setColor]   = useState('');

  // ── Catálogos ────────────────────────────────────────────────────────────
  const [marcas,    setMarcas]    = useState<string[]>([]);
  const [modelos,   setModelos]   = useState<{ nombre: string; tieneVersion: boolean }[]>([]);
  const [versiones, setVersiones] = useState<string[]>([]);

  // ── Precio y estado ──────────────────────────────────────────────────────
  const [precio,  setPrecio]  = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const tieneVersion = !!modelos.find(m => m.nombre === modelo)?.tieneVersion;

  // ── Carga inicial de marcas ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/v1/vehiculos/marcas`)
      .then(r => r.json())
      .then(d => setMarcas(d.marcas ?? []))
      .catch(() => {});
  }, []);

  // ── Modelos cuando cambia la marca ───────────────────────────────────────
  useEffect(() => {
    if (!marca) { setModelos([]); setModelo(''); setVersiones([]); setVersion(''); setPrecio(null); return; }
    fetch(`${API}/api/v1/vehiculos/modelos?marca=${encodeURIComponent(marca)}`)
      .then(r => r.json())
      .then(d => setModelos(d.modelos ?? []))
      .catch(() => setModelos([]));
    setModelo(''); setVersiones([]); setVersion(''); setPrecio(null);
  }, [marca]);

  // ── Versiones cuando cambia el modelo ───────────────────────────────────
  useEffect(() => {
    if (!modelo) { setVersiones([]); setVersion(''); setPrecio(null); return; }
    const info = modelos.find(m => m.nombre === modelo);
    if (info?.tieneVersion) {
      fetch(`${API}/api/v1/vehiculos/versiones?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`)
        .then(r => r.json())
        .then(d => setVersiones(d.versiones ?? []))
        .catch(() => setVersiones([]));
    } else {
      setVersiones([]);
      setVersion('');
    }
    setPrecio(null);
  }, [modelo]);

  // ── Precio preview cuando el vehículo está listo ────────────────────────
  const fetchPrecio = useCallback(() => {
    if (!marca || !modelo) return;
    if (tieneVersion && !version) return;

    const params = new URLSearchParams({ marca, modelo });
    if (version) params.set('version', version);

    fetch(`${API}/api/v1/reservations/${reservationId}/pricing?${params}`)
      .then(r => r.json())
      .then(d => setPrecio(d.precio ?? null))
      .catch(() => {});
  }, [marca, modelo, version, tieneVersion, reservationId]);

  useEffect(() => { fetchPrecio(); }, [fetchPrecio]);

  // ── Validación ───────────────────────────────────────────────────────────
  const plateClean = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const valid =
    plateClean.length >= 5 &&
    marca && modelo &&
    (!tieneVersion || version) &&
    year && color;

  // ── Envío ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!valid) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/v1/reservations/${reservationId}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plate:   plateClean,
          make:    marca,
          model:   modelo,
          version: version || undefined,
          year:    parseInt(year),
          color,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.message || 'Error al guardar'); return; }
      router.push(`/checkout/${reservationId}`);
    } catch { setError('Error de conexión.'); } finally { setLoading(false); }
  };

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .vw  { min-height:100vh; background:#EDEDED; display:flex; flex-direction:column; }
        .vb  { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; }
        .vc  { width:100%; max-width:460px; background:#fff; border-radius:20px; padding:32px 28px; animation:fadeUp 0.4s ease both; }
        .vh1 { font-size:22px; font-weight:700; letter-spacing:-0.4px; color:#1a1a1a; margin-bottom:6px; }
        .vsub{ font-size:13px; color:#999; margin-bottom:28px; line-height:1.55; }
        .vl  { font-size:11px; font-weight:600; color:#888; margin-bottom:6px; letter-spacing:0.5px; text-transform:uppercase; }
        .vi  { width:100%; padding:13px 16px; background:#fff; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:14px; color:#1a1a1a; font-family:Inter,sans-serif; box-sizing:border-box; transition:border-color 0.2s; -webkit-appearance:none; }
        .vi:focus  { outline:none; border-color:#1a1a1a; }
        .vi::placeholder { color:#ccc; }
        .vg  { display:flex; flex-direction:column; gap:16px; margin-bottom:24px; }
        .vrow{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .vplate { text-transform:uppercase; letter-spacing:3px; font-weight:700; font-size:16px; }
        .vprice{ background:#f5f5f5; border-radius:10px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; }
        @media(min-width:1024px){ .vc { max-width:520px; padding:44px 40px; border-radius:24px; box-shadow:0 4px 40px rgba(0,0,0,.08); } }
      `}</style>

      <div className="vw">
        <header className="pm-header">
          <Link href="/" className="pm-logo">Park<span>MX</span></Link>
        </header>

        <div className="vb">
          <div className="vc">
            <span style={{ fontSize: 36, display: 'block', marginBottom: 16 }}>🚗</span>
            <h1 className="vh1">Datos de tu vehículo</h1>
            <p className="vsub">Los necesitamos para facilitar tu entrada al estacionamiento.</p>

            <div className="vg">

              {/* ── Marca ── */}
              <div>
                <div className="vl">Marca</div>
                <select className="vi" value={marca} onChange={e => setMarca(e.target.value)}>
                  <option value="">Selecciona una marca</option>
                  {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* ── Modelo ── */}
              <div>
                <div className="vl">Modelo</div>
                <select className="vi" value={modelo} onChange={e => setModelo(e.target.value)} disabled={!marca}>
                  <option value="">Selecciona un modelo</option>
                  {modelos.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </div>

              {/* ── Versión (solo cuando aplica) ── */}
              {tieneVersion && (
                <div>
                  <div className="vl">Versión / Cabina</div>
                  <select className="vi" value={version} onChange={e => setVersion(e.target.value)} disabled={!modelo}>
                    <option value="">Selecciona una versión</option>
                    {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              {/* ── Año y Color ── */}
              <div className="vrow">
                <div>
                  <div className="vl">Año</div>
                  <select className="vi" value={year} onChange={e => setYear(e.target.value)}>
                    <option value="">Año</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <div className="vl">Color</div>
                  <select className="vi" value={color} onChange={e => setColor(e.target.value)}>
                    <option value="">Color</option>
                    {COLORES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Placas ── */}
              <div>
                <div className="vl">Placas</div>
                <input
                  className="vi vplate"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC 123 D"
                  maxLength={10}
                />
              </div>
            </div>

            {/* ── Precio preview ── */}
            {precio !== null && (
              <div className="vprice">
                <span style={{ fontSize: 13, color: '#666' }}>Total a pagar</span>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
                  ${precio.toLocaleString('es-MX')}
                </span>
              </div>
            )}

            {error && <div className="pm-error" style={{ marginBottom: 16 }}>{error}</div>}

            <button
              className="pm-btn-primary"
              onClick={handleSubmit}
              disabled={loading || !valid}
            >
              {loading ? 'Guardando...' : 'Continuar al pago →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
