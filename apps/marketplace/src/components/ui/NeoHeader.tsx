'use client';
/** Header neo-brutalista compartido — solo presentación. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, ArrowLeft, Ticket } from 'lucide-react';

export default function NeoHeader({
  back,
  showTickets = true,
}: {
  /** Si se pasa, muestra botón de regresar (ruta o 'back' para router.back()) */
  back?: string | 'back';
  showTickets?: boolean;
}) {
  const router = useRouter();

  return (
    <header className="w-full sticky top-0 z-50 bg-surface border-b-[3px] border-on-surface shadow-[0px_4px_0px_0px_rgba(25,28,29,0.08)] flex justify-between items-center px-4 md:px-8 py-3.5">
      <div className="flex items-center gap-3">
        {back && (
          <button
            aria-label="Regresar"
            onClick={() => (back === 'back' ? router.back() : router.push(back))}
            className="bg-white p-2 rounded-lg border-2 border-on-surface neo-brutal-shadow-sm active-press cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-on-surface" strokeWidth={3} />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2.5 no-underline group active:scale-95 transition-transform">
          <div className="bg-primary-container p-1.5 rounded-lg border-2 border-on-surface neo-brutal-shadow-sm group-hover:rotate-12 transition-transform">
            <Car className="text-primary w-5 h-5 fill-current" />
          </div>
          <span className="font-sans font-extrabold text-lg md:text-xl uppercase tracking-tighter text-on-surface select-none drop-shadow-[1px_1px_0px_rgba(255,100,120,1)]">
            Estacionat
          </span>
        </Link>
      </div>

      {showTickets && (
        <Link
          href="/mis-boletos"
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-on-surface neo-brutal-shadow-sm active-press no-underline font-sans font-extrabold text-[11px] uppercase tracking-wider text-on-surface"
        >
          <Ticket className="w-3.5 h-3.5" strokeWidth={2.5} />
          Mis boletos
        </Link>
      )}
    </header>
  );
}
