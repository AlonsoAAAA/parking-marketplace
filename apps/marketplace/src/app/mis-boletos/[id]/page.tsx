'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

interface TicketData {
  reservation: { id: string; status: string; createdAt: string };
  event: {
    name: string;
    venueName: string;
    startsAt: string;
    parkingName: string | null;
    parkingAddress: string | null;
  };
  payment: { amount: number };
  qrToken: string | null;
  userPhone: string | null;
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Pendiente de pago', color: '#b45309', bg: '#fef3c7', icon: '⏳' },
  paid:      { label: 'Pagado · Listo para usar', color: '#166534', bg: '#dcfce7', icon: '✅' },
  used:      { label: 'Utilizado',         color: '#1e40af', bg: '#dbeafe', icon: '✔️' },
  expired:   { label: 'Expirado',          color: '#6b7280', bg: '#f3f4f6', icon: '⌛' },
  cancelled: { label: 'Cancelado',         color: '#991b1b', bg: '#fee2e2', icon: '✕' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function BoletoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const qrRef   = useRef<HTMLDivElement>(null);

  const [ticket,  setTicket]  = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  /* ── fetch ticket ── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace(`/login?next=/mis-boletos/${id}`); return; }

    fetch(`/api/v1/reservations/${id}/ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { router.replace(`/login?next=/mis-boletos/${id}`); throw new Error('unauth'); }
        if (r.status === 403) { setError('No tienes acceso a este boleto.'); throw new Error('forbidden'); }
        if (!r.ok) throw new Error('error');
        return r.json();
      })
      .then(d => setTicket(d.data ?? null))
      .catch(e => { if (e.message !== 'unauth' && e.message !== 'forbidden') setError('No se pudo cargar el boleto.'); })
      .finally(() => setLoading(false));
  }, [id, router]);

  /* ── render QR when ticket arrives ── */
  useEffect(() => {
    if (ticket?.qrToken && qrRef.current) renderQR(ticket.qrToken);
  }, [ticket]);

  const renderQR = async (token: string) => {
    if (!qrRef.current) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      const size   = typeof window !== 'undefined' && window.innerWidth >= 640 ? 260 : 220;
      await QRCode.toCanvas(canvas, JSON.stringify({ t: token }), {
        width: size, margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      qrRef.current.innerHTML = '';
      qrRef.current.appendChild(canvas);
    } catch {
      if (qrRef.current) qrRef.current.innerHTML =
        '<p style="color:#bbb;font-size:12px;text-align:center;line-height:1.6">No se pudo<br/>generar el QR</p>';
    }
  };

  /* ── loading state ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#EDEDED', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter,sans-serif' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #ddd', borderTop: '2px solid #1a1a1a',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <p style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#bbb' }}>
        Cargando boleto...
      </p>
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#EDEDED', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Inter,sans-serif', padding: 24 }}>
      <p style={{ fontSize: 13, color: '#991b1b' }}>{error}</p>
      <Link href="/mis-boletos" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>← Volver</Link>
    </div>
  );

  if (!ticket) return null;

  const st     = STATUS[ticket.reservation.status] ?? STATUS.expired;
  const ticketId = `TKT-${id.slice(0, 8).toUpperCase()}`;
  const isPaid   = ticket.reservation.status === 'paid';
  const isPending = ticket.reservation.status === 'pending';
  const isUsed   = ticket.reservation.status === 'used';
  const hasQR    = isPaid || isUsed;

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        @keyframes spin { to { transform: rotate(360deg); } }
        .bd-wrap { min-height:100vh; background:#EDEDED; }
        .bd-body { padding:20px 20px 80px; max-width:480px; margin:0 auto; }
        @media(min-width:640px){ .bd-body { padding:28px 32px 80px; } }
        @media(min-width:1024px){ .bd-body { max-width:580px; padding:36px 0 80px; } }

        /* status pill */
        .bd-status { display:inline-flex; align-items:center; gap:6px; padding:6px 14px;
          border-radius:20px; font-size:11px; font-weight:600; letter-spacing:.3px; margin-bottom:20px; }

        /* QR card */
        .bd-qr-card { background:#fff; border-radius:22px; padding:28px 24px;
          display:flex; flex-direction:column; align-items:center; gap:14px;
          margin-bottom:12px; text-align:center; }
        @media(min-width:640px){ .bd-qr-card { padding:40px 36px; } }
        .bd-qr-box { width:220px; height:220px; display:flex; align-items:center; justify-content:center; }
        @media(min-width:640px){ .bd-qr-box { width:260px; height:260px; } }
        .bd-qr-label { font-size:13px; color:#666; line-height:1.6; max-width:260px; }
        .bd-qr-id    { font-size:10px; color:#bbb; font-family:'Courier New',monospace;
          letter-spacing:2px; background:#f5f5f5; padding:5px 12px; border-radius:6px; }
        .bd-scanned  { font-size:11px; color:#166534; background:#dcfce7;
          padding:6px 14px; border-radius:8px; }

        /* event header card */
        .bd-event-card { background:#1a1a1a; border-radius:20px; padding:22px 20px; margin-bottom:12px; }
        .bd-ev-name { font-size:20px; font-weight:700; color:#fff; letter-spacing:-.3px; margin-bottom:4px; }
        .bd-ev-venue { font-size:13px; color:rgba(255,255,255,.5); margin-bottom:12px; }
        .bd-ev-row   { display:flex; gap:20px; flex-wrap:wrap; }
        .bd-ev-item  { display:flex; flex-direction:column; gap:2px; }
        .bd-ev-label { font-size:9px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,.35); }
        .bd-ev-val   { font-size:13px; font-weight:500; color:rgba(255,255,255,.85); }

        /* details table */
        .bd-table { background:#fff; border-radius:18px; overflow:hidden; margin-bottom:12px; }
        .bd-table-hd { background:#f5f5f5; padding:10px 18px; font-size:9px;
          font-weight:600; letter-spacing:2.5px; text-transform:uppercase; color:#bbb; }
        .bd-row { display:flex; justify-content:space-between; padding:12px 18px;
          border-bottom:1px solid #f5f5f5; align-items:flex-start; gap:16px; }
        .bd-row:last-child { border-bottom:none; }
        .bd-lbl { font-size:12px; color:#bbb; flex-shrink:0; }
        .bd-val { font-size:13px; color:#1a1a1a; font-weight:500; text-align:right; }

        /* pending CTA */
        .bd-pending { background:#fff; border-radius:20px; padding:24px; margin-bottom:12px; text-align:center; }
        .bd-pending-icon { font-size:36px; margin-bottom:10px; }
        .bd-pending-t { font-size:16px; font-weight:700; color:#1a1a1a; margin-bottom:6px; }
        .bd-pending-s { font-size:13px; color:#bbb; margin-bottom:18px; line-height:1.55; }
        .bd-exp  { font-size:11px; color:#b45309; background:#fef3c7; padding:6px 14px;
          border-radius:8px; display:inline-block; margin-bottom:14px; }

        /* instructions */
        .bd-steps { background:#fff; border-radius:18px; padding:20px; margin-bottom:20px; }
        .bd-step  { display:flex; align-items:center; gap:12px; padding:8px 0;
          border-bottom:1px solid #f5f5f5; }
        .bd-step:last-child { border-bottom:none; }
        .bd-step-n { width:26px; height:26px; background:#1a1a1a; color:#fff;
          border-radius:50%; display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; flex-shrink:0; }
        .bd-step-t { font-size:13px; color:#444; }
      `}</style>

      <div className="bd-wrap">
        <header className="pm-header">
          <Link href="/mis-boletos" className="pm-back">← Mis boletos</Link>
          <span className="pm-logo">Park<span>MX</span></span>
        </header>

        <div className="bd-body">

          {/* Status badge */}
          <span className="bd-status" style={{ color: st.color, background: st.bg }}>
            {st.icon} {st.label}
          </span>

          {/* ── Event header (dark card) ── */}
          <div className="bd-event-card">
            <div className="bd-ev-name">{ticket.event.name}</div>
            <div className="bd-ev-venue">📍 {ticket.event.venueName}</div>
            <div className="bd-ev-row">
              <div className="bd-ev-item">
                <span className="bd-ev-label">Fecha</span>
                <span className="bd-ev-val">{fmtDate(ticket.event.startsAt)}</span>
              </div>
              <div className="bd-ev-item">
                <span className="bd-ev-label">Hora</span>
                <span className="bd-ev-val">{fmtTime(ticket.event.startsAt)}</span>
              </div>
            </div>
          </div>

          {/* ── QR code (paid / used) ── */}
          {hasQR && (
            <div className="bd-qr-card">
              <div className="bd-qr-box" ref={qrRef}>
                {ticket.qrToken
                  ? <div style={{ width: 28, height: 28, border: '2px solid #eee',
                      borderTop: '2px solid #1a1a1a', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite' }} />
                  : <p style={{ color: '#bbb', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                      QR enviado<br />por WhatsApp
                    </p>
                }
              </div>
              <p className="bd-qr-label">
                Muestra este código al llegar al estacionamiento.<br />
                <strong>Es de uso único.</strong>
              </p>
              <div className="bd-qr-id">{ticketId}</div>
              {isUsed && ticket.qrToken && (
                <div className="bd-scanned">✓ Ya fue escaneado</div>
              )}
            </div>
          )}

          {/* ── Pending payment CTA ── */}
          {isPending && (
            <div className="bd-pending">
              <div className="bd-pending-icon">💳</div>
              <div className="bd-pending-t">Completa tu pago</div>
              <div className="bd-pending-s">
                Tu lugar está reservado temporalmente.<br />
                Completa el pago para garantizarlo.
              </div>
              <div className="bd-exp">
                Expira en ~15 minutos desde la reserva
              </div>
              <Link
                href={`/checkout/${id}`}
                className="pm-btn-primary"
                style={{ display: 'flex', textDecoration: 'none' }}>
                Pagar ahora →
              </Link>
            </div>
          )}

          {/* ── Details table ── */}
          <div className="bd-table">
            <div className="bd-table-hd">Detalle del boleto</div>
            {ticket.event.parkingName && (
              <div className="bd-row">
                <span className="bd-lbl">Estacionamiento</span>
                <span className="bd-val">{ticket.event.parkingName}</span>
              </div>
            )}
            {ticket.event.parkingAddress && (
              <div className="bd-row">
                <span className="bd-lbl">Dirección</span>
                <span className="bd-val">{ticket.event.parkingAddress}</span>
              </div>
            )}
            {ticket.payment.amount > 0 && (
              <>
                <div className="bd-row">
                  <span className="bd-lbl">Subtotal</span>
                  <span className="bd-val">${(ticket.payment.amount / 1.16).toFixed(2)} MXN</span>
                </div>
                <div className="bd-row">
                  <span className="bd-lbl">IVA (16%)</span>
                  <span className="bd-val">
                    ${(ticket.payment.amount - ticket.payment.amount / 1.16).toFixed(2)} MXN
                  </span>
                </div>
                <div className="bd-row" style={{ background: '#f9f9f9' }}>
                  <span className="bd-lbl" style={{ fontWeight: 700, color: '#1a1a1a' }}>Total</span>
                  <span className="bd-val" style={{ fontSize: 16, fontWeight: 700 }}>
                    ${ticket.payment.amount.toFixed(2)} MXN
                  </span>
                </div>
              </>
            )}
            <div className="bd-row">
              <span className="bd-lbl">Folio</span>
              <span className="bd-val" style={{ fontFamily: 'monospace', fontSize: 11 }}>{ticketId}</span>
            </div>
          </div>

          {/* ── How to use (only when paid/used) ── */}
          {(isPaid || isUsed) && (
            <div className="bd-steps">
              {[
                'Llega al estacionamiento antes o durante el evento',
                'Abre este boleto',
                'Muestra el código QR al operador',
                'El operador escanea y puedes entrar',
              ].map((text, i) => (
                <div key={i} className="bd-step">
                  <div className="bd-step-n">{i + 1}</div>
                  <span className="bd-step-t">{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* WhatsApp note */}
          {isPaid && ticket.userPhone && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
              padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
              marginBottom: 20 }}>
              <span style={{ fontSize: 22 }}>💬</span>
              <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.55 }}>
                También enviamos el QR a tu WhatsApp{ticket.userPhone ? ` (${ticket.userPhone})` : ''}.
                Guárdalo como respaldo.
              </p>
            </div>
          )}

          <Link href="/mis-boletos" className="pm-btn-secondary" style={{ display: 'flex', textDecoration: 'none' }}>
            ← Ver todos mis boletos
          </Link>
        </div>
      </div>
    </>
  );
}
