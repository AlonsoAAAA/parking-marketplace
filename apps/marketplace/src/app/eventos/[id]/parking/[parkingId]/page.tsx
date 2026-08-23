'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface ParkingDetail {
  id: string; name: string; address: string;
  distanceMeters: number; walkMinutes: number; available: number; totalSlots: number;
  pricing: Record<string, number>;
}

interface PricingConfig {
  mode: 'fixed' | 'dynamic'; fixedMarginPct: number;
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
  if (cfg.mode === 'fixed') {
    const basePrice = +(contractPrice * (1 + cfg.fixedMarginPct / 100)).toFixed(2);
    const ivaAmount = +(basePrice * IVA).toFixed(2);
    const finalPrice = Math.round(basePrice + ivaAmount);
    return { finalPrice, basePrice, ivaAmount, marginPct: +cfg.fixedMarginPct.toFixed(1) };
  }
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
async function apiFetch(path: string) {
  const url = API_BASE ? `${API_BASE}${path}` : path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const selectClass =
  'w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-mono text-slate-400 uppercase';

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ParkingDetailPage() {
  const { id: eventId, parkingId } = useParams<{ id: string; parkingId: string }>();
  const router = useRouter();

  const [parking,  setParking]  = useState<ParkingDetail | null>(null);
  const [event,    setEvent]    = useState<EventInfo | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error,    setError]    = useState('');

  const [marca,   setMarca]   = useState('');
  const [modelo,  setModelo]  = useState('');
  const [version, setVersion] = useState('');
  const [marcas,  setMarcas]  = useState<string[]>([]);
  const [modelos, setModelos] = useState<{ nombre: string; tieneVersion: boolean }[]>([]);
  const [versiones, setVersiones] = useState<string[]>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [categoria, setCategoria] = useState<VehicleCategory | null>(null);
  const [pricingCfg, setPricingCfg] = useState<PricingConfig>({
    mode: 'fixed', fixedMarginPct: 30,
    marginMin: 15, marginMax: 60, weightDistance: 0.40, weightAnticipation: 0.35, weightDemand: 0.25,
  });

  const [plate, setPlate] = useState('');
  const [name,  setName]  = useState('');

  const pendingSubmit = useRef(false);
  const PENDING_KEY   = `pm_pending_${eventId}_${parkingId}`;

  const tieneVersion = !!modelos.find(m => m.nombre === modelo)?.tieneVersion;

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

  useEffect(() => {
    apiFetch('/api/v1/pricing-config')
      .then(d => { if (d.data) setPricingCfg(d.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingMarcas(true);
    apiFetch('/api/v1/vehiculos/marcas')
      .then(d => setMarcas(Array.isArray(d.marcas) ? d.marcas : []))
      .catch(() => setMarcas([]))
      .finally(() => setLoadingMarcas(false));
  }, []);

  useEffect(() => {
    if (!marca) { setModelos([]); setModelo(''); setVersiones([]); setVersion(''); setCategoria(null); return; }
    setModelo(''); setVersiones([]); setVersion(''); setCategoria(null);
    apiFetch(`/api/v1/vehiculos/modelos?marca=${encodeURIComponent(marca)}`)
      .then(d => setModelos(Array.isArray(d.modelos) ? d.modelos : []))
      .catch(() => setModelos([]));
  }, [marca]);

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
      const res1 = await fetch(`${API_BASE}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: String(eventId), parkingId: String(parkingId) }),
      });
      const data1 = await res1.json();
      if (!res1.ok) { setError(data1.message || 'Sin lugares disponibles'); return; }
      const reservationId = data1.reservation.id;

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
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#04210f] rounded-full animate-spin" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Cargando...</p>
      </div>
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
  const soldOut    = parking.available === 0;
  const vehiculoOk = !!marca && !!modelo && (!tieneVersion || !!version);
  const canReserve = vehiculoOk && plate.trim().length >= 3 && name.trim().length >= 2 && !soldOut && !reserving;

  return (
    <div className="bg-background min-h-screen py-10 px-6 font-sans">
      <Navbar back="back" showExplore={false} />

      <div className="max-w-xl mx-auto space-y-6 pt-24 pb-32">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight">Datos del vehículo</h1>
          <p className="text-slate-500 text-sm">
            Reservando en <strong>{parking.name}</strong> para <strong>{event.name}</strong>
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6">
          <div className="space-y-6">
            {/* Marca / Modelo / Versión */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>Marca</label>
                <select className={selectClass} value={marca} onChange={e => setMarca(e.target.value)} disabled={loadingMarcas}>
                  <option value="">{loadingMarcas ? 'Cargando…' : 'Selecciona'}</option>
                  {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Modelo</label>
                <select className={selectClass} value={modelo} onChange={e => setModelo(e.target.value)} disabled={!marca || modelos.length === 0}>
                  <option value="">{!marca ? 'Elige marca' : modelos.length === 0 ? 'Cargando…' : 'Selecciona'}</option>
                  {modelos.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Versión</label>
                <select className={selectClass} value={version} onChange={e => setVersion(e.target.value)} disabled={!tieneVersion}>
                  <option value="">{tieneVersion ? 'Selecciona' : '—'}</option>
                  {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1">
              <label className={labelClass}>Nombre completo del titular</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className={selectClass} placeholder="Juan Pérez García"
              />
            </div>

            {/* Placas estilo placa mexicana */}
            <div className="space-y-2">
              <label className={`${labelClass} text-center block`}>Placas de circulación</label>
              <div className="relative max-w-[280px] mx-auto bg-white border-[4px] border-slate-800 rounded-xl px-4 py-3 shadow-md flex flex-col items-center select-none overflow-hidden">
                <div className="w-full text-center border-b border-slate-200 pb-1 flex justify-between items-center px-1 text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  <span>MÉXICO</span>
                  <span>CDMX</span>
                </div>
                <input
                  type="text" required maxLength={10} placeholder="ABC-123-A"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').slice(0, 10))}
                  className="w-full bg-transparent text-center font-mono text-2xl font-black tracking-widest text-slate-800 uppercase py-2 focus:outline-none"
                />
                <div className="w-full text-center text-[7px] font-mono text-slate-400 tracking-wider pt-1 border-t border-slate-100">
                  TRASERO / DELANTERO
                </div>
              </div>
              <p className="text-center text-xs font-bold text-slate-600">Ingresa tal como aparece en la tarjeta de circulación.</p>
            </div>

            {error && (
              <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>
            )}

            {/* Desglose de precio */}
            {priceCalc !== null && categoria ? (
              <div className="bg-[#F0F5F1] border border-[#E0EAE2] rounded-2xl p-5 space-y-3.5 shadow-inner">
                <div className="flex justify-between text-xs text-emerald-800 font-semibold border-b border-emerald-900/10 pb-2">
                  <span>Servicio de reservación ({CATEGORY_LABELS[categoria]})</span>
                  <span>{parking.name}</span>
                </div>
                <div className="space-y-2 text-xs font-mono text-slate-600">
                  <div className="flex justify-between"><span>Subtotal:</span><span>${priceCalc.basePrice.toFixed(2)} MXN</span></div>
                  <div className="flex justify-between"><span>IVA (16%):</span><span>${priceCalc.ivaAmount.toFixed(2)} MXN</span></div>
                </div>
                <div className="flex justify-between items-center text-sm font-mono font-black text-emerald-950 border-t border-emerald-900/15 pt-3.5">
                  <span className="uppercase text-xs tracking-wider">Total:</span>
                  <span className="text-base">${priceCalc.finalPrice} MXN</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center text-xs text-slate-400">
                Completa marca, modelo{tieneVersion ? ' y versión' : ''} para ver el precio.
              </div>
            )}

            <button
              type="button"
              onClick={handleReserve}
              disabled={!canReserve}
              className="w-full bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {reserving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Reservando...
                </span>
              ) : soldOut ? 'Agotado' : (
                <><Lock className="w-4 h-4" /><span>Reservar y pagar</span></>
              )}
            </button>
          </div>

          <div className="flex justify-center items-center gap-2 text-slate-400 text-[11px] pt-2 border-t border-slate-50">
            <Shield className="w-3.5 h-3.5 text-[#383497]" />
            <span>Tus datos de vehículo están 100% encriptados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
