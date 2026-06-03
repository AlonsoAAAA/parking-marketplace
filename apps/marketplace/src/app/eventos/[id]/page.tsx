'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

const EventMap = dynamic(() => import('@/components/EventMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width:'100%', height:'100%', background:'#e8e8e8', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:20,height:20,border:'2px solid #ddd',borderTop:'2px solid #1a1a1a',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>
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

  const idx = Number(String(params.id).replace(/\D/g,'').slice(-1) || 0) % CARD_COLORS.length;
  const color = CARD_COLORS[idx];
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
    <div style={{ minHeight:'100vh', background:'#EDEDED', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:24,height:24,border:'2px solid #ddd',borderTop:'2px solid #1a1a1a',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!event) return null;

  const avail = event.totalSlots - event.slotsReserved;
  const soldOut = avail === 0 && event.totalSlots > 0 || event.status === 'sold_out';
  const fillPct = event.totalSlots > 0 ? Math.round((event.slotsReserved / event.totalSlots) * 100) : 0;
  const minPrice = parkings.length
    ? Math.min(...parkings.flatMap(p =>
        Object.values(computeParkingPrices(p, event.startsAt, pricingCfg)).filter(Boolean)))
    : Number(event.price);
  const minWalk = parkings.length ? Math.min(...parkings.map(p => p.walkMinutes)) : null;

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .dir { display:flex; padding:14px 0; border-bottom:1px solid rgba(0,0,0,.07); align-items:baseline; gap:12px; }
        .dik { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; width:60px; flex-shrink:0; }
        .div2 { font-size:14px; color:#1a1a1a; line-height:1.4; }
        .sct { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; margin-bottom:12px; margin-top:28px; }
        .abt { height:3px; background:rgba(0,0,0,.08); border-radius:2px; overflow:hidden; margin-top:6px; }
        .abf { height:100%; border-radius:2px; }
        .dv { height:260px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        @media(min-width:640px){ .dv { height:320px; } }
        @media(min-width:1024px){ .dv { height:420px; } }
        .stat-strip { display:grid; grid-template-columns:1fr 1fr 1fr; border-top:1px solid rgba(0,0,0,.07); }
        .stat-cell { padding:14px 0; text-align:center; border-right:1px solid rgba(0,0,0,.07); }
        .stat-cell:last-child { border-right:none; }
        /* ── Mobile fixed CTA ── */
        .cta { position:fixed; bottom:0; left:0; right:0; background:rgba(237,237,237,.93); backdrop-filter:blur(16px); border-top:1px solid rgba(0,0,0,.07); padding:16px 24px; display:flex; align-items:center; gap:16px; justify-content:space-between; z-index:50; }
        @media(min-width:1024px){ .cta { display:none !important; } }
        /* ── Desktop 2-col layout ── */
        .db { padding:28px 24px 160px; }
        @media(min-width:640px){ .db { padding:36px 40px 160px; max-width:560px; margin:0 auto; } }
        @media(min-width:1024px){
          .desk-grid {
            display:grid; grid-template-columns:1fr 360px; gap:32px;
            padding:0 56px 80px;
            align-items:start;
          }
          .db { padding:32px 0 0; max-width:none; margin:0; }
          .desk-side { display:block !important; }
          .ev-map { height:380px !important; border-radius:12px !important; margin:0 !important; width:100% !important; }
        }
        .desk-side { display:none; }
        /* Sidebar CTA card */
        .desk-cta { background:#fff; border-radius:20px; padding:24px; box-shadow:0 2px 16px rgba(0,0,0,.08); position:sticky; top:80px; }
        .desk-cta-ev { font-size:13px; font-weight:700; color:#1a1a1a; letter-spacing:-.2px; margin-bottom:4px; }
        .desk-cta-sub { font-size:11px; color:#999; margin-bottom:20px; }
        .desk-pk-sel { background:#f5f5f5; border-radius:12px; padding:14px; margin-bottom:16px; }
        .desk-pk-sel-name { font-size:13px; font-weight:600; color:#1a1a1a; margin-bottom:4px; }
        .desk-pk-sel-meta { font-size:11px; color:#999; }
        .desk-price-row { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(0,0,0,.07); }
        .desk-price { font-size:28px; font-weight:700; color:#1a1a1a; letter-spacing:-1px; }
        .desk-price-sub { font-size:11px; color:#bbb; }
        .desk-perks { display:flex; flex-direction:column; gap:8px; margin-top:16px; }
        .desk-perk { display:flex; align-items:center; gap:8px; font-size:12px; color:#555; }
        .desk-perk-dot { width:16px; height:16px; background:#1a1a1a; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        /* Mapa mobile */
        .ev-map { width:100%; height:260px; border-radius:0; overflow:hidden; }
        @media(min-width:640px){ .ev-map { height:320px; border-radius:12px; margin:0 -40px; width:calc(100% + 80px); } }
        /* Cards de parking */
        .pk-card { background:#fff; border-radius:14px; padding:14px 16px; margin-bottom:10px; cursor:pointer; border:2px solid transparent; transition:all .15s; }
        .pk-card.sel { border-color:#1a1a1a; }
        .pk-card:hover:not(.sel) { border-color:rgba(0,0,0,.12); }
        .pk-name { font-size:14px; font-weight:600; color:#1a1a1a; letter-spacing:-.2px; }
        .pk-addr { font-size:12px; color:#999; margin-top:3px; }
        .pk-row  { display:flex; align-items:center; justify-content:space-between; margin-top:10px; gap:8px; flex-wrap:wrap; }
        .pk-stat { font-size:12px; color:#666; display:flex; align-items:center; gap:6px; }
        .pk-prices { display:flex; gap:5px; flex-wrap:wrap; }
        .pk-ptag { background:#f5f5f5; border-radius:6px; padding:3px 8px; font-size:10px; color:#666; white-space:nowrap; }
      `}</style>

      <div className="pm-page">
        <header className="pm-header" style={{ background: color.bg }}>
          <button className="pm-back" onClick={() => router.back()}>← Regresar</button>
          <span className="pm-logo">Estaciona<span>t</span></span>
        </header>

        {/* Hero */}
        <div style={{ background: color.bg }}>
          <div className="dv" style={{ background: color.accent }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 40%, rgba(255,255,255,.5) 0%, transparent 60%)' }} />
            <span style={{ fontSize:90, position:'relative', zIndex:1 }}>{emoji}</span>
            <div style={{ position:'absolute', bottom:16, left:24 }}>
              <div style={{ fontSize:9, fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(0,0,0,.4)', marginBottom:6 }}>
                {event.category || 'EVENTO'}
              </div>
              <div style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:700, lineHeight:1.05, letterSpacing:'-.5px', color: color.text }}>{event.name}</div>
              <div style={{ fontSize:13, color:'rgba(0,0,0,.45)', marginTop:4 }}>{event.venueName}</div>
            </div>
          </div>

          <div className="stat-strip">
            {[
              [avail.toString(), 'lugares'],
              [`$${minPrice}`, 'desde MXN'],
              [minWalk != null ? `${minWalk} min` : '—', 'al venue'],
            ].map(([v,l],i) => (
              <div key={i} className="stat-cell">
                <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-.5px', color: color.text }}>{v}</div>
                <div style={{ fontSize:9, fontWeight:500, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(0,0,0,.35)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Desktop 2-col grid ── */}
        <div className="desk-grid">

          {/* LEFT: cuerpo principal */}
          <div className="db">
            {/* Información del evento */}
            <p className="sct">Información</p>
            {[
              ['Fecha', new Date(event.startsAt).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'})],
              ['Hora', new Date(event.startsAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})+' hrs'],
              ['Venue', event.venueName+', CDMX'],
            ].map(([k,v]) => (
              <div key={k} className="dir">
                <span className="dik">{k}</span>
                <span className="div2">{v}</span>
              </div>
            ))}

            {/* Mapa */}
            {event.lat && parkings.length > 0 && (
              <>
                <p className="sct">Mapa de estacionamientos</p>
                <div className="ev-map">
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
                <p className="sct">Elige tu estacionamiento</p>
                {parkings.map(pk => {
                  const finalPrices = computeParkingPrices(pk, event.startsAt, pricingCfg);
                  const minP = Object.values(finalPrices).length
                    ? Math.min(...Object.values(finalPrices))
                    : 0;
                  const isSel = selected === pk.id;
                  return (
                    <div key={pk.id} id={`pk-${pk.id}`}
                      className={`pk-card${isSel ? ' sel' : ''}`}
                      onClick={() => setSelected(pk.id)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="pk-name">
                            {isSel && <span style={{ marginRight:6 }}>✓</span>}{pk.name}
                          </div>
                          <div className="pk-addr">{pk.address}</div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:'#1a1a1a' }}>desde ${minP}</div>
                          <div style={{ fontSize:11, color: pk.available <= 15 ? '#e8954a' : '#bbb', marginTop:2 }}>
                            {pk.available} lugares · IVA inc.
                          </div>
                        </div>
                      </div>
                      <div className="pk-row">
                        <div className="pk-stat">
                          <span>🚶 {pk.walkMinutes} min</span>
                          <span style={{ color:'#ddd' }}>·</span>
                          <span>{pk.distanceMeters} m</span>
                        </div>
                        <div className="pk-prices">
                          {Object.entries(finalPrices).map(([type, price]) => (
                            <span key={type} className="pk-ptag">
                              {VEHICLE_LABELS[type] ?? type} ${price}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Incluye */}
            <p className="sct">Incluye</p>
            {['Un lugar garantizado','Código QR de acceso único','Boleto por WhatsApp','Sin cobros al llegar'].map(item => (
              <div key={item} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(0,0,0,.05)', fontSize:13, color:'#444' }}>
                <div style={{ width:20, height:20, background:'#1a1a1a', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3 5.5L8 1" stroke="#EDEDED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {item}
              </div>
            ))}

            {error && <div className="pm-error" style={{ marginTop:16 }}>{error}</div>}
          </div>

          {/* RIGHT: sidebar CTA — desktop only */}
          <div className="desk-side">
            {selected && (() => {
              const pk = parkings.find(p => p.id === selected);
              if (!pk) return null;
              const finalPrices = computeParkingPrices(pk, event.startsAt, pricingCfg);
              const minP = Object.values(finalPrices).length ? Math.min(...Object.values(finalPrices)) : 0;
              return (
                <div className="desk-cta">
                  <div className="desk-cta-ev">{event.name}</div>
                  <div className="desk-cta-sub">
                    {new Date(event.startsAt).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'long'})}
                    {' · '}{event.venueName}
                  </div>

                  <div className="desk-pk-sel">
                    <div className="desk-pk-sel-name">{pk.name}</div>
                    <div className="desk-pk-sel-meta">🚶 {pk.walkMinutes} min · {pk.distanceMeters} m del venue</div>
                  </div>

                  <div className="desk-price-row">
                    <div>
                      <div style={{ fontSize:10, color:'#bbb', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>Precio</div>
                      <div className="desk-price">desde ${minP} <span style={{ fontSize:12, fontWeight:500, color:'#bbb' }}>MXN</span></div>
                    </div>
                    <div style={{ fontSize:11, color: pk.available <= 15 ? '#e8954a' : '#999' }}>
                      {pk.available} lugares disponibles
                    </div>
                  </div>

                  <button
                    className="pm-btn-primary"
                    style={{ opacity: soldOut ? .4 : 1 }}
                    disabled={soldOut}
                    onClick={handleContinue}>
                    {soldOut ? 'Agotado' : 'Reservar'}
                  </button>

                  <div className="desk-perks">
                    {['Lugar garantizado','QR de acceso único','Sin cobros extra'].map(p => (
                      <div key={p} className="desk-perk">
                        <div className="desk-perk-dot">
                          <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                            <path d="M1 3L2.5 4.5L6 1" stroke="#EDEDED" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
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

        </div>{/* /desk-grid */}

        {/* CTA fija — solo móvil (oculta en desktop via CSS) */}
        {selected && (() => {
          const pk = parkings.find(p => p.id === selected);
          if (!pk) return null;
          const finalPrices = computeParkingPrices(pk, event.startsAt, pricingCfg);
          const minP = Object.values(finalPrices).length ? Math.min(...Object.values(finalPrices)) : 0;
          return (
            <div className="cta">
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', letterSpacing:'-.1px' }}>{pk.name}</div>
                <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>🚶 {pk.walkMinutes} min · {pk.distanceMeters} m</div>
              </div>
              <button className="pm-btn-primary"
                style={{ width:'auto', minWidth:140, opacity: soldOut ? .4 : 1 }}
                disabled={soldOut}
                onClick={handleContinue}>
                {soldOut ? 'Agotado' : 'Reservar'}
              </button>
            </div>
          );
        })()}
      </div>
    </>
  );
}
