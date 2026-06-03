'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SHARED_CSS } from '@/lib/design';

interface Reservation {
  id: string;
  status: 'pending' | 'paid' | 'used' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  vehicle_plate: string | null;
  event_name: string;
  venue_name: string;
  starts_at: string;
  parking_name: string | null;
  payment_amount: string | null;
  qr_token: string | null;
  scanned_at: string | null;
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente de pago', color: '#b45309', bg: '#fef3c7' },
  paid:      { label: 'Pagado',            color: '#166534', bg: '#dcfce7' },
  used:      { label: 'Utilizado',         color: '#1e40af', bg: '#dbeafe' },
  expired:   { label: 'Expirado',          color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelado',         color: '#991b1b', bg: '#fee2e2' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function MisBoletosPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?next=/mis-boletos'); return; }

    fetch('/api/v1/reservations/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) {
          localStorage.removeItem('token');
          router.replace('/login?next=/mis-boletos');
          throw new Error('unauth');
        }
        if (!r.ok) throw new Error('error');
        return r.json();
      })
      .then(d => setReservations(Array.isArray(d) ? d : []))
      .catch(e => { if (e.message !== 'unauth') setError('No se pudieron cargar tus boletos.'); })
      .finally(() => setLoading(false));
  }, [router]);

  const active = reservations.filter(r => r.status === 'pending' || r.status === 'paid');
  const past   = reservations.filter(r => r.status === 'used' || r.status === 'expired' || r.status === 'cancelled');

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .mb  { min-height:100vh; background:#EDEDED; }
        .mb-body { padding:24px 20px 80px; max-width:640px; margin:0 auto; }
        @media(min-width:640px){ .mb-body { padding:32px 40px 80px; } }
        .mb-title { font-size:26px; font-weight:700; letter-spacing:-.5px; color:#1a1a1a; margin-bottom:4px; }
        .mb-sub   { font-size:13px; color:#bbb; font-weight:300; margin-bottom:28px; }
        .mb-section { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase;
          color:#bbb; margin:24px 0 10px; }

        /* card = tappable link */
        .mb-card { display:block; background:#fff; border-radius:18px; padding:18px 20px;
          margin-bottom:10px; text-decoration:none; color:inherit; cursor:pointer;
          transition:transform .15s ease, box-shadow .15s ease;
          animation:fadeIn .4s ease both; }
        .mb-card:hover,
        .mb-card:active { transform:translateY(-2px); box-shadow:0 6px 24px rgba(0,0,0,.08); }

        .mb-card-top  { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
        .mb-badge     { display:inline-flex; align-items:center; font-size:10px; font-weight:600;
          letter-spacing:.4px; padding:3px 10px; border-radius:20px; flex-shrink:0; }
        .mb-arrow     { font-size:18px; color:#ddd; flex-shrink:0; align-self:center; }
        .mb-ev-name   { font-size:16px; font-weight:700; color:#1a1a1a; letter-spacing:-.2px;
          margin-bottom:2px; line-height:1.3; }
        .mb-ev-venue  { font-size:12px; color:#bbb; margin-bottom:10px; }
        .mb-meta      { display:flex; flex-wrap:wrap; gap:12px; }
        .mb-meta-item { font-size:12px; color:#888; display:flex; align-items:center; gap:4px; }
        .mb-divider   { border:none; border-top:1px solid rgba(0,0,0,.06); margin:12px 0; }
        .mb-plate     { font-size:12px; font-weight:600; color:#1a1a1a; background:#f5f5f5;
          border-radius:6px; padding:4px 10px; display:inline-block; }
        .mb-qr-chip   { display:inline-flex; align-items:center; gap:5px; font-size:11px;
          color:#166534; background:#dcfce7; border-radius:8px; padding:4px 10px; }

        /* empty */
        .mb-empty { text-align:center; padding:60px 0 24px; }
        .mb-empty-icon { font-size:48px; margin-bottom:14px; }
        .mb-empty-t { font-size:16px; font-weight:600; color:#1a1a1a; margin-bottom:6px; }
        .mb-empty-s { font-size:13px; color:#bbb; margin-bottom:24px; line-height:1.55; }
      `}</style>

      <div className="mb">
        <header className="pm-header">
          <Link href="/" className="pm-logo">Estaciona<span>t</span></Link>
          <Link href="/" className="pm-nav-link">Inicio</Link>
        </header>

        <div className="mb-body">
          <h1 className="mb-title">Mis boletos</h1>
          <p className="mb-sub">Tus reservas y boletos de estacionamiento</p>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb', fontSize: 13 }}>
              Cargando...
            </div>
          )}
          {error && <div className="pm-error">{error}</div>}

          {!loading && !error && reservations.length === 0 && (
            <div className="mb-empty">
              <div className="mb-empty-icon">🎫</div>
              <div className="mb-empty-t">Aún no tienes boletos</div>
              <div className="mb-empty-s">Reserva tu lugar para el próximo evento</div>
              <Link href="/"
                className="pm-btn-primary"
                style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none', padding: '14px 28px' }}>
                Ver eventos →
              </Link>
            </div>
          )}

          {!loading && active.length > 0 && (
            <>
              <p className="mb-section">Activos</p>
              {active.map((r, i) => <BoletoCard key={r.id} r={r} i={i} />)}
            </>
          )}

          {!loading && past.length > 0 && (
            <>
              <p className="mb-section">Historial</p>
              {past.map((r, i) => <BoletoCard key={r.id} r={r} i={i} faded />)}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function BoletoCard({ r, i, faded }: { r: Reservation; i: number; faded?: boolean }) {
  const st = STATUS[r.status] ?? STATUS.expired;

  return (
    <Link
      href={`/mis-boletos/${r.id}`}
      className="mb-card"
      style={{ opacity: faded ? 0.6 : 1, animationDelay: `${i * 0.06}s` }}>

      <div className="mb-card-top">
        <span className="mb-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
        <span className="mb-arrow">›</span>
      </div>

      <div className="mb-ev-name">{r.event_name}</div>
      <div className="mb-ev-venue">📍 {r.venue_name}</div>

      <div className="mb-meta">
        <span className="mb-meta-item">📅 {fmtDate(r.starts_at)}</span>
        <span className="mb-meta-item">🕐 {fmtTime(r.starts_at)}</span>
        {r.parking_name && <span className="mb-meta-item">🅿️ {r.parking_name}</span>}
        {r.payment_amount && (
          <span className="mb-meta-item">💳 ${parseFloat(r.payment_amount).toFixed(0)} MXN</span>
        )}
      </div>

      {(r.vehicle_plate || r.qr_token) && (
        <>
          <hr className="mb-divider" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {r.vehicle_plate && <span className="mb-plate">{r.vehicle_plate}</span>}
            {r.qr_token && (
              <span className="mb-qr-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/>
                </svg>
                QR listo
              </span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}
