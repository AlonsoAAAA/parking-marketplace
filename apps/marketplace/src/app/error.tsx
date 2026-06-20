'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh', background: '#EDEDED', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      fontFamily: 'Inter, sans-serif', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>Algo salió mal</p>
      <p style={{ fontSize: 13, color: '#666', maxWidth: 280, lineHeight: 1.6 }}>
        Ocurrió un error inesperado. Puedes intentar de nuevo o regresar al inicio.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          style={{ fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 10, background: '#1a1a1a', color: '#fff', textDecoration: 'none' }}
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
