'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Ticket as TicketIcon, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  /** Si se pasa, muestra flecha de regreso en lugar del link "Explorar eventos" */
  back?: string | 'back';
  showExplore?: boolean;
}

export default function Navbar({ back, showExplore = true }: NavbarProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#04210f] text-[#e2e3df] shadow-lg flex justify-between items-center px-4 md:px-6 py-4 border-b border-emerald-950">
      <div className="flex items-center gap-3">
        {back && (
          <button
            aria-label="Regresar"
            onClick={() => (back === 'back' ? router.back() : router.push(back))}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <Link href="/" className="flex items-center gap-2 select-none group no-underline">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DFF085] to-[#bfcf68] flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
            <span className="font-mono text-[#04210f] font-black text-xl">P</span>
          </div>
          <span className="font-sans text-2xl font-bold tracking-tight text-white flex items-center gap-1">
            Estaciona<span className="text-[#DFF085]">T</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {showExplore && (
          <Link
            href="/#eventos"
            className="hidden md:flex items-center gap-1.5 text-sm font-medium hover:text-[#DFF085] transition-colors py-2 px-3 rounded-lg hover:bg-[#1a3622] no-underline"
          >
            <Compass className="w-4 h-4" />
            Explorar Eventos
          </Link>
        )}

        <Link
          href="/mis-boletos"
          className="relative font-sans text-xs font-bold uppercase tracking-wider text-[#04210f] bg-[#DFF085] hover:bg-[#c9da70] px-5 py-3 rounded-full hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-2 no-underline"
        >
          <TicketIcon className="w-4 h-4" />
          <span>Mis boletos</span>
        </Link>
      </div>
    </header>
  );
}
