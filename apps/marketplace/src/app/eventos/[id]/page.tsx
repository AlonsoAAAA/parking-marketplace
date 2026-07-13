'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapPin, Footprints, CheckCircle2, CalendarDays, Clock } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoButton, NeoSpinner, NeoBadge } from '@/components/ui/neo';

const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
      <div className="w-6 h-6 border-[3px] border-on-surface border-t-primary-container rounded-full animate-spin" />
    </div>
  ),
});

interface EventDetail {
  id: string; name: string; venueName: string; startsAt: string; endsAt: string;
  price: number; totalSlots: number; slotsReserved: number; status: string;
  parkingName: string; parkingAddress: string; category?: string;
  lat?: number; lng?: number;
}
interface ParkingOption {
  id: string; name: string; address: string; lat: number; lng: number;
  distanceMeters: number; walkMinutes: number;
  totalSlots: number; slotsReserved: number; available: number;
  pricing: Record<string, number>;
}

interface PricingConfig {
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

const EMOJIS = ['🎵','⚽','🎧','🎤','🎸'];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [parkings, setParkings] = useState<ParkingOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pricingCfg, setPricingCfg] = useState<PricingConfig>({
    marginMin: 15, marginMax: 60, weightDistance: 0.40, weightAnticipation: 0.35, weightDemand: 0.25,
  });

  const idx = Number(String(params.id).replace(/\D/g,'').slice(-1) || 0) % EMOJIS.length;
  const emoji = EMOJIS[idx];

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
      <NeoHeader back="back" />
      <NeoSpinner label="Cargando evento..." />
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

  const sectionTitle = 'font-extrabold text-[11px] uppercase tracking-[2px] text-on-surface-variant mb-3 mt-8';

  return (
    <div className="min-h-screen bg-background font-sans pb-28 lg:pb-0">
      <NeoHeader back="back" />

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-8">
        <div className="relative overflow-hidden rounded-xl border-[3px] border-on-surface neo-shadow-lg bg-primary-container h-52 md:h-72 flex items-end">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(25,28,29,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(25,28,29,.06)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem]" />
          <span className="absolute top-1/2 right-8 -translate-y-1/2 text-7xl md:text-8xl">{emoji}</span>
          <div className="relative z-10 p-5 md:p-8">
            <NeoBadge color="dark" className="mb-3">{event.category || 'Evento'}</NeoBadge>
            <h1 className="font-extrabold text-2xl md:text-4xl text-on-surface uppercase tracking-tight leading-tight max-w-xl">{event.name}</h1>
            <div className="flex items-center gap-1.5 mt-2 text-on-surface/70">
              <MapPin className="w-4 h-4" strokeWidth={2.5} />
              <span className="text-sm font-bold">{event.venueName}</span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 mt-5 bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden">
          {[
            [avail.toString(), 'lugares'],
            [`$${minPrice}`, 'desde MXN'],
            [minWalk != null ? `${minWalk} min` : '—', 'al venue'],
          ].map(([v,l],i) => (
            <div key={i} className={`py-4 text-center ${i < 2 ? 'border-r-[3px] border-on-surface' : ''}`}>
              <div className="font-mono font-bold text-xl md:text-2xl text-on-surface">{v}</div>
              <div className="font-extrabold text-[9px] tracking-[1.5px] uppercase text-on-surface-variant mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid desktop 2-col */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start pb-16">
        {/* LEFT */}
        <div>
          {/* Información */}
          <p className={sectionTitle}>Información</p>
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden">
            {[
              [CalendarDays, 'Fecha', new Date(event.startsAt).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'})],
              [Clock, 'Hora', new Date(event.startsAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})+' hrs'],
              [MapPin, 'Venue', event.venueName+', CDMX'],
            ].map(([Icon, k, v]: any, i) => (
              <div key={k} className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? 'border-b-2 border-dashed border-on-surface/15' : ''}`}>
                <Icon className="w-4 h-4 text-on-surface flex-shrink-0" strokeWidth={2.5} />
                <span className="font-extrabold text-[10px] uppercase tracking-widest text-on-surface-variant w-14 flex-shrink-0">{k}</span>
                <span className="text-sm font-semibold text-on-surface capitalize">{v}</span>
              </div>
            ))}
          </div>

          {/* Mapa */}
          {event.lat && parkings.length > 0 && (
            <>
              <p className={sectionTitle}>Mapa de estacionamientos</p>
              <div className="w-full h-64 md:h-80 lg:h-96 rounded-xl border-[3px] border-on-surface neo-brutal-shadow overflow-hidden">
                <EventMap
                  venueLat={event.lat} venueLng={event.lng!}
                  parkings={parkings} selected={selected}
                  onSelect={handleSelect}
                />
              </div>
            </>
          )}

          {/* Lista de parkings */}
          {parkings.length > 0 && (
            <>
              <p className={sectionTitle}>Elige tu estacionamiento</p>
              <div className="flex flex-col gap-3">
                {parkings.map(pk => {
                  const finalPrices = computeParkingPrices(pk, event.startsAt, pricingCfg);
                  const minP = Object.values(finalPrices).length
                    ? Math.min(...Object.values(finalPrices))
                    : 0;
                  const isSel = selected === pk.id;
                  return (
                    <div key={pk.id} id={`pk-${pk.id}`}
                      onClick={() => setSelected(pk.id)}
                      className={`rounded-xl p-4 cursor-pointer transition-all duration-150 border-[3px] border-on-surface ${
                        isSel
                          ? 'bg-primary-container neo-brutal-shadow'
                          : 'bg-white hover:bg-surface-container neo-brutal-shadow-sm'
                      }`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-on-surface uppercase tracking-tight flex items-center gap-1.5">
                            {isSel && <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />}
                            {pk.name}
                          </div>
                          <div className="text-xs font-semibold text-on-surface-variant mt-1">{pk.address}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-bold text-base text-on-surface">desde ${minP}</div>
                          <div className={`font-mono text-[10px] font-bold mt-0.5 ${pk.available <= 15 ? 'text-[#9a3412]' : 'text-on-surface-variant'}`}>
                            {pk.available} lugares · IVA inc.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-on-surface-variant">
                          <Footprints className="w-3.5 h-3.5" strokeWidth={2.5} />
                          {pk.walkMinutes} min · {pk.distanceMeters} m
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(finalPrices).map(([type, price]) => (
                            <span key={type} className="bg-white border-2 border-on-surface rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold text-on-surface whitespace-nowrap">
                              {VEHICLE_LABELS[type] ?? type} ${price}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Incluye */}
          <p className={sectionTitle}>Incluye</p>
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden">
            {['Un lugar garantizado','Código QR de acceso único','Boleto por WhatsApp','Sin cobros al llegar'].map((item, i, arr) => (
              <div key={item} className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface ${i < arr.length - 1 ? 'border-b-2 border-dashed border-on-surface/15' : ''}`}>
                <div className="w-5 h-5 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3 5.5L8 1" stroke="#191c1d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>

          {error && <div className="mt-4 bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}
        </div>

        {/* RIGHT: sidebar CTA — desktop only */}
        <div className="hidden lg:block">
          {selected && (() => {
            const pk = parkings.find(p => p.id === selected);
            if (!pk) return null;
            const finalPrices = computeParkingPrices(pk, event.startsAt, pricingCfg);
            const minP = Object.values(finalPrices).length ? Math.min(...Object.values(finalPrices)) : 0;
            return (
              <div className="bg-white border-[3px] border-on-surface rounded-xl neo-shadow-lg p-6 sticky top-24 mt-8">
                <div className="font-extrabold text-sm text-on-surface uppercase tracking-tight mb-1">{event.name}</div>
                <div className="font-mono text-[11px] font-bold text-on-surface-variant mb-5">
                  {new Date(event.startsAt).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'long'})}
                  {' · '}{event.venueName}
                </div>

                <div className="bg-surface-container border-2 border-on-surface rounded-xl p-3.5 mb-4">
                  <div className="font-extrabold text-xs text-on-surface uppercase tracking-tight mb-1">{pk.name}</div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-on-surface-variant">
                    <Footprints className="w-3 h-3" strokeWidth={2.5} />
                    {pk.walkMinutes} min · {pk.distanceMeters} m del venue
                  </div>
                </div>

                <div className="flex items-end justify-between mb-5 pb-4 border-b-2 border-dashed border-on-surface/15">
                  <div>
                    <div className="font-extrabold text-[9px] tracking-[1.5px] uppercase text-on-surface-variant mb-1">Precio</div>
                    <div className="font-mono font-bold text-2xl text-on-surface">desde ${minP} <span className="text-xs text-on-surface-variant">MXN</span></div>
                  </div>
                  <div className={`font-mono text-[10px] font-bold ${pk.available <= 15 ? 'text-[#9a3412]' : 'text-on-surface-variant'}`}>
                    {pk.available} lugares
                  </div>
                </div>

                <NeoButton className="w-full" disabled={soldOut} onClick={handleContinue}>
                  {soldOut ? 'Agotado' : 'Reservar'}
                </NeoButton>

                <div className="flex flex-col gap-2 mt-4">
                  {['Lugar garantizado','QR de acceso único','Sin cobros extra'].map(p => (
                    <div key={p} className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                      <div className="w-4 h-4 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                          <path d="M1 3L2.5 4.5L6 1" stroke="#191c1d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* CTA fija — solo móvil */}
      {selected && (() => {
        const pk = parkings.find(p => p.id === selected);
        if (!pk) return null;
        return (
          <div className="fixed bottom-0 left-0 right-0 bg-surface border-t-[3px] border-on-surface px-5 py-4 flex items-center gap-4 justify-between z-50 lg:hidden">
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-on-surface uppercase tracking-tight truncate">{pk.name}</div>
              <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-on-surface-variant mt-0.5">
                <Footprints className="w-3 h-3" strokeWidth={2.5} />
                {pk.walkMinutes} min · {pk.distanceMeters} m
              </div>
            </div>
            <NeoButton className="min-w-[130px] flex-shrink-0" disabled={soldOut} onClick={handleContinue}>
              {soldOut ? 'Agotado' : 'Reservar'}
            </NeoButton>
          </div>
        );
      })()}
    </div>
  );
}
