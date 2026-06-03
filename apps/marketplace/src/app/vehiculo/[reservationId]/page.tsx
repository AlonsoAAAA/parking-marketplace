'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

const YEARS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => new Date().getFullYear() - i,
);

const COLORES = [
  'Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul',
  'Verde', 'Amarillo', 'Naranja', 'Café / Beige', 'Morado', 'Otro',
];

async function apiFetch(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  const url  = base ? `${base}${path}` : path;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function VehiclePage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const router = useRouter();

  const [plate,   setPlate]   = useState('');
  const [marca,   setMarca]   = useState('');
  const [modelo,  setModelo]  = useState('');
  const [version, setVersion] = useState('');
  const [year,    setYear]    = useState('');
  const [color,   setColor]   = useState('');

  const [marcas,    setMarcas]    = useState<string[]>([]);
  const [modelos,   setModelos]   = useState<{ nombre: string; tieneVersion: boolean }[]>([]);
  const [versiones, setVersiones] = useState<string[]>([]);

  const [precio,        setPrecio]        = useState<number | null>(null);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const tieneVersion = !!modelos.find(m => m.nombre === modelo)?.tieneVersion;

  // Carga marcas al montar
  useEffect(() => {
    setLoadingMarcas(true);
    apiFetch('/api/v1/vehiculos/marcas')
      .then(d => setMarcas(Array.isArray(d.marcas) ? d.marcas : []))
      .catch(() => setMarcas([]))
      .finally(() => setLoadingMarcas(false));
  }, []);

  // Modelos cuando cambia marca
  useEffect(() => {
    if (!marca) { setModelos([]); setModelo(''); setVersiones([]); setVersion(''); setPrecio(null); return; }
    setModelo(''); setVersiones([]); setVersion(''); setPrecio(null);
    apiFetch(`/api/v1/vehiculos/modelos?marca=${encodeURIComponent(marca)}`)
      .then(d => setModelos(Array.isArray(d.modelos) ? d.modelos : []))
      .catch(() => setModelos([]));
  }, [marca]);

  // Versiones cuando cambia modelo
  useEffect(() => {
    if (!modelo) { setVersiones([]); setVersion(''); setPrecio(null); return; }
    setPrecio(null);
    const info = modelos.find(m => m.nombre === modelo);
    if (!info?.tieneVersion) { setVersiones([]); setVersion(''); return; }
    apiFetch(`/api/v1/vehiculos/versiones?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`)
      .then(d => setVersiones(Array.isArray(d.versiones) ? d.versiones : []))
      .catch(() => setVersiones([]));
  }, [modelo]);

  // Precio preview
  const fetchPrecio = useCallback(() => {
    if (!marca || !modelo) return;
    if (tieneVersion && !version) return;
    const params = new URLSearchParams({ marca, modelo });
    if (version) params.set('version', version);
    apiFetch(`/api/v1/reservations/${reservationId}/pricing?${params}`)
      .then(d => setPrecio(typeof d.precio === 'number' ? d.precio : null))
      .catch(() => setPrecio(null));
  }, [marca, modelo, version, tieneVersion, reservationId]);

  useEffect(() => { fetchPrecio(); }, [fetchPrecio]);

  const plateClean = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const valid = plateClean.length >= 5 && marca && modelo && (!tieneVersion || version) && year && color;

  const handleSubmit = async () => {
    if (!valid) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? '') + `/api/v1/reservations/${reservationId}/vehicle`,
        {
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
        },
      );
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
        .vi  { width:100%; padding:13px 16px; background:#fff; border:1.5px solid rgba(0,0,0,0.1); border-radius:10px; font-size:14px; color:#1a1a1a; font-family:Inter,sans-serif; box-sizing:border-box; transition:border-color 0.2s; }
        .vi:focus  { outline:none; border-color:#1a1a1a; }
        .vi::placeholder { color:#ccc; }
        .vi:disabled { opacity:0.5; cursor:not-allowed; }
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

              {/* Marca */}
              <div>
                <div className="vl">Marca</div>
                <select
                  className="vi"
                  value={marca}
                  onChange={e => setMarca(e.target.value)}
                  disabled={loadingMarcas}
                >
                  <option value="">
                    {loadingMarcas ? 'Cargando marcas…' : `Selecciona una marca (${marcas.length})`}
                  </option>
                  {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Modelo */}
              <div>
                <div className="vl">Modelo</div>
                <select
                  className="vi"
                  value={modelo}
                  onChange={e => setModelo(e.target.value)}
                  disabled={!marca || modelos.length === 0}
                >
                  <option value="">
                    {!marca ? 'Primero elige una marca' : modelos.length === 0 ? 'Cargando…' : 'Selecciona un modelo'}
                  </option>
                  {modelos.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </div>

              {/* Versión */}
              {tieneVersion && (
                <div>
                  <div className="vl">Versión / Cabina</div>
                  <select className="vi" value={version} onChange={e => setVersion(e.target.value)}>
                    <option value="">Selecciona una versión</option>
                    {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              )}

              {/* Año y Color */}
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

              {/* Placas */}
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

            {precio !== null && (
              <div className="vprice">
                <span style={{ fontSize: 13, color: '#666' }}>Total a pagar</span>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
                  ${precio.toLocaleString('es-MX')}
                </span>
              </div>
            )}

            {error && <div className="pm-error" style={{ marginBottom: 16 }}>{error}</div>}

            <button className="pm-btn-primary" onClick={handleSubmit} disabled={loading || !valid}>
              {loading ? 'Guardando...' : 'Continuar al pago →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
