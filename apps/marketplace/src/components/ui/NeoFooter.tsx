'use client';
/** Footer neo-brutalista compartido — portado de la landing del demo. */
import Link from 'next/link';
import { Car } from 'lucide-react';

const LINK_CLS = 'block text-white/60 text-[13px] font-semibold no-underline hover:text-primary-container transition-colors';

export default function NeoFooter() {
  return (
    <footer className="bg-midnight text-white pt-14 pb-10 border-t-[3px] border-on-surface font-sans">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16">
          {/* Marca */}
          <div className="max-w-md">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="bg-primary-container p-1.5 rounded-lg border-2 border-on-surface">
                <Car className="text-primary w-5 h-5 fill-current" />
              </div>
              <span className="font-extrabold text-xl uppercase tracking-tighter text-primary-fixed">
                Estacionat
              </span>
            </div>
            <p className="text-white/50 text-[13px] font-medium leading-relaxed">
              Conectamos a conductores con espacios de estacionamiento privados,
              seguros y garantizados para eventos masivos en CDMX.
            </p>
          </div>

          {/* Columnas de links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 flex-1">
            <div>
              <p className="font-extrabold text-[11px] uppercase tracking-widest text-primary-container mb-4">Producto</p>
              <div className="flex flex-col gap-2.5">
                <Link href="/" className={LINK_CLS}>Buscar estacionamiento</Link>
                <Link href="/venues" className={LINK_CLS}>Venues</Link>
                <Link href="/mis-boletos" className={LINK_CLS}>Mis boletos</Link>
              </div>
            </div>
            <div>
              <p className="font-extrabold text-[11px] uppercase tracking-widest text-primary-container mb-4">Empresa</p>
              <div className="flex flex-col gap-2.5">
                <span className="text-white/60 text-[13px] font-semibold">Sobre nosotros</span>
                <a href="mailto:soporte@estacionat.mx" className={LINK_CLS}>soporte@estacionat.mx</a>
              </div>
            </div>
            <div>
              <p className="font-extrabold text-[11px] uppercase tracking-widest text-primary-container mb-4">Legal</p>
              <div className="flex flex-col gap-2.5">
                <Link href="/terminos" className={LINK_CLS}>Términos y condiciones</Link>
                <Link href="/privacidad" className={LINK_CLS}>Aviso de privacidad</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-2 font-mono text-[11px] font-bold text-white/40">
          <span>© 2026 Estacionat</span>
          <span>Estacionamiento inteligente para todos.</span>
        </div>
      </div>
    </footer>
  );
}
