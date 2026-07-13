'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import NeoFooter from '@/components/ui/NeoFooter';

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
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/" />

      <div className="max-w-6xl mx-auto">
        {/* Filtros */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 md:px-8 pt-8 pb-2">
          {CATEGORIES.map(c => (
            <button key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-[3px] border-on-surface transition-all duration-150 font-sans font-extrabold text-[11px] uppercase tracking-wider flex-shrink-0 cursor-pointer ${
                category === c.key
                  ? 'bg-primary-container text-on-surface shadow-[3px_3px_0px_0px_#191c1d] -translate-y-0.5'
                  : 'bg-white text-on-surface-variant hover:bg-surface-container'
              }`}>
              {c.key && <span>{EMOJIS[c.key]}</span>}
              {c.label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="px-5 md:px-8 pt-5 pb-1 font-extrabold text-[10px] tracking-[2px] uppercase text-on-surface-variant">
            {venues.length} venue{venues.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="px-5 md:px-8 pt-3 pb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full text-center py-16 font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">Cargando venues...</div>
          ) : venues.length === 0 ? (
            <div className="col-span-full text-center py-16 font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">Sin venues disponibles</div>
          ) : venues.map((v, i) => (
            <div key={v.id}
              onClick={() => router.push(`/venues/${v.id}`)}
              className="bg-white border-[3px] border-on-surface rounded-xl overflow-hidden neo-brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 cursor-pointer flex flex-col [animation:fadeIn_.4s_ease_both]"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="bg-primary-container border-b-[3px] border-on-surface h-24 flex items-center justify-center relative">
                <span className="text-4xl">{EMOJIS[v.category] ?? '🎫'}</span>
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
                      desde ${Number(v.priceFrom).toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <NeoFooter />
    </div>
  );
}
