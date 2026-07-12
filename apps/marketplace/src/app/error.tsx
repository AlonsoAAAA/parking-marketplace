'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="font-extrabold text-base uppercase tracking-tight text-on-surface">Algo salió mal</p>
      <p className="text-[13px] font-medium text-on-surface-variant max-w-[280px] leading-relaxed">
        Ocurrió un error inesperado. Puedes intentar de nuevo o regresar al inicio.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="px-5 py-3 rounded-xl border-[3px] border-on-surface bg-white neo-brutal-shadow active-press font-extrabold text-xs uppercase tracking-wider text-on-surface cursor-pointer"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="px-5 py-3 rounded-xl border-[3px] border-on-surface bg-primary-container neo-brutal-shadow active-press font-extrabold text-xs uppercase tracking-wider text-on-surface no-underline"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
