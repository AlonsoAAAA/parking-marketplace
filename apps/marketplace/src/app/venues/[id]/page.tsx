'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, CalendarDays, Building2, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Venue {
  id: string; name: string; address: string;
  photoUrl: string; category: string; capacity: number;
}
interface EventItem {
  id: string; name: string; category: string; status: string;
  startsAt: string; price: number; totalSlots: number; slotsReserved: number;
}

const CAT_EMOJIS: Record<string, string> = {
  conciertos: '🎵', deportes: '⚽', festival: '🎪', teatro: '🎭',
};

export default function VenuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "";
    Promise.all([
      fetch(`${API}/api/v1/venues/${id}`).then(r => r.json()),
      fetch(`${API}/api/v1/venues/${id}/events`).then(r => r.json()),
    ]).then(([vd, ed]) => {
      setVenue(vd.data);
      setEvents(ed.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="/venues" />
      <div className="pt-32 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#04210f] rounded-full animate-spin" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Cargando venue...</p>
      </div>
    </div>
  );

  if (!venue) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="/" />
      <div className="pt-32 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Building2 className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
        <p className="font-bold text-lg text-brand-dark">Venue no disponible</p>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          Este venue aún no tiene información publicada. Explora los venues disponibles.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 bg-[#04210f] hover:bg-[#12361d] text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          Ver venues
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar back="/venues" />

      <main className="pt-20 flex-grow">
        {/* Hero */}
        <div className="max-w-5xl mx-auto px-5 md:px-8 pt-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#04210f] h-56 md:h-80 flex items-end shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="absolute inset-0 w-full h-full object-cover opacity-70" src={venue.photoUrl} alt={venue.name} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
            <div className="relative z-10 p-5 md:p-8">
              <span className="inline-flex items-center gap-1 bg-[#DFF085] text-brand-dark text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
                {venue.category}
              </span>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">{venue.name}</h1>
              <div className="flex items-center gap-1.5 mt-2 text-white/80">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-semibold">{venue.address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Eventos */}
        <div className="max-w-5xl mx-auto px-5 md:px-8 pt-10 pb-16">
          <h2 className="font-extrabold text-lg md:text-xl text-brand-dark mb-5 flex items-center gap-2.5">
            <CalendarDays className="w-5 h-5" />
            Próximos eventos
          </h2>

          {events.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-slate-100 shadow-sm text-sm font-medium text-slate-400">
              Sin eventos próximos
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {events.map((ev, i) => {
                const avail = ev.totalSlots - ev.slotsReserved;
                const low = avail > 0 && avail <= 20;
                const soldOut = avail === 0;
                const d = new Date(ev.startsAt);
                return (
                  <div key={ev.id}
                    onClick={() => router.push(`/eventos/${ev.id}`)}
                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200/60 shadow-md hover:shadow-xl transition-all cursor-pointer flex [animation:fadeIn_.35s_ease_both]"
                    style={{ animationDelay: `${i * .05}s` }}>
                    <div className="bg-[#aecfb2]/20 border-r border-slate-100 w-20 md:w-24 flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">{CAT_EMOJIS[ev.category] ?? '🎫'}</span>
                    </div>
                    <div className="p-4 flex flex-col justify-between flex-1 gap-2.5 min-w-0">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#383497] bg-[#383497]/5 px-2 py-0.5 rounded">
                          {ev.category}
                        </span>
                        <div className="font-bold text-sm md:text-base text-slate-900 leading-snug mt-1 group-hover:text-brand-dark transition-colors">{ev.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                          <Calendar className="w-3.5 h-3.5 text-[#383497]" />
                          {d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short',timeZone:'America/Mexico_City'})} · {d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',timeZone:'America/Mexico_City'})} hrs
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <span className={`font-mono text-[11px] font-bold ${soldOut ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-400'}`}>
                          {soldOut ? 'Agotado' : low ? `${avail} quedan` : `${avail} lugares`}
                        </span>
                        <span className="bg-[#04210f] text-[#DFF085] font-mono font-bold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap">
                          desde ${ev.price} MXN
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
