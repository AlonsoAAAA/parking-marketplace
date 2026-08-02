'use client';
import { useState, useEffect } from 'react';
import {
  Search, Sparkles, ShieldCheck, Car, QrCode, Clock, Zap, MapPin,
  Calendar, Building2, Star, CheckCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BePartnerModal from '@/components/BePartnerModal';

interface Venue {
  id: string;
  name: string;
  address: string;
  category: string;
  upcomingEvents: number;
  priceFrom: number | null;
  photoUrl?: string;
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
  { icon: ShieldCheck, bg: 'bg-[#DFF085]/20', fg: 'text-brand-dark', title: '100% garantizado', text: 'Tu cajón está apartado y bloqueado en nuestro sistema antes de que salgas de casa. No compitas por lugar.' },
  { icon: QrCode,      bg: 'bg-[#383497]/10', fg: 'text-[#383497]', title: 'WhatsApp QR Access', text: 'Recibe de inmediato el pase QR directo en tu WhatsApp. No requieres descargar ninguna app adicional.' },
  { icon: Clock,       bg: 'bg-indigo-50',    fg: 'text-indigo-700', title: 'Cancelación flexible', text: '¿Hubo cambios de planes? Cancela con reembolso escalonado según tu anticipación, hasta 6 horas antes del evento.' },
  { icon: Zap,         bg: 'bg-[#aecfb2]/20', fg: 'text-brand-dark', title: 'Cero filas o demoras', text: 'Acceso automatizado leyendo tus placas. Entra rápido y sal con agilidad sin hacer filas de cobro.' },
];

const TESTIMONIALS = [
  { initials: 'AR', bg: 'bg-[#04210f]', name: 'Alejandro Ruiz', event: 'Concierto Luis Miguel', text: 'Increíble servicio. Llegué al Auditorio Nacional y mi lugar ya estaba listo. Me ahorré más de 40 minutos de tráfico intentando buscar en la calle.' },
  { initials: 'MS', bg: 'bg-[#383497]', name: 'Mariana Soto', event: 'Clásico Nacional MX', text: 'Es la primera vez que no sufro buscando estacionamiento en el Estadio Azteca. El código QR llegó súper rápido por WhatsApp y el lector de placas funcionó perfecto.' },
];

export default function HomePage() {
  const [venues,   setVenues]   = useState<Venue[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [isBePartnerOpen, setIsBePartnerOpen] = useState(false);

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

  const scrollToEvents = () =>
    document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar />

      <main className="pt-20 flex-grow">
        {/* Hero */}
        <section className="px-6 py-16 relative bg-gradient-to-b from-[#aecfb2]/10 via-transparent to-transparent">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-1.5 bg-[#aecfb2]/30 text-brand-dark text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full [animation:fadeUp_.5s_ease_both]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Garantía de acceso CDMX</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-sans text-brand-dark leading-none tracking-tight max-w-3xl mx-auto [animation:fadeUp_.5s_.1s_ease_both]">
              Tu lugar seguro <br className="hidden sm:inline" /> para eventos
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto font-sans leading-relaxed [animation:fadeUp_.5s_.2s_ease_both]">
              Reserva tu estacionamiento cerca de estadios y recintos en CDMX. Sin estrés, sin filas y 100% garantizado.
            </p>

            <form
              onSubmit={e => { e.preventDefault(); scrollToEvents(); }}
              className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 max-w-lg mx-auto flex flex-col sm:flex-row gap-2 [animation:fadeUp_.5s_.3s_ease_both]"
            >
              <div className="flex items-center gap-3 px-4 py-3 flex-grow">
                <Search className="w-5 h-5 text-emerald-800 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="¿A qué evento o recinto vas?"
                  className="w-full bg-transparent border-none text-sm placeholder:text-slate-400 focus:outline-none focus:ring-0 text-slate-800 font-sans"
                />
              </div>
              <button
                type="submit"
                className="bg-[#04210f] hover:bg-[#12361d] text-[#DFF085] py-3.5 px-6 rounded-xl font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                Reservar mi lugar
              </button>
            </form>
          </div>

          <div className="absolute -z-10 top-1/4 right-5 w-72 h-72 bg-[#DFF085]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -z-10 bottom-10 left-5 w-60 h-60 bg-[#383497]/5 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Franja de confianza */}
        <section className="bg-[#04210f] py-5 border-y border-emerald-950 overflow-hidden relative select-none">
          <div className="animate-marquee whitespace-nowrap flex gap-16 text-xs sm:text-sm text-[#DFF085] font-bold tracking-widest font-mono">
            {[0, 1].map(dup => (
              <div key={dup} className="flex gap-16">
                <div className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4" /> +120 EVENTOS OPERADOS</div>
                <div className="flex items-center gap-2.5"><Car className="w-4 h-4" /> +8,000 AUTOS ESTACIONADOS</div>
                <div className="flex items-center gap-2.5"><Sparkles className="w-4 h-4" /> PAGO SEGURO CON STRIPE</div>
                <div className="flex items-center gap-2.5"><QrCode className="w-4 h-4" /> ACCESO DIGITAL EXPRESS</div>
              </div>
            ))}
          </div>
        </section>

        {/* Catálogo de venues */}
        <section id="eventos" className="max-w-7xl mx-auto px-6 py-16 space-y-10 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-brand-dark tracking-tight">Próximos eventos</h2>
              <p className="text-slate-500 text-sm max-w-sm">
                Encuentra el evento de tu interés y asegura tu acceso directo sin complicaciones.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-6 px-6 md:mx-0 md:px-0">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-5 py-2.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                    category === c.key
                      ? 'bg-[#04210f] text-white border-[#04210f] shadow-md'
                      : 'bg-white text-slate-500 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-400 font-medium">Cargando venues...</div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <p className="text-slate-400 font-medium">No se encontraron eventos o recintos coincidentes.</p>
                <button
                  onClick={() => { setSearch(''); setCategory(''); }}
                  className="text-xs font-mono font-bold text-brand-dark underline hover:text-emerald-800 cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              filtered.map(v => (
                <a
                  key={v.id}
                  href={`/venues/${v.id}`}
                  className="group bg-white rounded-[18px] overflow-hidden border border-slate-200/60 shadow-md hover:shadow-xl transition-all flex flex-col h-full no-underline [animation:fadeIn_.4s_ease_both]"
                >
                  <div className="h-52 overflow-hidden relative shrink-0 bg-gradient-to-br from-[#aecfb2]/40 to-[#04210f]/10 flex items-center justify-center">
                    {v.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        referrerPolicy="no-referrer"
                        src={v.photoUrl}
                        alt={v.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <span className="text-6xl">{CAT_EMOJIS[v.category] ?? '🎫'}</span>
                    )}
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{v.upcomingEvents > 0 ? `${v.upcomingEvents} evento${v.upcomingEvents !== 1 ? 's' : ''}` : 'Sin eventos próximos'}</span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#383497] bg-[#383497]/5 px-2 py-0.5 rounded">
                            {v.category || 'venue'}
                          </span>
                          <h3 className="text-lg font-bold font-sans text-slate-900 leading-snug group-hover:text-brand-dark transition-colors line-clamp-1 m-0">
                            {v.name}
                          </h3>
                        </div>
                        {v.priceFrom && (
                          <div className="bg-[#04210f] text-[#DFF085] px-3 py-1 rounded-xl text-center shadow">
                            <span className="text-[9px] font-mono uppercase tracking-widest block opacity-70 leading-none">desde</span>
                            <span className="text-base font-mono font-bold leading-none">${Number(v.priceFrom).toFixed(0)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-slate-400 text-xs flex items-center gap-1.5 m-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                        <span className="truncate">{v.address}</span>
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                      <span className="bg-[#04210f] group-hover:bg-[#12361d] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-sm">
                        Ver eventos
                      </span>
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>

        {/* Beneficios */}
        <section className="bg-gradient-to-b from-white to-slate-50 border-y border-slate-100 px-6 py-20">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <h2 className="text-3xl font-extrabold text-brand-dark tracking-tight">La mejor experiencia de parking</h2>
              <p className="text-slate-500 text-sm">
                Diseñado exclusivamente para eliminar las fricciones habituales de estacionarse en eventos masivos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {BENEFITS.map(b => (
                <div key={b.title} className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 ${b.bg} rounded-xl flex items-center justify-center ${b.fg}`}>
                    <b.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-sans font-bold text-slate-900 text-base m-0">{b.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed m-0">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonios */}
        <section className="max-w-6xl mx-auto px-6 py-20 space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-brand-dark tracking-tight">Lo que dicen nuestros usuarios</h2>
            <p className="text-slate-500 text-sm">Comentarios reales de conductores que ya disfrutan de eventos sin estrés.</p>
          </div>

          <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 snap-x -mx-6 px-6 md:mx-0 md:px-0">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="min-w-[300px] sm:min-w-[340px] bg-white p-6 rounded-2xl shadow-md border border-slate-200/50 snap-center flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current text-brand-dark" />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm italic font-sans leading-relaxed m-0">"{t.text}"</p>
                </div>
                <div className="pt-6 border-t border-slate-50 mt-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.bg} text-white flex items-center justify-center font-bold text-sm`}>
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm m-0">{t.name}</h4>
                    <p className="text-xs text-slate-400 font-medium m-0">{t.event}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Banner Socios */}
        <section className="max-w-6xl mx-auto px-6 mb-24">
          <div className="bg-[#04210f] rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl border border-emerald-950">
            <div className="max-w-xl mx-auto space-y-6 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ¿Tienes un estacionamiento cerca de un recinto?
              </h2>
              <p className="text-[#aecfb2] text-sm sm:text-base leading-relaxed">
                Aumenta tus ventas, gestiona tus espacios de forma inteligente y digitaliza tus accesos con nuestra plataforma líder.
              </p>
              <button
                onClick={() => setIsBePartnerOpen(true)}
                className="bg-[#DFF085] text-brand-dark font-sans text-sm font-bold uppercase tracking-wider py-4 px-8 rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Quiero ser socio
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BePartnerModal isOpen={isBePartnerOpen} onClose={() => setIsBePartnerOpen(false)} />
    </div>
  );
}
