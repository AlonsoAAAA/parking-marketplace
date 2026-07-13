'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, X, MapPin, Zap, ShieldCheck, Smartphone, Clock,
  Calendar, CalendarX, Building2, Car,
} from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import NeoFooter from '@/components/ui/NeoFooter';
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

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

      {/* ── Hero ── */}
      <section className="relative px-5 md:px-8 pt-14 pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 z-0" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <NeoBadge color="purple" className="mb-7">Estacionamiento garantizado · CDMX</NeoBadge>
          <h1 className="font-extrabold text-4xl md:text-6xl mb-7 leading-tight text-on-surface uppercase tracking-tight [animation:fadeUp_.5s_ease_both]">
            Tu lugar seguro para{' '}
            <span className="bg-primary-container px-3 md:px-4 py-0.5 inline-block border-[3px] border-on-surface shadow-[3px_3px_0px_0px_#191c1d] -rotate-1">
              Eventos
            </span>
          </h1>
          <p className="font-medium text-sm md:text-lg mb-9 text-on-surface-variant max-w-2xl mx-auto leading-relaxed [animation:fadeUp_.5s_.1s_ease_both]">
            Deja de dar vueltas buscando lugar. Reserva tu espacio de estacionamiento
            para conciertos, partidos y festivales antes de llegar.
          </p>

          {/* Buscador */}
          <div className="max-w-lg mx-auto flex items-center gap-3 bg-white border-[3px] border-on-surface rounded-xl px-4 py-3.5 neo-brutal-shadow mb-8 [animation:fadeUp_.5s_.2s_ease_both]">
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

          {/* CTAs del demo */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center [animation:fadeUp_.5s_.3s_ease_both]">
            <button
              onClick={() => scrollTo('venues')}
              className="w-full sm:w-auto bg-primary-container px-9 py-4 rounded-xl border-[3px] border-on-surface neo-brutal-shadow active-press font-sans font-extrabold text-sm uppercase tracking-wider text-on-surface cursor-pointer"
            >
              Reservar mi lugar
            </button>
            <button
              onClick={() => scrollTo('socios')}
              className="w-full sm:w-auto bg-white px-9 py-4 rounded-xl border-[3px] border-on-surface neo-brutal-shadow active-press font-sans font-extrabold text-sm uppercase tracking-wider text-on-surface cursor-pointer"
            >
              Soy dueño de estacionamiento
            </button>
          </div>
        </div>

        {/* Card flotante decorativa */}
        <div className="hidden lg:block absolute right-12 bottom-10 w-72 bg-white border-[3px] border-on-surface rounded-xl neo-shadow-lg p-5 rotate-3">
          <div className="flex justify-between items-start mb-3.5">
            <span className="bg-secondary-container text-white px-3 py-1 rounded-full font-mono text-[10px] font-bold border-2 border-on-surface">
              Activo ahora
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm">
              <Zap className="w-4 h-4 text-primary fill-current" />
            </div>
          </div>
          <div className="font-extrabold text-base text-on-surface uppercase tracking-tight mb-1.5">Estadio Azteca</div>
          <div className="text-on-surface-variant text-[11px] font-bold font-mono">
            Ubicación premium · desde $180 MXN
          </div>
        </div>
      </section>

      {/* ── Filtros ── */}
      <div id="venues" className="flex gap-3 overflow-x-auto no-scrollbar px-5 md:px-8 pb-2 max-w-6xl mx-auto md:justify-center scroll-mt-20">
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

      {/* ── Feed de venues ── */}
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

      {/* ── Bento grid de beneficios (del demo) ── */}
      <section className="px-5 md:px-8 py-16 bg-surface-container-low border-y-[3px] border-on-surface">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center md:text-left">
            <NeoBadge color="lime" className="mb-4">Beneficios exclusivos</NeoBadge>
            <h2 className="font-extrabold text-3xl md:text-4xl text-on-surface mb-3 tracking-tight uppercase">
              Estacionamiento inteligente,<br className="hidden md:block" /> sin complicaciones
            </h2>
            <p className="font-medium text-sm text-on-surface-variant max-w-xl md:mx-0 mx-auto">
              Todo lo que necesitas para llegar a tu evento sin estrés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1 — Ahorro de tiempo (col-span-2, blanco) */}
            <div className="md:col-span-2 bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6">
              <div className="w-11 h-11 rounded-lg bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                <Clock className="w-5.5 h-5.5 text-primary" strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-lg text-on-surface uppercase tracking-tight mb-2">Ahorro real de tiempo</h3>
              <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed mb-5">
                Nada de llegar 2 horas antes ni dar vueltas a la manzana. Tu lugar ya está apartado cuando llegas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 bg-[#fff0f0] border-2 border-on-surface rounded-xl px-4 py-3">
                  <p className="font-extrabold text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Tiempo promedio de búsqueda</p>
                  <p className="font-mono font-bold text-lg text-[#991b1b] line-through">25 minutos</p>
                </div>
                <div className="flex-1 bg-primary-container border-2 border-on-surface rounded-xl px-4 py-3 neo-brutal-shadow-sm">
                  <p className="font-extrabold text-[9px] uppercase tracking-widest text-on-surface/60 mb-1">Con Estacionat</p>
                  <p className="font-mono font-bold text-lg text-on-surface">¡0 minutos!</p>
                </div>
              </div>
            </div>

            {/* 2 — Reserva anticipada (lime) */}
            <div className="bg-primary-container border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6">
              <div className="w-11 h-11 rounded-lg bg-white border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                <Calendar className="w-5.5 h-5.5 text-on-surface" strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-lg text-on-surface uppercase tracking-tight mb-2">Reserva anticipada</h3>
              <p className="text-[13px] font-medium text-on-surface/70 leading-relaxed">
                Asegura tu lugar días o semanas antes del concierto, partido o festival.
              </p>
            </div>

            {/* 3 — Boleto digital (blanco) */}
            <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6">
              <div className="w-11 h-11 rounded-lg bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                <Smartphone className="w-5.5 h-5.5 text-primary" strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-lg text-on-surface uppercase tracking-tight mb-2">Boleto digital QR</h3>
              <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed">
                Tu acceso llega por WhatsApp. Muestra el QR al llegar y entra directo.
              </p>
            </div>

            {/* 4 — Garantizado (col-span-2, lime) */}
            <div className="md:col-span-2 bg-primary-container border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6">
              <div className="w-11 h-11 rounded-lg bg-white border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                <ShieldCheck className="w-5.5 h-5.5 text-on-surface" strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-lg text-on-surface uppercase tracking-tight mb-2">Lugar 100% garantizado</h3>
              <p className="text-[13px] font-medium text-on-surface/70 leading-relaxed">
                Aunque el evento esté agotado y las calles llenas, tu espacio te espera.
                Estacionamientos privados y verificados cerca de tu venue.
              </p>
            </div>

            {/* 5 — Cancelación flexible (col-span-2, blanco) */}
            <div className="md:col-span-2 bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6 flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex-1">
                <div className="w-11 h-11 rounded-lg bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                  <CalendarX className="w-5.5 h-5.5 text-primary" strokeWidth={2.5} />
                </div>
                <h3 className="font-extrabold text-lg text-on-surface uppercase tracking-tight mb-2">Cancelación flexible</h3>
                <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed">
                  ¿Cambiaron tus planes? Solicita tu reembolso hasta 6 horas antes del evento directamente desde tu boleto.
                </p>
              </div>
              <div className="bg-[#fff0f0] border-2 border-on-surface rounded-xl px-5 py-4 flex-shrink-0 self-center">
                <p className="font-mono font-bold text-2xl text-[#991b1b]">-6h</p>
                <p className="font-extrabold text-[9px] uppercase tracking-widest text-on-surface-variant mt-1">Reembolso 100%</p>
              </div>
            </div>

            {/* 6 — Pensión mensual (azul, próximamente) */}
            <div className="bg-secondary-container border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6 text-white">
              <div className="w-11 h-11 rounded-lg bg-white border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-4">
                <Building2 className="w-5.5 h-5.5 text-on-surface" strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-lg uppercase tracking-tight mb-2">Pensión mensual</h3>
              <p className="text-[13px] font-medium text-white/75 leading-relaxed mb-4">
                Un lugar fijo para tu día a día, cerca de tu casa u oficina.
              </p>
              <span className="inline-block bg-white text-on-surface border-2 border-on-surface px-3 py-1 rounded-full font-extrabold text-[10px] uppercase tracking-widest neo-brutal-shadow-sm">
                Próximamente
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA conductores ── */}
      <section className="px-5 md:px-8 py-16">
        <div className="max-w-3xl mx-auto bg-white border-[3px] border-on-surface rounded-xl neo-shadow-lg p-8 md:p-12 text-center relative overflow-hidden">
          <Car className="absolute -right-6 -bottom-6 w-40 h-40 text-on-surface/5" strokeWidth={1.5} />
          <div className="relative z-10">
            <NeoBadge color="lime" className="mb-5">Comienza hoy</NeoBadge>
            <h2 className="font-extrabold text-2xl md:text-4xl text-on-surface uppercase tracking-tight mb-3">
              ¿Listo para estacionar de forma inteligente?
            </h2>
            <p className="font-medium text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed mb-8">
              Encuentra tu venue, elige tu estacionamiento y recibe tu boleto QR en minutos.
            </p>
            <button
              onClick={() => scrollTo('venues')}
              className="bg-primary-container px-10 py-4 rounded-xl border-[3px] border-on-surface neo-brutal-shadow active-press font-sans font-extrabold text-sm uppercase tracking-wider text-on-surface cursor-pointer"
            >
              Buscar estacionamiento
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA Socios / Host ── */}
      <section id="socios" className="px-5 md:px-8 pb-20 scroll-mt-20">
        <div className="max-w-4xl mx-auto bg-midnight border-[3px] border-on-surface rounded-xl shadow-[6px_6px_0px_0px_#FF6478] p-8 md:p-12 relative overflow-hidden">
          <span className="absolute top-4 right-5 font-mono text-[10px] font-bold text-white/30 tracking-widest">ESTACIONAT SOCIOS</span>
          <NeoBadge color="lime" className="mb-5">Para propietarios y valet</NeoBadge>
          <h2 className="font-extrabold text-2xl md:text-4xl text-white uppercase tracking-tight mb-4 max-w-xl">
            Aumenta las ventas de tu estacionamiento
          </h2>
          <p className="font-medium text-sm text-white/60 max-w-xl leading-relaxed mb-8">
            Publica tus espacios para eventos masivos, controla la ocupación en tiempo real,
            aprovecha precios dinámicos y valida accesos con nuestro escáner de boletos QR.
          </p>
          <a
            href="mailto:soporte@estacionat.mx?subject=Quiero%20ser%20socio%20de%20Estacionat"
            className="inline-block bg-primary-container px-9 py-4 rounded-xl border-[3px] border-on-surface neo-brutal-shadow active-press font-sans font-extrabold text-sm uppercase tracking-wider text-on-surface no-underline"
          >
            Quiero ser socio
          </a>
        </div>
      </section>

      <NeoFooter />
    </div>
  );
}
