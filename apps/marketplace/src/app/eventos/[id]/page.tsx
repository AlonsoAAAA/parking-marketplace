'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

interface EventDetail {
  id: string; name: string; venueName: string; startsAt: string; endsAt: string;
  price: number; totalSlots: number; slotsReserved: number; status: string;
  parkingName: string; parkingAddress: string; category?: string;
}

const MOCK: EventDetail = {
  id: '1', name: 'Natanael Cano', venueName: 'Foro Sol',
  startsAt: '2025-06-21T20:00:00', endsAt: '2025-06-22T00:00:00',
  price: 180, totalSlots: 150, slotsReserved: 63, status: 'active',
  parkingName: 'Estacionamiento Foro Sol Norte',
  parkingAddress: 'Viaducto Río de la Piedad 187, Iztacalco', category: 'REGIONAL MEX',
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState('');

  const idx = Number(String(params.id).replace(/\D/g,'').slice(-1) || 0) % CARD_COLORS.length;
  const color = CARD_COLORS[idx];
  const emojis = ['🎵','⚽','🎧','🎤','🎸'];
  const emoji = emojis[idx];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/${params.id}`)
      .then(r => r.json()).then(d => setEvent(d.data || MOCK))
      .catch(() => setEvent(MOCK)).finally(() => setLoading(false));
  }, [params.id]);

  const handleReserve = async () => {
    const token = localStorage.getItem('token');
    if (!token) { router.push(`/login?next=/eventos/${params.id}`); return; }
    setReserving(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId: params.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Sin lugares disponibles'); return; }
      router.push(`/checkout/${data.reservation.id}`);
    } catch { setError('Error de conexión.'); } finally { setReserving(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#EDEDED', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:24, height:24, border:'2px solid #ddd', borderTop:'2px solid #1a1a1a', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!event) return null;
  const avail = event.totalSlots - event.slotsReserved;
  const soldOut = avail === 0 || event.status === 'sold_out';
  const fillPct = Math.round((event.slotsReserved / event.totalSlots) * 100);

  return (
    <>
      <style>{SHARED_CSS + `
        .dir { display:flex; padding:14px 0; border-bottom:1px solid rgba(0,0,0,0.07); align-items:baseline; gap:12px; }
        .dik { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; width:60px; flex-shrink:0; }
        .div2 { font-size:14px; color:#1a1a1a; line-height:1.4; }
        .inc { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(0,0,0,0.05); font-size:13px; color:#444; }
        .chk { width:20px; height:20px; background:#1a1a1a; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cta { position:fixed; bottom:0; left:0; right:0; background:rgba(237,237,237,0.93); backdrop-filter:blur(16px); border-top:1px solid rgba(0,0,0,0.07); padding:16px 24px; display:flex; align-items:center; gap:16px; justify-content:space-between; z-index:50; }
        .sct { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; margin-bottom:12px; margin-top:28px; }
        .db { padding:28px 24px 120px; }
        @media(min-width:640px){ .db { padding:36px 40px 120px; max-width:560px; margin:0 auto; } }
        .abt { height:3px; background:rgba(0,0,0,0.08); border-radius:2px; overflow:hidden; margin-top:6px; }
        .abf { height:100%; border-radius:2px; }
        .dv { height:260px; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
        @media(min-width:640px){ .dv { height:340px; } }
        .stat-strip { display:grid; grid-template-columns:1fr 1fr 1fr; border-top:1px solid rgba(0,0,0,0.07); }
        .stat-cell { padding:14px 0; text-align:center; border-right:1px solid rgba(0,0,0,0.07); }
        .stat-cell:last-child { border-right:none; }
      `}</style>

      <div className="pm-page">
        <header className="pm-header" style={{ background: color.bg, paddingBottom:16 }}>
          <button className="pm-back" onClick={() => router.back()}>← Regresar</button>
          <span className="pm-logo">Park<span>MX</span></span>
        </header>

        <div style={{ background: color.bg }}>
          <div className="dv" style={{ background: color.accent }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.5) 0%, transparent 60%)' }} />
            <span style={{ fontSize:90, position:'relative', zIndex:1 }}>{emoji}</span>
            <div style={{ position:'absolute', bottom:16, left:24 }}>
              <div style={{ fontSize:9, fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(0,0,0,0.4)', marginBottom:6 }}>{event.category || 'EVENTO'}</div>
              <div style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:700, lineHeight:1.05, letterSpacing:'-0.5px', color: color.text }}>{event.name}</div>
              <div style={{ fontSize:13, color:'rgba(0,0,0,0.45)', marginTop:4 }}>{event.venueName}</div>
            </div>
          </div>

          <div className="stat-strip">
            {[[avail.toString(),'lugares'],[`$${event.price}`,'MXN'],['15 min','al venue']].map(([v,l],i) => (
              <div key={i} className="stat-cell">
                <div style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.5px', color: color.text }}>{v}</div>
                <div style={{ fontSize:9, fontWeight:500, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(0,0,0,0.35)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="db">
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

          <p className="sct">Estacionamiento</p>
          <div style={{ background: color.bg, borderRadius:12, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color: color.text, marginBottom:4 }}>{event.parkingName}</div>
            <div style={{ fontSize:12, color:'rgba(0,0,0,0.45)', marginBottom:12 }}>{event.parkingAddress}</div>
            <div style={{ fontSize:10, fontWeight:500, color:'rgba(0,0,0,0.4)', marginBottom:4, display:'flex', justifyContent:'space-between' }}>
              <span>Disponibilidad</span>
              <span style={{ fontWeight:600, color: color.text }}>{avail} / {event.totalSlots}</span>
            </div>
            <div className="abt">
              <div className="abf" style={{ width:`${fillPct}%`, background: avail<=15 ? '#e8954a' : color.text }} />
            </div>
          </div>

          <p className="sct">Incluye</p>
          {['Un lugar garantizado','Código QR de acceso único','Boleto por WhatsApp','Sin cobros al llegar'].map(item => (
            <div key={item} className="inc">
              <div className="chk">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#EDEDED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {item}
            </div>
          ))}
          {error && <div className="pm-error" style={{ marginTop:16 }}>{error}</div>}
        </div>

        <div className="cta">
          <div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px' }}>
              ${event.price} <span style={{ fontSize:11, fontWeight:500, color:'#999', letterSpacing:'1px' }}>MXN</span>
            </div>
            <div style={{ fontSize:10, color:'#bbb' }}>por lugar · sin cargos extra</div>
          </div>
          <button
            className="pm-btn-primary"
            onClick={handleReserve}
            disabled={soldOut || reserving}
            style={{ width:'auto', minWidth:140, opacity: soldOut ? 0.4 : 1 }}
          >
            {reserving ? 'Reservando...' : soldOut ? 'Agotado' : 'Reservar lugar'}
          </button>
        </div>
      </div>
    </>
  );
}
