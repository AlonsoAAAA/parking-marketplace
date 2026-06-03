'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

interface ParkingDetail {
  id: string; name: string; address: string;
  distanceMeters: number; walkMinutes: number; available: number;
  pricing: Record<string, number>;
}
interface EventInfo {
  id: string; name: string; venueName: string; startsAt: string; category?: string;
}

export type VehicleCategory = 'Auto' | 'Sub' | 'Pick Up' | 'Moto';
export interface CarModel { make: string; model: string; category: VehicleCategory; }

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  'Auto': 'Auto', 'Sub': 'SUV', 'Pick Up': 'Pick Up', 'Moto': 'Moto',
};
const CATEGORY_ICONS: Record<VehicleCategory, string> = {
  'Auto': '🚗', 'Sub': '🚙', 'Pick Up': '🛻', 'Moto': '🏍️',
};

// ─── Dropdown de modelos ──────────────────────────────────────────────────────
function ModelDropdown({ pricing, selected, onSelect }: {
  pricing: Record<string, number>;
  selected: CarModel | null;
  onSelect: (m: CarModel) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<CarModel[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const containerRef          = useRef<HTMLDivElement>(null);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableCategories = Object.keys(pricing) as VehicleCategory[];

  const fetchModels = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const cats = availableCategories.join(',');
        const url  = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/vehicles?q=${encodeURIComponent(q)}&categories=${encodeURIComponent(cats)}`;
        const data = await fetch(url).then(r => r.json()) as { data: CarModel[] };
        setResults(data.data ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [availableCategories]);

  const handleOpen = () => {
    setOpen(true); setQuery('');
    fetchModels('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = useCallback((m: CarModel) => {
    onSelect(m); setOpen(false); setQuery('');
  }, [onSelect]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button type="button" onClick={handleOpen} style={{
        width: '100%', padding: '14px 16px',
        background: '#f5f5f5', border: `2px solid ${open ? '#1a1a1a' : 'transparent'}`,
        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        fontFamily: 'Inter,sans-serif', transition: 'border-color .15s',
      }}>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{CATEGORY_ICONS[selected.category]}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                {selected.make} {selected.model}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                {CATEGORY_LABELS[selected.category]} · ${pricing[selected.category]} MXN
              </div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 14, color: '#bbb' }}>Busca tu marca y modelo...</span>
        )}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: '#999' }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', borderRadius: 14, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,.15)', overflow: 'hidden',
          animation: 'fadeIn .15s ease both',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#bbb' }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input ref={inputRef} value={query}
              onChange={e => { setQuery(e.target.value); fetchModels(e.target.value); }}
              placeholder="Ej: Jetta, RAV4, Lobo, Ninja..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'Inter,sans-serif', color: '#1a1a1a', background: 'transparent' }}
            />
            {query && <button onClick={() => { setQuery(''); fetchModels(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 0, fontSize: 18 }}>×</button>}
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ width: 14, height: 14, border: '2px solid #eee', borderTop: '2px solid #1a1a1a', borderRadius: '50%', animation: 'spin .6s linear infinite' }}/>
                <span style={{ fontSize: 12, color: '#bbb' }}>Buscando...</span>
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#bbb' }}>
                Sin resultados · intenta con otra búsqueda
              </div>
            ) : results.map((m, i) => {
              const isSel = selected?.make === m.make && selected?.model === m.model;
              return (
                <button key={`${m.make}-${m.model}`} type="button" onClick={() => handleSelect(m)}
                  style={{
                    width: '100%', padding: '11px 14px', border: 'none', cursor: 'pointer',
                    background: isSel ? '#f5f5f5' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontFamily: 'Inter,sans-serif', textAlign: 'left',
                    borderBottom: i < results.length - 1 ? '1px solid #fafafa' : 'none',
                  }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{CATEGORY_ICONS[m.category]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{m.make} </span>
                    <span style={{ fontSize: 13, color: '#1a1a1a' }}>{m.model}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', background: '#f0f0f0', color: '#888', borderRadius: 4, padding: '2px 6px' }}>
                      {CATEGORY_LABELS[m.category]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>${pricing[m.category]}</span>
                  </div>
                </button>
              );
            })}
            {!loading && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>
                  ¿No encuentras tu modelo?
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availableCategories.map(cat => (
                    <button key={cat} type="button"
                      onClick={() => handleSelect({ make: 'Otro', model: CATEGORY_LABELS[cat], category: cat })}
                      style={{ padding: '7px 12px', background: '#f5f5f5', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#444', cursor: 'pointer', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} · ${pricing[cat]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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

  // Form state
  const [selectedModel, setSelected] = useState<CarModel | null>(null);
  const [plate, setPlate]             = useState('');
  const [name,  setName]              = useState('');

  const pendingSubmit = useRef(false);
  const PENDING_KEY   = `pm_pending_${eventId}_${parkingId}`;

  const idx   = Number(String(eventId).replace(/\D/g, '').slice(-1) || 0) % CARD_COLORS.length;
  const color = CARD_COLORS[idx];

  // Load event + parking
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "";
    Promise.all([
      fetch(`${API}/api/v1/events/${eventId}`).then(r => r.json()),
      fetch(`${API}/api/v1/events/${eventId}/parkings`).then(r => r.json()),
    ]).then(([ed, pd]) => {
      setEvent(ed.data);
      const pk = (pd.data as ParkingDetail[]).find(p => p.id === parkingId);
      setParking(pk ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [eventId, parkingId]);

  // Restaurar formulario guardado + pre-fill nombre del usuario
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Restaurar datos guardados antes del login redirect
    const saved = sessionStorage.getItem(PENDING_KEY);
    if (saved) {
      sessionStorage.removeItem(PENDING_KEY);
      try {
        const { selectedModel: sm, plate: p, name: n } = JSON.parse(saved);
        if (sm) setSelected(sm);
        if (p)  setPlate(p);
        if (n)  setName(n);
        if (token) pendingSubmit.current = true; // auto-disparar al tener datos
      } catch {}
      return; // datos ya restaurados, no sobreescribir con perfil
    }

    // Pre-fill nombre desde perfil si ya hay sesión
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.data?.name) setName(d.data.name);
    }).catch(() => {});
  }, []);

  // Auto-disparar reserva cuando el formulario esté completo y venga de login
  useEffect(() => {
    if (!pendingSubmit.current) return;
    if (!selectedModel || plate.trim().length < 3 || name.trim().length < 2) return;
    pendingSubmit.current = false;
    handleReserve();
  }, [selectedModel, plate, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReserve = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Guardar formulario antes de redirigir al login
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ selectedModel, plate, name }));
      router.push(`/login?next=/eventos/${eventId}/parking/${parkingId}`);
      return;
    }
    if (!parking || !selectedModel || plate.trim().length < 3 || !name.trim()) return;

    setReserving(true);
    setError('');

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "";

      // 1 — Crear reservación
      const res1 = await fetch(`${API}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: String(eventId), parkingId: String(parkingId) }),
      });
      const data1 = await res1.json();
      if (!res1.ok) {
        setError(data1.message || 'Sin lugares disponibles');
        return;
      }
      const reservationId = data1.reservation.id;

      // 2 — Guardar datos del vehículo
      await fetch(`${API}/api/v1/reservations/${reservationId}/vehicle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plate: plate.trim().toUpperCase(),
          make:  selectedModel.make,
          model: selectedModel.model,
          type:  selectedModel.category,
        }),
      });

      // 3 — Actualizar nombre del usuario (fire and forget)
      fetch(`${API}/api/v1/users/me`, {
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

  const price      = selectedModel ? (parking.pricing[selectedModel.category] ?? 0) : null;
  const soldOut    = parking.available === 0;
  const canReserve = !!selectedModel && plate.trim().length >= 3 && name.trim().length >= 2 && !soldOut && !reserving;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs';

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .pp-page { min-height:100vh; background:#EDEDED; }

        /* Hero */
        .pp-hero { padding:20px 16px 0; }
        @media(min-width:640px){ .pp-hero { padding:24px 32px 0; } }
        @media(min-width:1024px){ .pp-hero { padding:28px 56px 8px; } }

        /* Body */
        .pp-body { padding:12px 16px 160px; }
        @media(min-width:640px){ .pp-body { padding:16px 32px 160px; } }
        @media(min-width:1024px){
          .pp-body { display:grid; grid-template-columns:1fr 1fr; gap:16px;
            padding:16px 56px 60px;
            align-items:start; }
        }

        /* Columns */
        .pp-col { display:flex; flex-direction:column; gap:12px; }

        /* Sections */
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

        /* Input */
        .pp-input { width:100%; padding:14px 16px; background:#f5f5f5; border:2px solid transparent;
          border-radius:12px; font-size:14px; font-weight:500; color:#1a1a1a;
          font-family:Inter,sans-serif; outline:none; transition:border-color .15s; box-sizing:border-box; }
        .pp-input:focus { border-color:#1a1a1a; background:#fff; }
        .pp-input::placeholder { color:#bbb; font-weight:400; }
        .pp-label { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase;
          color:#bbb; display:block; margin-bottom:7px; }
        .pp-plate { text-transform:uppercase; letter-spacing:3px; font-weight:700; font-size:16px; }

        /* CTA fija — solo en móvil/tablet */
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

        /* CTA inline — solo en desktop */
        .pp-cta-desk { display:none; }
        @media(min-width:1024px){
          .pp-cta-desk { display:flex; align-items:center; justify-content:space-between; gap:16px;
            background:#fff; border-radius:16px; padding:20px 18px; }
        }
      `}</style>

      <div className="pp-page">
        <header className="pm-header" style={{ background: color.bg }}>
          <button className="pm-back" onClick={() => router.back()}>← Elegir otro</button>
          <span className="pm-logo">Park<span>MX</span></span>
        </header>

        {/* Hero estacionamiento */}
        <div className="pp-hero">
          <div style={{ paddingTop: 18, paddingBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#bbb', marginBottom: 6 }}>
              ESTACIONAMIENTO
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.4px', color: '#1a1a1a', margin: 0 }}>
              {parking.name}
            </h1>
            <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
              📍 {parking.address}
            </p>
          </div>
        </div>

        <div className="pp-body">

          {/* Columna izquierda: info de la reservación */}
          <div className="pp-col">
            {/* Detalles del evento */}
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

            {/* Incluye */}
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

          {/* Columna derecha: formulario + CTA */}
          <div className="pp-col">
            {/* Datos del vehículo y titular */}
            <div className="pp-sec">
              <div className="pp-sec-hd"><span className="pp-sec-lb">Tu vehículo y datos</span></div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Selector de modelo */}
                <div>
                  <span className="pp-label">Marca y modelo</span>
                  <ModelDropdown pricing={parking.pricing} selected={selectedModel} onSelect={setSelected}/>
                  {selectedModel && (
                    <div style={{ marginTop: 8, padding: '9px 14px', background: '#f0fdf4', borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: 12, color: '#166534' }}>
                        {CATEGORY_ICONS[selectedModel.category]} {CATEGORY_LABELS[selectedModel.category]}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                        ${parking.pricing[selectedModel.category]} MXN
                      </span>
                    </div>
                  )}
                </div>

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

                {/* Nombre del titular */}
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

            {/* CTA inline para desktop */}
            <div className="pp-cta-desk">
              {price !== null ? (
                <div>
                  <div className="pp-cta-price">
                    ${price} <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>MXN</span>
                  </div>
                  <div className="pp-cta-sub">
                    {selectedModel
                      ? `${CATEGORY_ICONS[selectedModel.category]} ${selectedModel.make} ${selectedModel.model}`
                      : ''}
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

        {/* CTA fija */}
        <div className="pp-cta">
          {price !== null ? (
            <div>
              <div className="pp-cta-price">
                ${price} <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>MXN</span>
              </div>
              <div className="pp-cta-sub">
                {selectedModel
                  ? `${CATEGORY_ICONS[selectedModel.category]} ${selectedModel.make} ${selectedModel.model}`
                  : ''}
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
