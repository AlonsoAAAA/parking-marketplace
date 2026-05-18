'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CARD_COLORS } from '@/lib/design';
import styles from './page.module.css';

interface ParkingEvent {
  id: string;
  name: string;
  venueName: string;
  startsAt: string;
  price: number;
  totalSlots: number;
  slotsReserved: number;
  status: string;
  parkingName: string;
  category?: string;
}

const MOCK_EVENTS: ParkingEvent[] = [
  { id: '1', name: 'Natanael Cano', venueName: 'Foro Sol', startsAt: '2025-06-21T20:00:00', price: 180, totalSlots: 150, slotsReserved: 63, status: 'active', parkingName: 'Foro Sol Norte', category: 'REGIONAL MEX' },
  { id: '2', name: 'América vs Chivas', venueName: 'Estadio Azteca', startsAt: '2025-06-22T18:00:00', price: 220, totalSlots: 200, slotsReserved: 188, status: 'active', parkingName: 'Azteca P3', category: 'FÚTBOL' },
  { id: '3', name: 'EDC México 2025', venueName: 'Autódromo', startsAt: '2025-06-28T16:00:00', price: 350, totalSlots: 500, slotsReserved: 180, status: 'active', parkingName: 'Autódromo P-Norte', category: 'ELECTRONIC' },
  { id: '4', name: 'Peso Pluma', venueName: 'Palacio de los Deportes', startsAt: '2025-07-05T21:00:00', price: 200, totalSlots: 300, slotsReserved: 45, status: 'active', parkingName: 'Palacio P-Sur', category: 'TRAP' },
  { id: '5', name: 'Café Tacvba', venueName: 'Palacio de Bellas Artes', startsAt: '2025-07-12T19:00:00', price: 160, totalSlots: 120, slotsReserved: 30, status: 'active', parkingName: 'Bellas Artes P1', category: 'ROCK' },
];

const CATEGORIES = ['Todos', 'Conciertos', 'Deportes', 'Festival', 'Rock'];
const emojis = ['🎵', '⚽', '🎧', '🎤', '🎸'];

export default function HomePage() {
  const [events, setEvents] = useState<ParkingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/events?status=active')
      .then(r => r.json())
      .then(d => setEvents(d.data?.length ? d.data : MOCK_EVENTS))
      .catch(() => setEvents(MOCK_EVENTS))
      .finally(() => setLoading(false));
  }, []);

  const avail = (e: ParkingEvent) => e.totalSlots - e.slotsReserved;

  const filtered = events.filter(e => {
    const s = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.venueName?.toLowerCase().includes(search.toLowerCase());
    const c = activeCategory === 'Todos' || e.category?.toLowerCase().includes(activeCategory.toLowerCase());
    return s && c;
  });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <span className={styles.logo}>Park<span>MX</span></span>
        <Link href="/mi-cuenta" className={styles.nav}>Mis boletos</Link>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Ciudad de México · 2025</p>
        <h1 className={styles.title}>Estacionamiento<br />para eventos.</h1>
        <p className={styles.subtitle}>Reserva tu lugar antes de llegar. Sin filas, sin vueltas — tu espacio garantizado para conciertos, partidos y festivales en CDMX.</p>
        <div className={styles.searchBox}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, opacity: 0.25 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#1a1a1a" strokeWidth="1.4" />
            <path d="M9 9L12 12" stroke="#1a1a1a" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Busca venue o artista..." />
          {search && (
            <button onClick={() => setSearch('')} className={styles.clearBtn}>×</button>
          )}
        </div>
      </section>

      <div className={styles.filters}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`${styles.filter}${activeCategory === cat ? ' ' + styles.active : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {!loading && <div className={styles.countBar}>{filtered.length} eventos disponibles</div>}

      <main className={styles.feed}>
        {loading ? (
          <div className={styles.loadingState}>Cargando eventos...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>Sin resultados</div>
        ) : (
          filtered.map((event, i) => {
            const c = CARD_COLORS[i % CARD_COLORS.length];
            const a = avail(event);
            const soldOut = a === 0;
            const low = a > 0 && a <= 15;
            const pillBg = soldOut ? '#fecaca' : low ? '#fed7aa' : '#d1fae5';
            const pillColor = soldOut ? '#991b1b' : low ? '#9a3412' : '#065f46';

            return (
              <Link key={event.id} href={`/eventos/${event.id}`} className={styles.card} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className={styles.cardVisual} style={{ background: c.bg }}>
                  <div className={styles.visualGradient} />
                  {i === 0 && <div className={styles.featuredBadge}>Top</div>}
                  <span className={styles.visualEmoji}>{emojis[i % emojis.length]}</span>
                </div>

                <div className={styles.cardBody}>
                  <div>
                    <div className={styles.cardCat}>{event.category || 'EVENTO'}</div>
                    <div className={styles.cardName}>{event.name}</div>
                    <div className={styles.cardVenue}>{event.venueName}</div>
                  </div>

                  <div className={styles.cardBottom}>
                    <div className={styles.cardLeft}>
                      <span className={styles.cardDate}>
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <rect x="0.75" y="1.75" width="7.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
                          <path d="M2.5 1V2.5M6.5 1V2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                        </svg>
                        {new Date(event.startsAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className={styles.availPill} style={{ background: pillBg, color: pillColor }}>
                        {soldOut ? 'Agotado' : low ? `${a} quedan` : `${a} lugares`}
                      </span>
                    </div>
                    <div className={styles.cardPrice}>
                      ${event.price} <span>MXN</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
