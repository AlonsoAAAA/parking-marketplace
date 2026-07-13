'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, CalendarDays } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoSpinner, NeoBadge } from '@/components/ui/neo';

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
      <NeoHeader back="/venues" />
      <NeoSpinner label="Cargando venue..." />
    </div>
  );
  if (!venue) return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/" />
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
        <span className="text-5xl">🅿️</span>
        <p className="font-extrabold text-lg uppercase tracking-tight text-on-surface">Venue no disponible</p>
        <p className="text-[13px] font-medium text-on-surface-variant max-w-xs leading-relaxed">
          Este venue aún no tiene información publicada. Explora los venues disponibles.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 bg-primary-container px-8 py-3.5 rounded-xl border-[3px] border-on-surface neo-brutal-shadow active-press font-sans font-extrabold text-sm uppercase tracking-wider text-on-surface cursor-pointer"
        >
          Ver venues
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/venues" />

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-8">
        <div className="relative overflow-hidden rounded-xl border-[3px] border-on-surface neo-shadow-lg bg-on-surface h-56 md:h-80 flex items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="absolute inset-0 w-full h-full object-cover opacity-80" src={venue.photoUrl} alt={venue.name} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
          <div className="relative z-10 p-5 md:p-8">
            <NeoBadge color="lime" className="mb-3">{venue.category}</NeoBadge>
            <h1 className="font-extrabold text-2xl md:text-4xl text-white uppercase tracking-tight leading-tight">{venue.name}</h1>
            <div className="flex items-center gap-1.5 mt-2 text-white/80">
              <MapPin className="w-4 h-4" strokeWidth={2.5} />
              <span className="text-sm font-semibold">{venue.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Eventos */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-10 pb-16">
        <h2 className="font-extrabold text-lg md:text-xl uppercase tracking-tight text-on-surface mb-5 flex items-center gap-2.5">
          <CalendarDays className="w-5 h-5" strokeWidth={2.5} />
          Próximos eventos
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-14 font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">
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
                  className="bg-white border-[3px] border-on-surface rounded-xl overflow-hidden neo-brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 cursor-pointer flex [animation:fadeIn_.35s_ease_both]"
                  style={{ animationDelay: `${i * .05}s` }}>
                  <div className="bg-primary-container border-r-[3px] border-on-surface w-20 md:w-24 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">{EMOJIS[i % EMOJIS.length]}</span>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1 gap-2.5 min-w-0">
                    <div>
                      <div className="font-extrabold text-[9px] uppercase tracking-widest text-on-surface-variant">{ev.category}</div>
                      <div className="font-extrabold text-sm md:text-base text-on-surface uppercase tracking-tight leading-snug mt-0.5">{ev.name}</div>
                      <div className="font-mono text-[11px] font-bold text-on-surface-variant mt-1">
                        {d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})} · {d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})} hrs
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-dashed border-on-surface/15">
                      <span className={`font-mono text-[11px] font-bold ${soldOut ? 'text-error' : low ? 'text-[#9a3412]' : 'text-on-surface-variant'}`}>
                        {soldOut ? 'Agotado' : low ? `${avail} quedan` : `${avail} lugares`}
                      </span>
                      <span className="bg-on-surface text-primary-container font-mono font-bold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap">
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
    </div>
  );
}
