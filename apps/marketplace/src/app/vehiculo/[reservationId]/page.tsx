'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Car } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoButton, NeoInput, NeoLabel } from '@/components/ui/neo';

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

  const selectClass =
    'w-full bg-white border-[3px] border-on-surface rounded-xl px-4 py-3.5 font-sans font-semibold text-sm text-on-surface focus:outline-none focus:neo-brutal-shadow transition-shadow appearance-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <NeoHeader showTickets={false} />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 z-0" />

        <div className="relative z-10 w-full max-w-lg bg-white border-[3px] border-on-surface rounded-xl neo-shadow-lg p-7 md:p-10 [animation:fadeUp_.4s_ease_both]">
          <div className="w-12 h-12 rounded-lg bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-5">
            <Car className="w-6 h-6 text-primary fill-current" />
          </div>
          <h1 className="font-extrabold text-xl md:text-2xl uppercase tracking-tight text-on-surface mb-1.5">Datos de tu vehículo</h1>
          <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed mb-7">
            Los necesitamos para facilitar tu entrada al estacionamiento.
          </p>

          <div className="flex flex-col gap-4 mb-6">

            {/* Marca */}
            <div>
              <NeoLabel>Marca</NeoLabel>
              <select
                className={selectClass}
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
              <NeoLabel>Modelo</NeoLabel>
              <select
                className={selectClass}
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
                <NeoLabel>Versión / Cabina</NeoLabel>
                <select className={selectClass} value={version} onChange={e => setVersion(e.target.value)}>
                  <option value="">Selecciona una versión</option>
                  {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {/* Año y Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <NeoLabel>Año</NeoLabel>
                <select className={selectClass} value={year} onChange={e => setYear(e.target.value)}>
                  <option value="">Año</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <NeoLabel>Color</NeoLabel>
                <select className={selectClass} value={color} onChange={e => setColor(e.target.value)}>
                  <option value="">Color</option>
                  {COLORES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Placas */}
            <div>
              <NeoLabel>Placas</NeoLabel>
              <NeoInput
                className="font-mono uppercase tracking-[3px] font-bold text-base"
                value={plate}
                onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC 123 D"
                maxLength={10}
              />
            </div>
          </div>

          {precio !== null && (
            <div className="flex justify-between items-center bg-primary-container border-[3px] border-on-surface rounded-xl px-4 py-3 mb-4 neo-brutal-shadow-sm">
              <span className="font-extrabold text-[11px] uppercase tracking-widest text-on-surface">Total a pagar</span>
              <span className="font-mono font-bold text-xl text-on-surface">
                ${precio.toLocaleString('es-MX')}
              </span>
            </div>
          )}

          {error && <div className="mb-4 bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}

          <NeoButton className="w-full" onClick={handleSubmit} disabled={loading || !valid}>
            {loading ? 'Guardando...' : 'Continuar al pago →'}
          </NeoButton>
        </div>
      </div>
    </div>
  );
}
