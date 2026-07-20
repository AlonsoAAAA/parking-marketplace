'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <p className="font-bold text-lg text-[#04210f]">Algo salió mal</p>
      <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
        Ocurrió un error inesperado. Puedes intentar de nuevo o regresar al inicio.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer transition-all"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="px-5 py-3 rounded-xl bg-[#383497] hover:bg-[#2b278c] font-bold text-xs uppercase tracking-wider text-white no-underline transition-all"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
