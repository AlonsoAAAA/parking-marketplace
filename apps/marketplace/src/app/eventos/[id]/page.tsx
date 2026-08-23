'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, CalendarDays, Clock, CheckCircle2, Footprints } from 'lucide-react';
import Navbar from '@/components/Navbar';

const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <div className="w-6 h-6 border-[3px] border-white/20 border-t-[#DFF085] rounded-full animate-spin" />
    </div>
  ),
});

interface EventDetail {
  id: string; name: string; venueName: string; startsAt: string; endsAt: string;
  price: number; totalSlots: number; slotsReserved: number; status: string;
  parkingName: string; parkingAddress: string; category?: string;
  lat?: number; lng?: number;
  imageUrl?: string;
}
interface ParkingOption {
  id: string; name: string; address: string; lat: number; lng: number;
  distanceMeters: number; walkMinutes: number;
  totalSlots: number; slotsReserved: number; available: number;
  pricing: Record<string, number>;
}

interface PricingConfig {
  mode: 'fixed' | 'dynamic'; fixedMarginPct: number;
  marginMin: number; marginMax: number;
  weightDistance: number; weightAnticipation: number; weightDemand: number;
}

// ─── Etiquetas de tipo de vehículo ────────────────────────────────────────────
const VEHICLE_LABELS: Record<string, string> = {
  auto: 'Auto', suv_camioneta: 'SUV', pickup: 'Pick Up', moto: 'Moto',
};

// ─── Motor de precios (espejo del servicio NestJS) ────────────────────────────
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
function computeFinalPrice(contractPrice: number, distKm: number, antHours: number, occupancy: number, cfg: PricingConfig): number {
  if (cfg.mode === 'fixed') {
    const basePrice = contractPrice * (1 + cfg.fixedMarginPct / 100);
    return Math.round(basePrice * (1 + IVA));
  }
  const mDist = distMult(distKm), mAnt = antMult(antHours), mDem = demMult(occupancy);
  const { weightDistance: wd, weightAnticipation: wa, weightDemand: wdem, marginMin, marginMax } = cfg;
  const composite = wd * mDist + wa * mAnt + wdem * mDem;
  const compMin = wd * MULT_MIN.distance + wa * MULT_MIN.anticipation + wdem * MULT_MIN.demand;
  const compMax = wd * MULT_MAX.distance + wa * MULT_MAX.anticipation + wdem * MULT_MAX.demand;
  const score = compMax > compMin ? Math.max(0, Math.min(1, (composite - compMin) / (compMax - compMin))) : 0.5;
  const marginPct = marginMin + score * (marginMax - marginMin);
  const basePrice = contractPrice * (1 + marginPct / 100);
  return Math.round(basePrice * (1 + IVA));
}

/** Calcula precios finales (IVA inc.) para cada tipo de vehículo de un parking */
function computeParkingPrices(
  pk: ParkingOption, startsAt: string, cfg: PricingConfig,
): Record<string, number> {
  const distKm   = pk.distanceMeters / 1000;
  const antHours = (new Date(startsAt).getTime() - Date.now()) / 3_600_000;
  const occupancy = pk.totalSlots > 0 ? (1 - pk.available / pk.totalSlots) * 100 : 50;
  const result: Record<string, number> = {};
  for (const [type, contract] of Object.entries(pk.pricing)) {
    if (contract > 0) result[type] = computeFinalPrice(contract, distKm, antHours, occupancy, cfg);
  }
  return result;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [parkings, setParkings] = useState<ParkingOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pricingCfg, setPricingCfg] = useState<PricingConfig>({
    mode: 'fixed', fixedMarginPct: 30,
    marginMin: 15, marginMax: 60, weightDistance: 0.40, weightAnticipation: 0.35, weightDemand: 0.25,
  });

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "";
    Promise.all([
      fetch(`${API}/api/v1/events/${params.id}`).then(r => r.json()),
      fetch(`${API}/api/v1/events/${params.id}/parkings`).then(r => r.json()),
      fetch(`${API}/api/v1/pricing-config`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([ed, pd, pc]) => {
      setEvent(ed.data);
      const pks: ParkingOption[] = pd.data || [];
      setParkings(pks);
      if (pks.length) setSelected(pks[0].id);
      if (pc?.data) setPricingCfg(pc.data);
    }).catch(() => setError('No se pudo cargar el evento.')).finally(() => setLoading(false));
  }, [params.id]);

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    document.getElementById(`pk-${id}`)?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    router.push(`/eventos/${params.id}/parking/${selected}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#04210f] rounded-full animate-spin" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Cargando evento...</p>
      </div>
    </div>
  );
  if (!event) return null;

  const avail = event.totalSlots - event.slotsReserved;
  const soldOut = avail === 0 && event.totalSlots > 0 || event.status === 'sold_out';
  const minPrice = parkings.length
    ? Math.min(...parkings.flatMap(p =>
        Object.values(computeParkingPrices(p, event.startsAt, pricingCfg)).filter(Boolean)))
    : Number(event.price);
  const minWalk = parkings.length ? Math.min(...parkings.map(p => p.walkMinutes)) : null;

  const selectedParking = parkings.find(p => p.id === selected) || null;
  const selectedPrices = selectedParking ? computeParkingPrices(selectedParking, event.startsAt, pricingCfg) : {};
  const selectedMinPrice = Object.values(selectedPrices).length ? Math.min(...Object.values(selectedPrices)) : 0;

  // El mapa debe mostrar el mismo precio final (con margen + IVA) que la tarjeta,
  // no el precio de contrato crudo que trae `parkings[].pricing`.
  const mapParkings = parkings.map(p => ({
    ...p,
    pricing: computeParkingPrices(p, event.startsAt, pricingCfg),
  }));

  return (
    <div className="bg-background min-h-screen pb-32 font-sans">
      <Navbar back="back" showExplore={false} />

      {/* Hero oscuro */}
      <div className="bg-[#04210f] text-white pt-28 pb-16 px-6 relative overflow-hidden">
        {event.imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04210f] via-[#04210f]/80 to-[#04210f]/40" />
          </>
        )}
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          <div className="space-y-3">
            <span className="bg-[#DFF085] text-brand-dark text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full">
              {event.category || 'Evento'}
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {event.name}
            </h1>
            <p className="text-[#DFF085] text-sm md:text-base font-semibold flex items-center gap-1.5 font-mono">
              <MapPin className="w-4 h-4" />
              <span>{event.venueName} • CDMX</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl pt-6 border-t border-emerald-950 text-center">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">Lugares libres</span>
              <span className="text-xl md:text-2xl font-black text-[#DFF085] block mt-1 font-mono">{avail}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">Precio desde</span>
              <span className="text-xl md:text-2xl font-black text-[#DFF085] block mt-1 font-mono">${minPrice} MXN</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">Min. caminando</span>
              <span className="text-xl md:text-2xl font-black text-[#DFF085] block mt-1 font-mono">{minWalk != null ? `${minWalk} min` : '—'}</span>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 top-0 w-80 h-80 bg-[#DFF085]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Info + lista de parkings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {[
              [CalendarDays, 'Fecha', new Date(event.startsAt).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Mexico_City'})],
              [Clock, 'Hora', new Date(event.startsAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',timeZone:'America/Mexico_City'})+' hrs'],
              [MapPin, 'Venue', event.venueName+', CDMX'],
            ].map(([Icon, k, v]: any, i) => (
              <div key={k} className={`flex items-center gap-3 px-5 py-3.5 ${i < 2 ? 'border-b border-slate-100' : ''}`}>
                <Icon className="w-4 h-4 text-[#383497] flex-shrink-0" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 w-14 flex-shrink-0">{k}</span>
                <span className="text-sm font-semibold text-slate-800 capitalize">{v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-brand-dark tracking-tight">Estacionamientos disponibles</h2>
            <p className="text-slate-500 text-xs">Selecciona un lote para ver ubicación exacta y tarifas.</p>
          </div>

          <div className="space-y-4">
            {parkings.map(pk => {
              const finalPrices = computeParkingPrices(pk, event.startsAt, pricingCfg);
              const minP = Object.values(finalPrices).length ? Math.min(...Object.values(finalPrices)) : 0;
              const isSelected = selected === pk.id;
              return (
                <div
                  key={pk.id}
                  id={`pk-${pk.id}`}
                  onClick={() => setSelected(pk.id)}
                  className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all shadow-sm ${
                    isSelected ? 'border-[#383497] ring-2 ring-[#383497]/10' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base m-0 flex items-center gap-1.5">
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#383497]" />}
                          {pk.name}
                        </h3>
                        {pk.distanceMeters <= 200 && (
                          <span className="bg-[#aecfb2]/40 text-brand-dark text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                            Más cercano
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 m-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                        <span>{pk.address}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400 font-mono m-0">desde</p>
                      <p className="text-lg font-mono font-bold text-[#383497] m-0">${minP} MXN</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                    <div>
                      <p className="text-slate-400 text-[10px] font-mono uppercase m-0">Distancia</p>
                      <p className="font-bold text-slate-800 mt-0.5 m-0">{pk.distanceMeters} m</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] font-mono uppercase m-0">Caminando</p>
                      <p className="font-bold text-slate-800 mt-0.5 m-0">{pk.walkMinutes} min</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] font-mono uppercase m-0">Disponibilidad</p>
                      <p className={`font-bold mt-0.5 m-0 ${pk.available <= 15 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {pk.available} libres
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 bg-slate-50 rounded-xl p-3 flex gap-2 flex-wrap border border-slate-100">
                    {Object.entries(finalPrices).map(([type, price]) => (
                      <div key={type} className="flex-1 min-w-[70px] text-center text-[11px] font-mono">
                        <span className="text-slate-400 block uppercase">{VEHICLE_LABELS[type] ?? type}</span>
                        <span className="font-semibold text-slate-700">${price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Incluye */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {['Un lugar garantizado','Código QR de acceso único','Boleto por WhatsApp','Sin cobros al llegar'].map((item, i, arr) => (
              <div key={item} className={`flex items-center gap-3 px-5 py-3 text-sm font-semibold text-slate-700 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <CheckCircle2 className="w-4 h-4 text-[#383497] flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-rose-700 text-xs font-bold">{error}</div>}
        </div>

        {/* Mapa real (MapLibre) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-brand-dark tracking-tight">Mapa del recinto</h2>
            <p className="text-slate-500 text-xs">Ubicación de los estacionamientos respecto al venue.</p>
          </div>

          {event.lat && parkings.length > 0 ? (
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md border border-slate-800 aspect-square lg:aspect-auto lg:h-[420px]">
              <EventMap
                key={event.id}
                venueLat={event.lat} venueLng={event.lng!}
                parkings={mapParkings} selected={selected}
                onSelect={handleSelect}
              />
            </div>
          ) : (
            <div className="bg-slate-900 rounded-3xl aspect-square flex items-center justify-center text-slate-500 text-xs font-mono">
              Mapa no disponible
            </div>
          )}
        </div>
      </div>

      {/* Barra fija inferior */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 py-4 px-6 z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] flex flex-col sm:flex-row justify-between items-center gap-4 max-w-5xl mx-auto rounded-t-3xl">
        <div className="text-center sm:text-left">
          <p className="text-slate-400 text-xs font-mono uppercase tracking-wider m-0">Estacionamiento seleccionado</p>
          <h4 className="font-bold text-brand-dark text-base leading-tight m-0 mt-0.5">
            {selectedParking ? selectedParking.name : 'Selecciona una opción'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1 justify-center sm:justify-start m-0">
            {selectedParking && (
              <>
                <Footprints className="w-3.5 h-3.5" />
                <span>{selectedParking.walkMinutes} min caminando</span>
                <span>•</span>
                <span className="font-mono text-[#383497] font-bold">${selectedMinPrice} MXN</span>
              </>
            )}
          </p>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || soldOut}
          className="w-full sm:w-auto bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-sans text-sm font-bold uppercase tracking-wider px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
        >
          {soldOut ? 'Agotado' : 'Reservar'}
        </button>
      </div>
    </div>
  );
}
