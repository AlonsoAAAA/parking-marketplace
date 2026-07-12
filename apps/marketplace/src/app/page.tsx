'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, MapPin, Zap, ShieldCheck, Smartphone, CalendarX } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoBadge } from '@/components/ui/neo';

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

const BENEFITS = [
  { icon: Zap,         title: 'Lugar garantizado', text: 'Tu espacio te espera. Sin dar vueltas ni llegar horas antes.' },
  { icon: ShieldCheck, title: 'Seguro y privado',  text: 'Estacionamientos verificados cerca de tu evento.' },
  { icon: Smartphone,  title: 'Todo por WhatsApp', text: 'Tu boleto QR llega directo a tu teléfono.' },
  { icon: CalendarX,   title: 'Sin filas',          text: 'Muestra tu QR al llegar y entra directo.' },
];

export default function HomePage() {
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
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader />

      {/* Hero */}
      <section className="relative px-5 md:px-8 pt-14 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 z-0" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <NeoBadge color="purple" className="mb-7">Estacionamiento garantizado · CDMX</NeoBadge>
          <h1 className="font-extrabold text-4xl md:text-6xl mb-7 leading-tight text-on-surface uppercase tracking-tight [animation:fadeUp_.5s_ease_both]">
            Tu lugar seguro para{' '}
            <span className="bg-primary-container px-3 md:px-4 py-0.5 inline-block border-[3px] border-on-surface shadow-[3px_3px_0px_0px_#191c1d] -rotate-1">
              Eventos
            </span>
          </h1>
          <p className="font-medium text-sm md:text-lg mb-10 text-on-surface-variant max-w-2xl mx-auto leading-relaxed [animation:fadeUp_.5s_.1s_ease_both]">
            Deja de dar vueltas buscando lugar. Reserva tu espacio de estacionamiento
            para conciertos, partidos y festivales antes de llegar.
          </p>

          {/* Buscador */}
          <div className="max-w-lg mx-auto flex items-center gap-3 bg-white border-[3px] border-on-surface rounded-xl px-4 py-3.5 neo-brutal-shadow [animation:fadeUp_.5s_.2s_ease_both]">
            <Search className="w-4 h-4 text-on-surface flex-shrink-0" strokeWidth={3} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Busca un venue o ciudad..."
              className="flex-1 border-none outline-none bg-transparent font-sans font-semibold text-sm text-on-surface placeholder:text-on-surface/35"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda"
                className="cursor-pointer bg-transparent border-none p-0 flex items-center">
                <X className="w-4 h-4 text-on-surface/50" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filtros de categoría */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 md:px-8 pb-2 max-w-6xl mx-auto md:justify-center">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-[3px] border-on-surface transition-all duration-150 font-sans font-extrabold text-[11px] uppercase tracking-wider flex-shrink-0 cursor-pointer ${
              category === c.key
                ? 'bg-primary-container text-on-surface shadow-[3px_3px_0px_0px_#191c1d] -translate-y-0.5'
                : 'bg-white text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {c.key && <span>{CAT_EMOJIS[c.key]}</span>}
            {c.label}
          </button>
        ))}
      </div>

      {/* Contador */}
      {!loading && (
        <p className="px-5 md:px-8 pt-6 pb-1 max-w-6xl mx-auto font-extrabold text-[10px] tracking-[2px] uppercase text-on-surface-variant">
          {filtered.length} venue{filtered.length !== 1 ? 's' : ''} disponibles
        </p>
      )}

      {/* Feed de venues */}
      <div className="px-5 md:px-8 pt-3 pb-16 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-16 font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">
            Cargando venues...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">
            Sin resultados
          </div>
        ) : (
          filtered.map((v, i) => (
            <Link
              key={v.id}
              href={`/venues/${v.id}`}
              className="bg-white border-[3px] border-on-surface rounded-xl overflow-hidden neo-brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 no-underline flex flex-col [animation:fadeIn_.4s_ease_both]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="bg-primary-container border-b-[3px] border-on-surface h-24 flex items-center justify-center relative">
                <span className="text-4xl">{CAT_EMOJIS[v.category] ?? '🎫'}</span>
                <span className="absolute top-3 left-3 bg-white text-on-surface border-2 border-on-surface px-2.5 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-widest neo-brutal-shadow-sm">
                  {v.category || 'venue'}
                </span>
              </div>
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <div className="font-extrabold text-base text-on-surface uppercase tracking-tight leading-snug">{v.name}</div>
                  <div className="flex items-start gap-1.5 mt-1.5 text-on-surface-variant">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-xs font-semibold leading-snug">{v.address}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-dashed border-on-surface/15">
                  <span className="font-mono text-[11px] font-bold text-on-surface-variant">
                    {v.upcomingEvents > 0
                      ? `${v.upcomingEvents} evento${Number(v.upcomingEvents) !== 1 ? 's' : ''}`
                      : 'Sin eventos próximos'}
                  </span>
                  {v.priceFrom && (
                    <span className="bg-on-surface text-primary-container font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                      ${Number(v.priceFrom).toFixed(0)} MXN
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Beneficios */}
      <section className="px-5 md:px-8 py-14 bg-surface-container-low border-t-[3px] border-on-surface">
        <div className="max-w-6xl mx-auto">
          <NeoBadge color="lime" className="mb-5">Beneficios exclusivos</NeoBadge>
          <h2 className="font-extrabold text-2xl md:text-4xl text-on-surface mb-10 tracking-tight uppercase">
            ¿Por qué Estacionat?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-white border-[3px] border-on-surface rounded-xl p-5 neo-brutal-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                  <b.icon className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                <div className="font-extrabold text-sm text-on-surface uppercase tracking-tight mb-1.5">{b.title}</div>
                <div className="text-xs font-medium text-on-surface-variant leading-relaxed">{b.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 md:px-8 py-8 bg-on-surface text-center">
        <p className="font-extrabold text-xs uppercase tracking-widest text-primary-container mb-3">Estacionat</p>
        <div className="flex justify-center gap-6">
          <Link href="/terminos" className="text-white/60 text-[11px] font-semibold no-underline hover:text-white">Términos y condiciones</Link>
          <Link href="/privacidad" className="text-white/60 text-[11px] font-semibold no-underline hover:text-white">Privacidad</Link>
        </div>
      </footer>
    </div>
  );
}
