'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

interface Venue {
  id: string; name: string; address: string;
  photoUrl: string; category: string;
  upcomingEvents: number; priceFrom: number | null;
}

const CATEGORIES = [
  { key: '',            label: 'Todos' },
  { key: 'conciertos',  label: 'Conciertos' },
  { key: 'deportes',    label: 'Deportes' },
  { key: 'teatro',      label: 'Teatro' },
  { key: 'festival',    label: 'Festival' },
];

const EMOJIS: Record<string, string> = {
  conciertos: '🎵', deportes: '⚽', teatro: '🎭', festival: '🎪',
};

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = category ? `?category=${category}` : '';
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/venues${q}`)
      .then(r => r.json())
      .then(d => setVenues(d.data || []))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .vp-root { min-height:100vh; background:#EDEDED; font-family:Inter,-apple-system,sans-serif; color:#1a1a1a; }
        .vp-header { display:flex; align-items:center; justify-content:space-between; padding:20px 16px 16px;
          position:sticky; top:0; background:rgba(237,237,237,0.94); backdrop-filter:blur(16px); z-index:100; }
        @media(min-width:640px){ .vp-header { padding:20px 32px 16px; } }
        @media(min-width:1024px){ .vp-header { padding:20px 56px 16px; } }
        .vp-filters { display:flex; overflow-x:auto; padding:0 16px; border-bottom:1px solid rgba(0,0,0,.07); scrollbar-width:none; }
        .vp-filters::-webkit-scrollbar { display:none; }
        .vp-filters::after { content:""; min-width:16px; flex-shrink:0; }
        @media(min-width:640px){ .vp-filters { padding:0 32px; } }
        @media(min-width:1024px){ .vp-filters { padding:0 56px; } }
        .vp-filter { padding:11px 16px; font-size:10px; font-weight:500; letter-spacing:2px; text-transform:uppercase;
          color:rgba(0,0,0,.3); background:transparent; border:none; border-bottom:1.5px solid transparent;
          cursor:pointer; white-space:nowrap; font-family:Inter,sans-serif; transition:all .2s; flex-shrink:0; }
        .vp-filter.active { color:#1a1a1a; border-bottom-color:#1a1a1a; }
        .vp-count { padding:14px 16px 0; font-size:10px; color:#bbb; letter-spacing:1.5px; text-transform:uppercase; }
        @media(min-width:640px){ .vp-count { padding:14px 32px 0; } }
        @media(min-width:1024px){ .vp-count { padding:14px 56px 0; } }
        .vp-feed { padding:12px 16px 80px; display:flex; flex-direction:column; gap:10px; }
        @media(min-width:640px){ .vp-feed { padding:16px 32px 80px; } }
        @media(min-width:1024px){ .vp-feed { padding:12px 56px 80px;
          display:grid; grid-template-columns:repeat(2,1fr); gap:12px; } }
        @media(min-width:1400px){ .vp-feed { grid-template-columns:repeat(3,1fr); } }
        .vp-card { background:#fff; border-radius:16px; overflow:hidden; text-decoration:none; color:inherit;
          display:grid; grid-template-columns:88px 1fr; width:100%; min-height:100px;
          transition:transform .2s ease, box-shadow .2s ease; animation:fadeIn .4s ease both; cursor:pointer; }
        @media(min-width:400px){ .vp-card { grid-template-columns:100px 1fr; } }
        @media(min-width:640px){ .vp-card { grid-template-columns:120px 1fr; min-height:110px; } }
        .vp-card:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.09); }
        .vp-visual { display:flex; align-items:center; justify-content:center; font-size:32px; position:relative; }
        @media(min-width:400px){ .vp-visual { font-size:38px; } }
        @media(min-width:640px){ .vp-visual { font-size:44px; } }
        .vp-vgrad { position:absolute; inset:0; background:radial-gradient(circle at 35% 35%, rgba(255,255,255,.45) 0%, transparent 65%); }
        .vp-emoji { position:relative; z-index:1; }
        .vp-body { padding:14px 16px; display:flex; flex-direction:column; justify-content:space-between; }
        .vp-cat { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; margin-bottom:4px; }
        .vp-name { font-size:15px; font-weight:600; color:#1a1a1a; letter-spacing:-.2px; }
        .vp-addr { font-size:12px; color:#bbb; margin-top:3px; }
        .vp-foot { display:flex; align-items:center; justify-content:space-between; margin-top:10px; }
        .vp-evts { font-size:10px; color:#bbb; letter-spacing:.5px; }
        .vp-price { font-size:13px; font-weight:600; color:#1a1a1a; }
        .vp-loading { text-align:center; padding:60px 0; color:#bbb; font-size:10px; letter-spacing:2px; text-transform:uppercase; }
      `}</style>

      <div className="vp-root">
        <header className="vp-header">
          <span className="pm-logo">Park<span>MX</span></span>
          <Link href="/" className="pm-nav-link">Eventos</Link>
        </header>

        <div className="vp-filters">
          {CATEGORIES.map(c => (
            <button key={c.key}
              className={`vp-filter${category === c.key ? ' active' : ''}`}
              onClick={() => setCategory(c.key)}>
              {c.label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="vp-count">{venues.length} venue{venues.length !== 1 ? 's' : ''}</p>
        )}

        <div className="vp-feed">
          {loading ? (
            <div className="vp-loading">Cargando venues...</div>
          ) : venues.length === 0 ? (
            <div className="vp-loading">Sin venues disponibles</div>
          ) : venues.map((v, i) => {
            const c = CARD_COLORS[i % CARD_COLORS.length];
            return (
              <div key={v.id} className="vp-card"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => router.push(`/venues/${v.id}`)}>
                <div className="vp-visual" style={{ background: c.bg }}>
                  <div className="vp-vgrad" />
                  <span className="vp-emoji">{EMOJIS[v.category] ?? '🎫'}</span>
                </div>
                <div className="vp-body">
                  <div>
                    <div className="vp-cat">{v.category}</div>
                    <div className="vp-name">{v.name}</div>
                    <div className="vp-addr">{v.address}</div>
                  </div>
                  <div className="vp-foot">
                    <span className="vp-evts">
                      {v.upcomingEvents > 0
                        ? `${v.upcomingEvents} evento${Number(v.upcomingEvents) !== 1 ? 's' : ''}`
                        : 'Sin eventos próximos'}
                    </span>
                    {v.priceFrom && (
                      <span className="vp-price">desde ${Number(v.priceFrom).toFixed(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
