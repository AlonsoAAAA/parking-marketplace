'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

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

  const idx   = Number(String(eventId).replace(/\D/g, '').slice(-1) || 0) % CARD_COLORS.length;
  const color = CARD_COLORS[idx];

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
    <div style={{ minHeight: '100vh', background: '#EDEDED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #ddd', borderTop: '2px solid #1a1a1a', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: '#f5f5f5',
    border: '2px solid transparent', borderRadius: 12, fontSize: 14,
    fontWeight: 500, color: '#1a1a1a', fontFamily: 'Inter,sans-serif',
    outline: 'none', transition: 'border-color .15s', boxSizing: 'border-box',
    appearance: 'none', cursor: 'pointer',
  };
  const selectDisabledStyle: React.CSSProperties = { ...selectStyle, opacity: 0.45, cursor: 'not-allowed' };

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .pp-page { min-height:100vh; background:#EDEDED; }

        .pp-hero { padding:20px 16px 0; }
        @media(min-width:640px){ .pp-hero { padding:24px 32px 0; } }
        @media(min-width:1024px){ .pp-hero { padding:28px 56px 8px; } }

        .pp-body { padding:12px 16px 160px; }
        @media(min-width:640px){ .pp-body { padding:16px 32px 160px; } }
        @media(min-width:1024px){
          .pp-body { display:grid; grid-template-columns:1fr 1fr; gap:16px;
            padding:16px 56px 60px; align-items:start; }
        }

        .pp-col { display:flex; flex-direction:column; gap:12px; }

        .pp-sec { background:#fff; border-radius:16px; overflow:hidden; }
        .pp-sec-hd { background:#1a1a1a; padding:11px 18px; }
        .pp-sec-lb { font-size:9px; font-weight:600; letter-spacing:3px;
          text-transform:uppercase; color:rgba(255,255,255,.45); }
        .pp-sec-bd { padding:0 18px; }
        .pp-row  { display:flex; justify-content:space-between; padding:12px 0;
          border-bottom:1px solid #f5f5f5; font-size:13px; }
        .pp-row:last-child { border:none; }
        .pp-rl { color:#999; flex-shrink:0; }
        .pp-rv { color:#1a1a1a; font-weight:500; text-align:right; max-width:60%; }

        .pp-input { width:100%; padding:14px 16px; background:#f5f5f5; border:2px solid transparent;
          border-radius:12px; font-size:14px; font-weight:500; color:#1a1a1a;
          font-family:Inter,sans-serif; outline:none; transition:border-color .15s; box-sizing:border-box; }
        .pp-input:focus { border-color:#1a1a1a; background:#fff; }
        .pp-input::placeholder { color:#bbb; font-weight:400; }
        .pp-label { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase;
          color:#bbb; display:block; margin-bottom:7px; }
        .pp-plate { text-transform:uppercase; letter-spacing:3px; font-weight:700; font-size:16px; }
        .pp-select-wrap { position:relative; }
        .pp-select-wrap::after { content:''; position:absolute; right:16px; top:50%; transform:translateY(-50%);
          width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent;
          border-top:5px solid #999; pointer-events:none; }

        .pp-cta { position:fixed; bottom:0; left:0; right:0;
          background:rgba(237,237,237,.95); backdrop-filter:blur(16px);
          border-top:1px solid rgba(0,0,0,.07);
          padding:16px 20px calc(16px + env(safe-area-inset-bottom));
          display:flex; align-items:center; justify-content:space-between; gap:16px; z-index:50; }
        @media(min-width:640px){ .pp-cta { max-width:640px; margin:0 auto;
          left:50%; transform:translateX(-50%); right:auto; } }
        @media(min-width:1024px){ .pp-cta { display:none; } }
        .pp-cta-price { font-size:26px; font-weight:700; letter-spacing:-.5px; color:#1a1a1a; }
        .pp-cta-sub   { font-size:11px; color:#bbb; margin-top:2px; }

        .pp-cta-desk { display:none; }
        @media(min-width:1024px){
          .pp-cta-desk { display:flex; align-items:center; justify-content:space-between; gap:16px;
            background:#fff; border-radius:16px; padding:20px 18px; }
        }
      `}</style>

      <div className="pp-page">
        <header className="pm-header" style={{ background: color.bg }}>
          <button className="pm-back" onClick={() => router.back()}>← Elegir otro</button>
          <span className="pm-logo">Estaciona<span>t</span></span>
        </header>

        <div className="pp-hero">
          <div style={{ paddingTop: 18, paddingBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>
              ESTACIONAMIENTO
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.4px', color: '#1a1a1a', margin: 0 }}>
              {parking.name}
            </h1>
            <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>📍 {parking.address}</p>
          </div>
        </div>

        <div className="pp-body">

          {/* Columna izquierda */}
          <div className="pp-col">
            <div className="pp-sec">
              <div className="pp-sec-hd"><span className="pp-sec-lb">Detalle de reservación</span></div>
              <div className="pp-sec-bd">
                {[
                  ['Evento',      event.name],
                  ['Venue',       event.venueName],
                  ['Fecha',       fmtDate(event.startsAt)],
                  ['Hora',        fmtTime(event.startsAt)],
                  ['Distancia',   `${parking.distanceMeters} m · ${parking.walkMinutes} min caminando`],
                  ['Disponibles', `${parking.available} lugares`],
                ].map(([l, v]) => (
                  <div key={l} className="pp-row">
                    <span className="pp-rl">{l}</span>
                    <span className="pp-rv">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-sec">
              <div className="pp-sec-hd"><span className="pp-sec-lb">Incluye</span></div>
              <div className="pp-sec-bd">
                {[
                  'Lugar garantizado para tu vehículo',
                  'Código QR de acceso único',
                  'Boleto enviado por WhatsApp',
                  'Sin cobros adicionales al llegar',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13, color: '#444' }}>
                    <div style={{ width: 20, height: 20, background: '#1a1a1a', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3 5.5L8 1" stroke="#EDEDED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="pp-col">
            <div className="pp-sec">
              <div className="pp-sec-hd"><span className="pp-sec-lb">Tu vehículo y datos</span></div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Marca */}
                <div>
                  <span className="pp-label">Marca</span>
                  <div className="pp-select-wrap">
                    <select
                      style={loadingMarcas ? selectDisabledStyle : selectStyle}
                      value={marca}
                      onChange={e => setMarca(e.target.value)}
                      disabled={loadingMarcas}
                    >
                      <option value="">
                        {loadingMarcas ? 'Cargando marcas…' : 'Selecciona una marca'}
                      </option>
                      {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* Modelo */}
                <div>
                  <span className="pp-label">Modelo</span>
                  <div className="pp-select-wrap">
                    <select
                      style={(!marca || modelos.length === 0) ? selectDisabledStyle : selectStyle}
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
                </div>

                {/* Versión — solo si aplica */}
                {tieneVersion && (
                  <div>
                    <span className="pp-label">Versión / Cabina</span>
                    <div className="pp-select-wrap">
                      <select
                        style={selectStyle}
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                      >
                        <option value="">Selecciona una versión</option>
                        {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Precio del vehículo seleccionado — con desglose IVA */}
                {priceCalc !== null && categoria && (
                  <div style={{ background: '#f5f5f5', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Categoría */}
                    <div style={{ padding: '8px 14px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 600, letterSpacing: 1 }}>
                        {CATEGORY_ICONS[categoria]} {CATEGORY_LABELS[categoria].toUpperCase()}
                      </span>
                    </div>
                    {/* Desglose */}
                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999' }}>
                        <span>Subtotal</span>
                        <span>${priceCalc.basePrice.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999' }}>
                        <span>IVA 16%</span>
                        <span>+${priceCalc.ivaAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#1a1a1a', borderTop: '1px solid #e8e8e8', paddingTop: 6, marginTop: 2 }}>
                        <span>Total</span>
                        <span>${priceCalc.finalPrice} MXN</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Placas */}
                <div>
                  <span className="pp-label">Placas del vehículo</span>
                  <input
                    className="pp-input pp-plate"
                    value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').slice(0, 10))}
                    placeholder="ABC 123 D"
                    autoComplete="off"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <span className="pp-label">Nombre del titular</span>
                  <input
                    className="pp-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                  />
                </div>

              </div>
            </div>

            {error && <div className="pm-error">{error}</div>}

            {/* CTA desktop */}
            <div className="pp-cta-desk">
              {priceCalc !== null ? (
                <div>
                  <div className="pp-cta-price">
                    ${priceCalc.finalPrice} <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>MXN</span>
                  </div>
                  <div className="pp-cta-sub">
                    {categoria ? `${CATEGORY_ICONS[categoria]} · IVA incluido` : ''}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#bbb' }}>Completa los datos</div>
              )}
              <button
                className="pm-btn-primary"
                style={{ width: 'auto', minWidth: 155, opacity: canReserve ? 1 : 0.4 }}
                disabled={!canReserve}
                onClick={handleReserve}>
                {reserving
                  ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }}/>
                      Reservando...
                    </span>
                  : soldOut ? 'Agotado' : '🔒 Reservar y pagar'}
              </button>
            </div>
          </div>

        </div>

        {/* CTA fija móvil */}
        <div className="pp-cta">
          {price !== null ? (
            <div>
              <div className="pp-cta-price">
                ${price} <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>MXN</span>
              </div>
              <div className="pp-cta-sub">
                {categoria ? `${CATEGORY_ICONS[categoria]} ${marca} ${modelo}` : ''}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#bbb' }}>Completa los datos</div>
          )}
          <button
            className="pm-btn-primary"
            style={{ width: 'auto', minWidth: 155, opacity: canReserve ? 1 : 0.4 }}
            disabled={!canReserve}
            onClick={handleReserve}>
            {reserving
              ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block' }}/>
                  Reservando...
                </span>
              : soldOut ? 'Agotado' : '🔒 Reservar y pagar'}
          </button>
        </div>
      </div>
    </>
  );
}
