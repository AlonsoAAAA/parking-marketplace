'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CARD_COLORS, SHARED_CSS } from '@/lib/design';

interface Venue {
  id: string;
  name: string;
  address: string;
  category: string;
  upcomingEvents: number;
  priceFrom: number | null;
}

const MOCK_VENUES: Venue[] = [
  { id: 'v1', name: 'Foro Sol',                      address: 'Viaducto Río de la Piedad 187, CDMX',  category: 'conciertos', upcomingEvents: 3, priceFrom: 180 },
  { id: 'v2', name: 'Estadio Azteca',                address: 'Calzada de Tlalpan 3465, CDMX',        category: 'deportes',   upcomingEvents: 2, priceFrom: 220 },
  { id: 'v3', name: 'Autódromo Hermanos Rodríguez',  address: 'Ciudad Deportiva, CDMX',               category: 'festival',   upcomingEvents: 1, priceFrom: 350 },
  { id: 'v4', name: 'Palacio de los Deportes',       address: 'Av. del Conscripto 311, CDMX',         category: 'conciertos', upcomingEvents: 2, priceFrom: 200 },
  { id: 'v5', name: 'Palacio de Bellas Artes',       address: 'Av. Juárez s/n, Centro, CDMX',         category: 'teatro',     upcomingEvents: 1, priceFrom: 160 },
];

const CATEGORIES = [
  { key: '',           label: 'Todos'     },
  { key: 'conciertos', label: 'Conciertos'},
  { key: 'deportes',   label: 'Deportes'  },
  { key: 'festival',   label: 'Festival'  },
  { key: 'teatro',     label: 'Teatro'    },
];

const CAT_EMOJIS: Record<string, string> = {
  conciertos: '🎵', deportes: '⚽', festival: '🎪', teatro: '🎭',
};

export default function HomePage() {
  const router = useRouter();
  const [venues,   setVenues]   = useState<Venue[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = category ? `?category=${category}` : '';
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/venues${q}`)
      .then(r => r.json())
      .then(d => setVenues(d.data?.length ? d.data : MOCK_VENUES))
      .catch(() => setVenues(MOCK_VENUES))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = venues.filter(v =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.address ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .hp { min-height:100vh; background:#EDEDED; font-family:Inter,-apple-system,sans-serif; }

        /* Header */
        .hp-header { display:flex; align-items:center; justify-content:space-between;
          padding:20px 24px 16px; position:sticky; top:0;
          background:rgba(237,237,237,.95); backdrop-filter:blur(16px); z-index:100; }
        @media(min-width:640px){ .hp-header { padding:20px 40px 16px; } }
        @media(min-width:1024px){ .hp-header { padding:20px 56px 16px; } }

        /* Hero */
        .hp-hero { padding:36px 24px 32px; }
        @media(min-width:640px){ .hp-hero { padding:48px 40px 36px; } }
        @media(min-width:1024px){ .hp-hero { padding:56px 56px 40px; } }
        .hp-eyebrow { font-size:10px; font-weight:600; letter-spacing:3px;
          text-transform:uppercase; color:#bbb; margin-bottom:14px; }
        .hp-title { font-size:clamp(34px,6vw,58px); font-weight:700; letter-spacing:-.5px;
          color:#1a1a1a; line-height:1.04; margin-bottom:14px; }
        .hp-sub { font-size:14px; color:#888; font-weight:300; line-height:1.65;
          max-width:440px; margin-bottom:28px; }
        .hp-search { display:flex; align-items:center; gap:10px; background:#fff;
          border-radius:12px; padding:14px 18px; max-width:480px;
          box-shadow:0 1px 6px rgba(0,0,0,.07); }
        .hp-search input { flex:1; border:none; outline:none; font-size:14px;
          font-family:Inter,sans-serif; color:#1a1a1a; background:transparent; }
        .hp-search input::placeholder { color:#bbb; }

        /* Filters */
        .hp-filters { display:flex; overflow-x:auto; padding:0 24px;
          border-bottom:1px solid rgba(0,0,0,.07); scrollbar-width:none; }
        .hp-filters::-webkit-scrollbar { display:none; }
        .hp-filters::after { content:""; min-width:24px; flex-shrink:0; }
        @media(min-width:640px){ .hp-filters { padding:0 40px; } }
        @media(min-width:1024px){ .hp-filters { padding:0 56px; } }
        .hp-filter { padding:12px 16px; font-size:10px; font-weight:500; letter-spacing:2px;
          text-transform:uppercase; color:rgba(0,0,0,.3); background:transparent;
          border:none; border-bottom:2px solid transparent; cursor:pointer;
          white-space:nowrap; font-family:Inter,sans-serif; transition:all .2s; flex-shrink:0; }
        .hp-filter.on { color:#1a1a1a; border-bottom-color:#1a1a1a; }

        /* Count */
        .hp-count { padding:16px 24px 4px; font-size:10px; color:#bbb;
          letter-spacing:1.5px; text-transform:uppercase; }
        @media(min-width:640px){ .hp-count { padding:16px 40px 4px; } }
        @media(min-width:1024px){ .hp-count { padding:16px 56px 4px; } }

        /* Feed */
        .hp-feed { padding:12px 24px 80px; display:flex; flex-direction:column; gap:10px; }
        @media(min-width:640px){ .hp-feed { padding:16px 40px 80px; } }
        @media(min-width:1024px){ .hp-feed { padding:12px 56px 80px;
          display:grid; grid-template-columns:repeat(2,1fr); gap:12px; } }
        @media(min-width:1400px){ .hp-feed { grid-template-columns:repeat(3,1fr); } }

        /* Card */
        .hp-card { background:#fff; border-radius:18px; overflow:hidden; cursor:pointer;
          display:grid; grid-template-columns:96px 1fr; min-height:106px;
          transition:transform .2s ease, box-shadow .2s ease;
          animation:fadeIn .4s ease both; text-decoration:none; color:inherit; }
        @media(min-width:400px){ .hp-card { grid-template-columns:108px 1fr; } }
        .hp-card:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.09); }
        .hp-visual { display:flex; align-items:center; justify-content:center;
          font-size:34px; position:relative; flex-shrink:0; }
        .hp-vgrad { position:absolute; inset:0;
          background:radial-gradient(circle at 35% 35%, rgba(255,255,255,.45) 0%, transparent 65%); }
        .hp-emoji { position:relative; z-index:1; }
        .hp-body { padding:14px 16px; display:flex; flex-direction:column; justify-content:space-between; }
        .hp-cat  { font-size:9px; font-weight:600; letter-spacing:2px;
          text-transform:uppercase; color:#bbb; margin-bottom:4px; }
        .hp-name { font-size:15px; font-weight:600; color:#1a1a1a; letter-spacing:-.2px; }
        .hp-addr { font-size:11px; color:#bbb; margin-top:3px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hp-foot { display:flex; align-items:center; justify-content:space-between; margin-top:10px; gap:8px; }
        .hp-evts  { font-size:10px; color:#bbb; }
        .hp-price { font-size:13px; font-weight:600; color:#1a1a1a; white-space:nowrap; }
        .hp-empty { text-align:center; padding:64px 0; color:#bbb;
          font-size:10px; letter-spacing:2px; text-transform:uppercase; }
      `}</style>

      <div className="hp">
        <header className="hp-header">
          <Link href="/" className="pm-logo">Estaciona<span>t</span></Link>
          <Link href="/mis-boletos" className="pm-nav-link">Mis boletos</Link>
        </header>

        <div className="hp-hero">
          <p className="hp-eyebrow">Ciudad de México · 2026</p>
          <h1 className="hp-title">Estacionamiento<br />para eventos.</h1>
          <p className="hp-sub">
            Reserva tu lugar antes de llegar. Sin filas, sin vueltas —
            tu espacio garantizado para conciertos, partidos y festivales en CDMX.
          </p>
          <div className="hp-search">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
              style={{ flexShrink: 0, opacity: .25 }}>
              <circle cx="5.5" cy="5.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.4"/>
              <path d="M9 9L12 12" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Busca un venue o ciudad..."
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background:'none', border:'none', cursor:'pointer',
                  color:'#bbb', fontSize:18, lineHeight:1, padding:0 }}>
                ×
              </button>
            )}
          </div>
        </div>

        <div className="hp-filters">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`hp-filter${category === c.key ? ' on' : ''}`}
              onClick={() => setCategory(c.key)}>
              {c.label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="hp-count">
            {filtered.length} venue{filtered.length !== 1 ? 's' : ''} disponibles
          </p>
        )}

        <div className="hp-feed">
          {loading ? (
            <div className="hp-empty">Cargando venues...</div>
          ) : filtered.length === 0 ? (
            <div className="hp-empty">Sin resultados</div>
          ) : (
            filtered.map((v, i) => {
              const c = CARD_COLORS[i % CARD_COLORS.length];
              return (
                <Link
                  key={v.id}
                  href={`/venues/${v.id}`}
                  className="hp-card"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="hp-visual" style={{ background: c.bg }}>
                    <div className="hp-vgrad"/>
                    <span className="hp-emoji">{CAT_EMOJIS[v.category] ?? '🎫'}</span>
                  </div>
                  <div className="hp-body">
                    <div>
                      <div className="hp-cat">{(v.category || 'venue').toUpperCase()}</div>
                      <div className="hp-name">{v.name}</div>
                      <div className="hp-addr">📍 {v.address}</div>
                    </div>
                    <div className="hp-foot">
                      <span className="hp-evts">
                        {v.upcomingEvents > 0
                          ? `${v.upcomingEvents} evento${Number(v.upcomingEvents) !== 1 ? 's' : ''}`
                          : 'Sin eventos próximos'}
                      </span>
                      {v.priceFrom && (
                        <span className="hp-price">
                          desde ${Number(v.priceFrom).toFixed(0)} MXN
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
