'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar back="/" />

      <main className="pt-20 flex-grow max-w-6xl mx-auto w-full">
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 md:px-8 pt-8 pb-2">
          {CATEGORIES.map(c => (
            <button key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-5 py-2.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                category === c.key
                  ? 'bg-[#04210f] text-white border-[#04210f] shadow-md'
                  : 'bg-white text-slate-500 border-slate-200/80 hover:border-slate-300'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="px-5 md:px-8 pt-5 pb-1 text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
            {venues.length} venue{venues.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="px-5 md:px-8 pt-3 pb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full text-center py-16 text-sm font-medium text-slate-400">Cargando venues...</div>
          ) : venues.length === 0 ? (
            <div className="col-span-full text-center py-16 text-sm font-medium text-slate-400">Sin venues disponibles</div>
          ) : venues.map((v, i) => (
            <div key={v.id}
              onClick={() => router.push(`/venues/${v.id}`)}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200/60 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col [animation:fadeIn_.4s_ease_both]"
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="h-28 bg-gradient-to-br from-[#aecfb2]/40 to-[#04210f]/10 flex items-center justify-center relative overflow-hidden">
                {v.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span className="text-4xl">{EMOJIS[v.category] ?? '🎫'}</span>
                )}
                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-widest">
                  {v.category || 'venue'}
                </span>
              </div>
              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <div className="font-bold text-base text-slate-900 leading-snug group-hover:text-brand-dark transition-colors">{v.name}</div>
                  <div className="flex items-start gap-1.5 mt-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium leading-snug">{v.address}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="font-mono text-[11px] font-bold text-slate-400">
                    {v.upcomingEvents > 0
                      ? `${v.upcomingEvents} evento${Number(v.upcomingEvents) !== 1 ? 's' : ''}`
                      : 'Sin eventos próximos'}
                  </span>
                  {v.priceFrom && (
                    <span className="bg-[#04210f] text-[#DFF085] font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                      desde ${Number(v.priceFrom).toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
