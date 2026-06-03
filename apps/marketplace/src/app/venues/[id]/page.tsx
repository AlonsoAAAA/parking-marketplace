'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

interface Venue {
  id: string; name: string; address: string;
  photoUrl: string; category: string; capacity: number;
}
interface EventItem {
  id: string; name: string; category: string; status: string;
  startsAt: string; price: number; totalSlots: number; slotsReserved: number;
}

const EMOJIS = ['🎵','⚽','🎧','🎤','🎸'];

export default function VenuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL;
    Promise.all([
      fetch(`${API}/api/v1/venues/${id}`).then(r => r.json()),
      fetch(`${API}/api/v1/venues/${id}/events`).then(r => r.json()),
    ]).then(([vd, ed]) => {
      setVenue(vd.data);
      setEvents(ed.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#EDEDED', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:24,height:24,border:'2px solid #ddd',borderTop:'2px solid #1a1a1a',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!venue) return null;

  // Color basado en categoría
  const colorIdx = ['conciertos','deportes','teatro','festival'].indexOf(venue.category) % CARD_COLORS.length;
  const color = CARD_COLORS[Math.max(0, colorIdx)];

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .vd { min-height:100vh; background:#EDEDED; }
        .vd-hero { height:240px; display:flex; align-items:flex-end; position:relative; overflow:hidden; }
        @media(min-width:640px){ .vd-hero { height:320px; } }
        @media(min-width:1024px){ .vd-hero { height:400px; } }
        .vd-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .vd-overlay { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,.05), rgba(0,0,0,.6)); }
        .vd-meta { position:relative; z-index:1; padding:0 24px 24px; }
        @media(min-width:1024px){ .vd-meta { padding:0 56px 32px; } }
        .vd-cat { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,.55); margin-bottom:6px; }
        .vd-name { font-size:clamp(24px,4vw,44px); font-weight:700; color:#fff; letter-spacing:-.5px; line-height:1.05; }
        .vd-addr { font-size:13px; color:rgba(255,255,255,.6); margin-top:6px; }
        .vd-body { padding:0 24px 80px; }
        @media(min-width:640px){ .vd-body { padding:0 40px 80px; } }
        @media(min-width:1024px){ .vd-body { padding:0 56px 80px; } }
        .vd-sec { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; margin:24px 0 12px; }
        .ev-grid { display:flex; flex-direction:column; gap:10px; }
        @media(min-width:1024px){ .ev-grid { display:grid; grid-template-columns:repeat(2,1fr); } }
        @media(min-width:1400px){ .ev-grid { grid-template-columns:repeat(3,1fr); } }
        .ev-card { background:#fff; border-radius:16px; overflow:hidden; text-decoration:none; color:inherit;
          display:grid; grid-template-columns:80px 1fr; cursor:pointer;
          transition:transform .2s, box-shadow .2s; animation:fadeIn .35s ease both; }
        @media(min-width:640px){ .ev-card { grid-template-columns:96px 1fr; } }
        .ev-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.08); }
        .ev-visual { display:flex; align-items:center; justify-content:center; font-size:28px; position:relative; }
        .ev-vg { position:absolute; inset:0; background:radial-gradient(circle at 35% 35%, rgba(255,255,255,.45) 0%, transparent 65%); }
        .ev-em { position:relative; z-index:1; }
        .ev-body { padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between; }
        .ev-cat { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; }
        .ev-name { font-size:14px; font-weight:600; color:#1a1a1a; letter-spacing:-.2px; margin-top:2px; }
        .ev-date { font-size:11px; color:#bbb; margin-top:2px; }
        .ev-foot { display:flex; align-items:center; justify-content:space-between; margin-top:8px; gap:8px; }
        .ev-avail { font-size:10px; color:#bbb; }
        .ev-price { font-size:13px; font-weight:600; color:#1a1a1a; white-space:nowrap; }
        .ev-none { padding:40px 0; text-align:center; font-size:11px; color:#bbb; letter-spacing:1.5px; text-transform:uppercase; }
      `}</style>

      <div className="vd">
        <header className="pm-header" style={{ position:'absolute', width:'100%', zIndex:10 }}>
          <button className="pm-back" style={{ color:'rgba(255,255,255,.75)' }}
            onClick={() => router.push('/venues')}>← Venues</button>
          <span className="pm-logo" style={{ color:'rgba(255,255,255,.8)' }}>Park<span style={{ color:'rgba(255,255,255,.4)' }}>MX</span></span>
        </header>

        <div className="vd-hero" style={{ background: color.accent }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="vd-img" src={venue.photoUrl} alt={venue.name} />
          <div className="vd-overlay" />
          <div className="vd-meta">
            <div className="vd-cat">{venue.category}</div>
            <div className="vd-name">{venue.name}</div>
            <div className="vd-addr">📍 {venue.address}</div>
          </div>
        </div>

        <div className="vd-body">
          <p className="vd-sec">Próximos eventos</p>

          {events.length === 0 ? (
            <div className="ev-none">Sin eventos próximos</div>
          ) : <div className="ev-grid">{events.map((ev, i) => {
            const c = CARD_COLORS[i % CARD_COLORS.length];
            const avail = ev.totalSlots - ev.slotsReserved;
            const low = avail > 0 && avail <= 20;
            const soldOut = avail === 0;
            const d = new Date(ev.startsAt);
            return (
              <div key={ev.id} className="ev-card"
                style={{ animationDelay:`${i * .05}s` }}
                onClick={() => router.push(`/eventos/${ev.id}`)}>
                <div className="ev-visual" style={{ background: c.bg }}>
                  <div className="ev-vg" />
                  <span className="ev-em">{EMOJIS[i % EMOJIS.length]}</span>
                </div>
                <div className="ev-body">
                  <div>
                    <div className="ev-cat">{ev.category}</div>
                    <div className="ev-name">{ev.name}</div>
                    <div className="ev-date">
                      {d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})} · {d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})} hrs
                    </div>
                  </div>
                  <div className="ev-foot">
                    <span className="ev-avail" style={{ color: soldOut ? '#991b1b' : low ? '#9a3412' : undefined }}>
                      {soldOut ? 'Agotado' : low ? `${avail} quedan` : `${avail} lugares`}
                    </span>
                    <span className="ev-price">desde ${ev.price} MXN</span>
                  </div>
                </div>
              </div>
            );
          })}</div>}
        </div>
      </div>
    </>
  );
}
