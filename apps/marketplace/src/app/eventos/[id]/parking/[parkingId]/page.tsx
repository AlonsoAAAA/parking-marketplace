'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Lock } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoButton, NeoSpinner, NeoInput, NeoLabel } from '@/components/ui/neo';

interface ParkingDetail {
  id: string; name: string; address: string;
  distanceMeters: number; walkMinutes: number; available: number; totalSlots: number;
  pricing: Record<string, number>;
}

interface PricingConfig {
  marginMin: number; marginMax: number;
  weightDistance: number; weightAnticipation: number; weightDemand: number;
}

// ─── Motor de precios (espejo del servicio) ───────────────────────────────────
const IVA = 0.16;
const MULT_MIN = { distance: 0.8, anticipation: 0.9, demand: 0.85 };
const MULT_MAX = { distance: 1.5, anticipation: 1.6, demand: 1.40 };
function lerp(x: number, x0: number, y0: number, x1: number, y1: number) {
  if (x <= x0) return y0; if (x >= x1) return y1;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
function distMult(km: number) {
  if (km <= 0.5) return 1.5;
  if (km <= 1.0) return lerp(km, 0.5, 1.5, 1.0, 1.2);
  if (km <= 2.0) return lerp(km, 1.0, 1.2, 2.0, 1.0);
  if (km <= 3.0) return lerp(km, 2.0, 1.0, 3.0, 0.8);
  return 0.8;
}
function antMult(h: number) {
  if (h <= 0)   return 1.6; if (h <= 6)   return lerp(h, 0, 1.6, 6, 1.3);
  if (h <= 24)  return lerp(h, 6, 1.3, 24, 1.1);
  if (h <= 72)  return lerp(h, 24, 1.1, 72, 1.0);
  if (h <= 168) return lerp(h, 72, 1.0, 168, 0.9);
  return 0.9;
}
function demMult(pct: number) {
  const p = Math.max(0, Math.min(100, pct));
  if (p <= 50) return lerp(p, 0, 0.85, 50, 1.0);
  if (p <= 80) return lerp(p, 50, 1.0, 80, 1.2);
  return lerp(p, 80, 1.2, 100, 1.4);
}
function computeFinalPrice(contractPrice: number, distKm: number, antHours: number, occupancy: number, cfg: PricingConfig) {
  const mDist = distMult(distKm), mAnt = antMult(antHours), mDem = demMult(occupancy);
  const { weightDistance: wd, weightAnticipation: wa, weightDemand: wdem, marginMin, marginMax } = cfg;
  const composite = wd * mDist + wa * mAnt + wdem * mDem;
  const compMin = wd * MULT_MIN.distance + wa * MULT_MIN.anticipation + wdem * MULT_MIN.demand;
  const compMax = wd * MULT_MAX.distance + wa * MULT_MAX.anticipation + wdem * MULT_MAX.demand;
  const score = compMax > compMin ? Math.max(0, Math.min(1, (composite - compMin) / (compMax - compMin))) : 0.5;
  const marginPct = marginMin + score * (marginMax - marginMin);
  const basePrice = +(contractPrice * (1 + marginPct / 100)).toFixed(2);
  const ivaAmount = +(basePrice * IVA).toFixed(2);
  const finalPrice = Math.round(basePrice + ivaAmount);
  return { finalPrice, basePrice, ivaAmount, marginPct: +marginPct.toFixed(1) };
}
interface EventInfo {
  id: string; name: string; venueName: string; startsAt: string; category?: string;
}

type VehicleCategory = 'auto' | 'suv_camioneta' | 'pickup' | 'moto';

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  auto: 'Auto', suv_camioneta: 'SUV / Camioneta', pickup: 'Pick Up', moto: 'Moto',
};
const CATEGORY_ICONS: Record<VehicleCategory, string> = {
  auto: '🚗', suv_camioneta: '🚙', pickup: '🛻', moto: '🏍️',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
async function apiFetch(path: string) {
  const url = API_BASE ? `${API_BASE}${path}` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ParkingDetailPage() {
  const { id: eventId, parkingId } = useParams<{ id: string; parkingId: string }>();
  const router = useRouter();

  const [parking,  setParking]  = useState<ParkingDetail | null>(null);
  const [event,    setEvent]    = useState<EventInfo | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error,    setError]    = useState('');

  // Cascading selects
  const [marca,   setMarca]   = useState('');
  const [modelo,  setModelo]  = useState('');
  const [version, setVersion] = useState('');
  const [marcas,  setMarcas]  = useState<string[]>([]);
  const [modelos, setModelos] = useState<{ nombre: string; tieneVersion: boolean }[]>([]);
  const [versiones, setVersiones] = useState<string[]>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [categoria, setCategoria] = useState<VehicleCategory | null>(null);
  const [pricingCfg, setPricingCfg] = useState<PricingConfig>({
    marginMin: 15, marginMax: 60, weightDistance: 0.40, weightAnticipation: 0.35, weightDemand: 0.25,
  });

  // Other form fields
  const [plate, setPlate] = useState('');
  const [name,  setName]  = useState('');

  const pendingSubmit = useRef(false);
  const PENDING_KEY   = `pm_pending_${eventId}_${parkingId}`;

  const tieneVersion = !!modelos.find(m => m.nombre === modelo)?.tieneVersion;

  // ── Load event + parking ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiFetch(`/api/v1/events/${eventId}`),
      apiFetch(`/api/v1/events/${eventId}/parkings`),
    ]).then(([ed, pd]) => {
      setEvent(ed.data);
      const pk = (pd.data as ParkingDetail[]).find(p => p.id === parkingId);
      setParking(pk ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [eventId, parkingId]);

  // ── Load pricing config ────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch('/api/v1/pricing-config')
      .then(d => { if (d.data) setPricingCfg(d.data); })
      .catch(() => {});
  }, []);

  // ── Load marcas on mount ───────────────────────────────────────────────────
  useEffect(() => {
    setLoadingMarcas(true);
    apiFetch('/api/v1/vehiculos/marcas')
      .then(d => setMarcas(Array.isArray(d.marcas) ? d.marcas : []))
      .catch(() => setMarcas([]))
      .finally(() => setLoadingMarcas(false));
  }, []);

  // ── Load modelos when marca changes ────────────────────────────────────────
  useEffect(() => {
    if (!marca) { setModelos([]); setModelo(''); setVersiones([]); setVersion(''); setCategoria(null); return; }
    setModelo(''); setVersiones([]); setVersion(''); setCategoria(null);
    apiFetch(`/api/v1/vehiculos/modelos?marca=${encodeURIComponent(marca)}`)
      .then(d => setModelos(Array.isArray(d.modelos) ? d.modelos : []))
      .catch(() => setModelos([]));
  }, [marca]);

  // ── Load versiones when modelo changes ────────────────────────────────────
  useEffect(() => {
    if (!modelo) { setVersiones([]); setVersion(''); setCategoria(null); return; }
    setCategoria(null);
    const info = modelos.find(m => m.nombre === modelo);
    if (!info?.tieneVersion) {
      setVersiones([]); setVersion('');
      return;
    }
    apiFetch(`/api/v1/vehiculos/versiones?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`)
      .then(d => setVersiones(Array.isArray(d.versiones) ? d.versiones : []))
      .catch(() => setVersiones([]));
  }, [modelo]);

  // ── Fetch categoria for price display ─────────────────────────────────────
  const fetchCategoria = useCallback(() => {
    if (!marca || !modelo) return;
    if (tieneVersion && !version) return;
    apiFetch(`/api/v1/vehiculos/buscar?q=${encodeURIComponent(modelo)}&categories=auto,suv_camioneta,pickup,moto`)
      .then((d: { data: Array<{ make: string; model: string; category: VehicleCategory }> }) => {
        const match = d.data?.find(m => m.make === marca && m.model === modelo);
        setCategoria(match?.category ?? null);
      })
      .catch(() => setCategoria(null));
  }, [marca, modelo, version, tieneVersion]);

  useEffect(() => { fetchCategoria(); }, [fetchCategoria]);

  // ── Restaurar formulario + pre-fill nombre ─────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = sessionStorage.getItem(PENDING_KEY);
    if (saved) {
      sessionStorage.removeItem(PENDING_KEY);
      try {
        const { marca: m, modelo: mo, version: v, plate: p, name: n } = JSON.parse(saved);
        if (m)  setMarca(m);
        if (mo) setModelo(mo);
        if (v)  setVersion(v);
        if (p)  setPlate(p);
        if (n)  setName(n);
        if (token) pendingSubmit.current = true;
      } catch {}
      return;
    }
    if (!token) return;
    apiFetch('/api/v1/users/me').then(d => {
      if (d.data?.name) setName(d.data.name);
    }).catch(() => {});
  }, []);

  // ── Auto-disparar tras login redirect ──────────────────────────────────────
  useEffect(() => {
    if (!pendingSubmit.current) return;
    if (!marca || !modelo || plate.trim().length < 3 || name.trim().length < 2) return;
    pendingSubmit.current = false;
    handleReserve();
  }, [marca, modelo, plate, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReserve = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ marca, modelo, version, plate, name }));
      router.push(`/login?next=/eventos/${eventId}/parking/${parkingId}`);
      return;
    }
    if (!parking || !marca || !modelo || plate.trim().length < 3 || !name.trim()) return;

    setReserving(true); setError('');
    try {
      // 1 — Crear reservación
      const res1 = await fetch(`${API_BASE}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: String(eventId), parkingId: String(parkingId) }),
      });
      const data1 = await res1.json();
      if (!res1.ok) { setError(data1.message || 'Sin lugares disponibles'); return; }
      const reservationId = data1.reservation.id;

      // 2 — Guardar vehículo
      const res2 = await fetch(`${API_BASE}/api/v1/reservations/${reservationId}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plate:   plate.trim().toUpperCase(),
          make:    marca,
          model:   modelo,
          version: version || undefined,
        }),
      });
      if (!res2.ok) {
        const d2 = await res2.json().catch(() => ({}));
        setError(d2.message || 'No se pudo guardar el vehículo. Intenta de nuevo.');
        return;
      }

      // 3 — Actualizar nombre (fire and forget)
      fetch(`${API_BASE}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      }).catch(() => {});

      router.push(`/checkout/${reservationId}`);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setReserving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="back" />
      <NeoSpinner label="Cargando..." />
    </div>
  );
  if (!parking || !event) return null;

  const contractPrice = categoria ? (parking.pricing[categoria] ?? null) : null;
  const priceCalc = contractPrice !== null && parking && event
    ? computeFinalPrice(
        contractPrice,
        parking.distanceMeters / 1000,
        (new Date(event.startsAt).getTime() - Date.now()) / 3_600_000,
        parking.totalSlots > 0 ? (1 - parking.available / parking.totalSlots) * 100 : 50,
        pricingCfg,
      )
    : null;
  const price      = priceCalc?.finalPrice ?? null;  // alias para compatibilidad
  const soldOut    = parking.available === 0;
  const vehiculoOk = !!marca && !!modelo && (!tieneVersion || !!version);
  const canReserve = vehiculoOk && plate.trim().length >= 3 && name.trim().length >= 2 && !soldOut && !reserving;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs';

  const selectClass =
    'w-full bg-white border-[3px] border-on-surface rounded-xl px-4 py-3.5 font-sans font-semibold text-sm text-on-surface focus:outline-none focus:neo-brutal-shadow transition-shadow appearance-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  const sectionHead = (
    label: string,
  ) => (
    <div className="bg-on-surface px-4 py-2.5 border-b-[3px] border-on-surface">
      <span className="font-extrabold text-[10px] tracking-[3px] uppercase text-primary-container">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans pb-32 lg:pb-12">
      <NeoHeader back="back" />

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-8 pb-2">
        <p className="font-extrabold text-[10px] tracking-[2px] uppercase text-on-surface-variant mb-2">Estacionamiento</p>
        <h1 className="font-extrabold text-2xl md:text-3xl uppercase tracking-tight text-on-surface">{parking.name}</h1>
        <div className="flex items-center gap-1.5 mt-2 text-on-surface-variant">
          <MapPin className="w-4 h-4" strokeWidth={2.5} />
          <span className="text-sm font-semibold">{parking.address}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start flex flex-col gap-4">

        {/* Columna izquierda */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden">
            {sectionHead('Detalle de reservación')}
            <div className="px-4">
              {[
                ['Evento',      event.name],
                ['Venue',       event.venueName],
                ['Fecha',       fmtDate(event.startsAt)],
                ['Hora',        fmtTime(event.startsAt)],
                ['Distancia',   `${parking.distanceMeters} m · ${parking.walkMinutes} min caminando`],
                ['Disponibles', `${parking.available} lugares`],
              ].map(([l, v], i, arr) => (
                <div key={l} className={`flex justify-between gap-4 py-3 text-[13px] ${i < arr.length - 1 ? 'border-b-2 border-dashed border-on-surface/10' : ''}`}>
                  <span className="font-extrabold text-[10px] uppercase tracking-widest text-on-surface-variant pt-0.5 flex-shrink-0">{l}</span>
                  <span className="font-semibold text-on-surface text-right max-w-[60%] capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden">
            {sectionHead('Incluye')}
            <div className="px-4">
              {[
                'Lugar garantizado para tu vehículo',
                'Código QR de acceso único',
                'Boleto enviado por WhatsApp',
                'Sin cobros adicionales al llegar',
              ].map((item, i, arr) => (
                <div key={item} className={`flex items-center gap-3 py-3 text-[13px] font-semibold text-on-surface ${i < arr.length - 1 ? 'border-b-2 border-dashed border-on-surface/10' : ''}`}>
                  <div className="w-5 h-5 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3 5.5L8 1" stroke="#191c1d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden">
            {sectionHead('Tu vehículo y datos')}
            <div className="p-4 flex flex-col gap-4">

              {/* Marca */}
              <div>
                <NeoLabel>Marca</NeoLabel>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={marca}
                    onChange={e => setMarca(e.target.value)}
                    disabled={loadingMarcas}
                  >
                    <option value="">
                      {loadingMarcas ? 'Cargando marcas…' : 'Selecciona una marca'}
                    </option>
                    {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-on-surface" />
                </div>
              </div>

              {/* Modelo */}
              <div>
                <NeoLabel>Modelo</NeoLabel>
                <div className="relative">
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
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-on-surface" />
                </div>
              </div>

              {/* Versión — solo si aplica */}
              {tieneVersion && (
                <div>
                  <NeoLabel>Versión / Cabina</NeoLabel>
                  <div className="relative">
                    <select
                      className={selectClass}
                      value={version}
                      onChange={e => setVersion(e.target.value)}
                    >
                      <option value="">Selecciona una versión</option>
                      {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-on-surface" />
                  </div>
                </div>
              )}

              {/* Precio del vehículo seleccionado — con desglose IVA */}
              {priceCalc !== null && categoria && (
                <div className="border-[3px] border-on-surface rounded-xl overflow-hidden neo-brutal-shadow-sm">
                  <div className="px-3.5 py-2 bg-on-surface flex items-center justify-between">
                    <span className="font-extrabold text-[11px] tracking-widest text-primary-container">
                      {CATEGORY_ICONS[categoria]} {CATEGORY_LABELS[categoria].toUpperCase()}
                    </span>
                  </div>
                  <div className="px-3.5 py-2.5 flex flex-col gap-1 bg-white">
                    <div className="flex justify-between font-mono text-xs font-bold text-on-surface-variant">
                      <span>Subtotal</span>
                      <span>${priceCalc.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-xs font-bold text-on-surface-variant">
                      <span>IVA 16%</span>
                      <span>+${priceCalc.ivaAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-mono text-base font-bold text-on-surface border-t-2 border-dashed border-on-surface/20 pt-1.5 mt-1">
                      <span>Total</span>
                      <span>${priceCalc.finalPrice} MXN</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Placas */}
              <div>
                <NeoLabel>Placas del vehículo</NeoLabel>
                <NeoInput
                  className="font-mono uppercase tracking-[3px] font-bold text-base"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').slice(0, 10))}
                  placeholder="ABC 123 D"
                  autoComplete="off"
                />
              </div>

              {/* Nombre */}
              <div>
                <NeoLabel>Nombre del titular</NeoLabel>
                <NeoInput
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                />
              </div>

            </div>
          </div>

          {error && <div className="bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}

          {/* CTA desktop */}
          <div className="hidden lg:flex items-center justify-between gap-4 bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-5">
            {priceCalc !== null ? (
              <div>
                <div className="font-mono font-bold text-2xl text-on-surface">
                  ${priceCalc.finalPrice} <span className="text-xs text-on-surface-variant">MXN</span>
                </div>
                <div className="font-mono text-[10px] font-bold text-on-surface-variant mt-0.5">
                  {categoria ? `${CATEGORY_ICONS[categoria]} · IVA incluido` : ''}
                </div>
              </div>
            ) : (
              <div className="text-[13px] font-semibold text-on-surface-variant">Completa los datos</div>
            )}
            <NeoButton className="min-w-[160px]" disabled={!canReserve} onClick={handleReserve}>
              {reserving
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin inline-block" />
                    Reservando...
                  </span>
                : soldOut ? 'Agotado' : <><Lock className="w-4 h-4" strokeWidth={2.5} /> Reservar y pagar</>}
            </NeoButton>
          </div>
        </div>

      </div>

      {/* CTA fija móvil */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t-[3px] border-on-surface px-5 py-4 pb-[calc(16px+env(safe-area-inset-bottom))] flex items-center justify-between gap-4 z-50 lg:hidden">
        {price !== null ? (
          <div>
            <div className="font-mono font-bold text-2xl text-on-surface">
              ${price} <span className="text-xs text-on-surface-variant">MXN</span>
            </div>
            <div className="font-mono text-[10px] font-bold text-on-surface-variant mt-0.5">
              {categoria ? `${CATEGORY_ICONS[categoria]} ${marca} ${modelo}` : ''}
            </div>
          </div>
        ) : (
          <div className="text-[13px] font-semibold text-on-surface-variant">Completa los datos</div>
        )}
        <NeoButton className="min-w-[150px] flex-shrink-0" disabled={!canReserve} onClick={handleReserve}>
          {reserving
            ? <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin inline-block" />
                Reservando...
              </span>
            : soldOut ? 'Agotado' : <><Lock className="w-4 h-4" strokeWidth={2.5} /> Reservar y pagar</>}
        </NeoButton>
      </div>
    </div>
  );
}
