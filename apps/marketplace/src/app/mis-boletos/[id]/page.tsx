'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, CreditCard, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoButton, NeoLinkButton, NeoTextarea, NeoSpinner } from '@/components/ui/neo';

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

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pending:   { label: 'Pendiente de pago',       cls: 'bg-[#fef3c7] text-[#b45309]', icon: '⏳' },
  paid:      { label: 'Pagado · Listo para usar', cls: 'bg-[#dcfce7] text-[#166534]', icon: '✅' },
  used:      { label: 'Utilizado',                cls: 'bg-[#dbeafe] text-[#1e40af]', icon: '✔️' },
  expired:   { label: 'Expirado',                 cls: 'bg-surface-container-high text-on-surface-variant', icon: '⌛' },
  cancelled: { label: 'Cancelado',                cls: 'bg-error-container text-error', icon: '✕' },
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
  const [refundOpen,    setRefundOpen]    = useState(false);
  const [refundReason,  setRefundReason]  = useState('');
  const [refundPhotos,  setRefundPhotos]  = useState<string[]>([]);
  const [refundSending, setRefundSending] = useState(false);
  const [refundDone,    setRefundDone]    = useState(false);

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
        color: { dark: '#191c1d', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      qrRef.current.innerHTML = '';
      qrRef.current.appendChild(canvas);
    } catch {
      if (qrRef.current) qrRef.current.innerHTML =
        '<p style="color:#747a60;font-size:12px;text-align:center;line-height:1.6">No se pudo<br/>generar el QR</p>';
    }
  };

  /* ── loading state ── */
  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/mis-boletos" showTickets={false} />
      <NeoSpinner label="Cargando boleto..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/mis-boletos" showTickets={false} />
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-6">
        <p className="text-sm font-bold text-error">{error}</p>
        <Link href="/mis-boletos" className="text-xs font-semibold text-on-surface-variant no-underline">← Volver</Link>
      </div>
    </div>
  );

  if (!ticket) return null;

  const st     = STATUS[ticket.reservation.status] ?? STATUS.expired;
  const ticketId = `TKT-${id.slice(0, 8).toUpperCase()}`;
  const isPaid   = ticket.reservation.status === 'paid';
  const isPending = ticket.reservation.status === 'pending';
  const isUsed   = ticket.reservation.status === 'used';
  const hasQR    = isPaid || isUsed;
  const canRefund = isPaid && new Date(ticket.event.startsAt) > new Date(Date.now() + 6 * 3600 * 1000);

  const rowCls = 'flex justify-between gap-4 px-4 py-3 border-b-2 border-dashed border-on-surface/10 last:border-b-0 items-start';
  const lblCls = 'font-extrabold text-[10px] uppercase tracking-widest text-on-surface-variant pt-0.5 flex-shrink-0';
  const valCls = 'text-[13px] font-semibold text-on-surface text-right';

  return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/mis-boletos" showTickets={false} />

      <div className="max-w-lg mx-auto px-5 md:px-0 pt-7 pb-20">

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border-2 border-on-surface neo-brutal-shadow-sm font-extrabold text-[11px] uppercase tracking-wider mb-5 ${st.cls}`}>
          {st.icon} {st.label}
        </span>

        {/* ── Event header (dark card) ── */}
        <div className="bg-on-surface border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-5 mb-4">
          <div className="font-extrabold text-xl text-white uppercase tracking-tight mb-1">{ticket.event.name}</div>
          <div className="flex items-center gap-1.5 text-white/50 mb-4">
            <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-[13px] font-semibold">{ticket.event.venueName}</span>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <span className="font-extrabold text-[9px] tracking-[2px] uppercase text-primary-container/70">Fecha</span>
              <span className="font-mono text-[13px] font-bold text-white/90 capitalize">{fmtDate(ticket.event.startsAt)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-extrabold text-[9px] tracking-[2px] uppercase text-primary-container/70">Hora</span>
              <span className="font-mono text-[13px] font-bold text-white/90">{fmtTime(ticket.event.startsAt)}</span>
            </div>
          </div>
        </div>

        {/* ── QR code (paid / used) ── */}
        {hasQR && (
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6 md:p-9 flex flex-col items-center gap-4 mb-4 text-center">
            <div className="qr-border rounded-xl p-3 bg-white">
              <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] flex items-center justify-center" ref={qrRef}>
                {ticket.qrToken
                  ? <div className="w-7 h-7 border-[3px] border-surface-container-high border-t-on-surface rounded-full animate-spin" />
                  : <p className="text-on-surface-variant text-xs leading-relaxed">QR enviado<br />por WhatsApp</p>
                }
              </div>
            </div>
            <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed max-w-[260px]">
              Muestra este código al llegar al estacionamiento.<br />
              <strong className="text-on-surface">Es de uso único.</strong>
            </p>
            <div className="font-mono text-[11px] font-bold tracking-[2px] text-on-surface bg-surface-container border-2 border-on-surface rounded-lg px-3 py-1.5">
              {ticketId}
            </div>
            {isUsed && ticket.qrToken && (
              <div className="inline-flex items-center gap-1.5 font-extrabold text-[11px] uppercase tracking-wider text-[#166534] bg-[#dcfce7] border-2 border-on-surface rounded-lg px-3 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} /> Ya fue escaneado
              </div>
            )}
          </div>
        )}

        {/* ── Pending payment CTA ── */}
        {isPending && (
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6 mb-4 text-center">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-on-surface" strokeWidth={2} />
            <div className="font-extrabold text-base uppercase tracking-tight text-on-surface mb-1.5">Completa tu pago</div>
            <div className="text-[13px] font-medium text-on-surface-variant mb-4 leading-relaxed">
              Tu lugar está reservado temporalmente.<br />
              Completa el pago para garantizarlo.
            </div>
            <div className="inline-block font-extrabold text-[10px] uppercase tracking-wider text-[#b45309] bg-[#fef3c7] border-2 border-on-surface rounded-lg px-3 py-1.5 mb-4">
              Expira en ~15 minutos desde la reserva
            </div>
            <NeoLinkButton href={`/checkout/${id}`} className="w-full">Pagar ahora →</NeoLinkButton>
          </div>
        )}

        {/* ── Details table ── */}
        <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden mb-4">
          <div className="bg-on-surface px-4 py-2.5 font-extrabold text-[10px] tracking-[3px] uppercase text-primary-container">
            Detalle del boleto
          </div>
          {ticket.event.parkingName && (
            <div className={rowCls}>
              <span className={lblCls}>Estacionamiento</span>
              <span className={valCls}>{ticket.event.parkingName}</span>
            </div>
          )}
          {ticket.event.parkingAddress && (
            <div className={rowCls}>
              <span className={lblCls}>Dirección</span>
              <span className={valCls}>{ticket.event.parkingAddress}</span>
            </div>
          )}
          {ticket.event.startsAt && (
            <>
              <div className={rowCls}>
                <span className={lblCls}>Hora de entrada</span>
                <span className={`${valCls} font-mono`}>{fmtTime(ticket.event.startsAt)}</span>
              </div>
              <div className={rowCls}>
                <span className={lblCls}>Hora máx. de salida</span>
                <span className={`${valCls} font-mono`}>
                  {fmtTime(new Date(new Date(ticket.event.startsAt).getTime() + 6 * 3600 * 1000).toISOString())}{' '}
                  <span className="text-[10px] text-on-surface-variant">(6 hrs)</span>
                </span>
              </div>
            </>
          )}
          {ticket.payment.amount > 0 && (
            <>
              <div className={rowCls}>
                <span className={lblCls}>Subtotal</span>
                <span className={`${valCls} font-mono`}>${(ticket.payment.amount / 1.16).toFixed(2)} MXN</span>
              </div>
              <div className={rowCls}>
                <span className={lblCls}>IVA (16%)</span>
                <span className={`${valCls} font-mono`}>
                  ${(ticket.payment.amount - ticket.payment.amount / 1.16).toFixed(2)} MXN
                </span>
              </div>
              <div className={`${rowCls} bg-primary-container/40`}>
                <span className={`${lblCls} text-on-surface`}>Total</span>
                <span className="font-mono font-bold text-base text-on-surface">
                  ${ticket.payment.amount.toFixed(2)} MXN
                </span>
              </div>
            </>
          )}
          <div className={rowCls}>
            <span className={lblCls}>Folio</span>
            <span className="font-mono text-[11px] font-bold text-on-surface">{ticketId}</span>
          </div>
        </div>

        {/* ── How to use (only when paid/used) ── */}
        {(isPaid || isUsed) && (
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-5 mb-4">
            {[
              'Llega al estacionamiento antes o durante el evento',
              'Abre este boleto',
              'Muestra el código QR al operador',
              'El operador escanea y puedes entrar',
            ].map((text, i, arr) => (
              <div key={i} className={`flex items-center gap-3 py-2.5 ${i < arr.length - 1 ? 'border-b-2 border-dashed border-on-surface/10' : ''}`}>
                <div className="w-7 h-7 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center font-extrabold text-xs text-on-surface flex-shrink-0 neo-brutal-shadow-sm">
                  {i + 1}
                </div>
                <span className="text-[13px] font-semibold text-on-surface">{text}</span>
              </div>
            ))}
          </div>
        )}

        {/* WhatsApp note */}
        {isPaid && ticket.userPhone && (
          <div className="bg-[#f0fdf4] border-[3px] border-on-surface rounded-xl neo-brutal-shadow-sm p-4 flex items-start gap-3 mb-4">
            <MessageCircle className="w-5 h-5 text-[#166534] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[13px] font-medium text-[#166534] leading-relaxed">
              También enviamos el QR a tu WhatsApp{ticket.userPhone ? ` (${ticket.userPhone})` : ''}.
              Guárdalo como respaldo.
            </p>
          </div>
        )}

        {/* Solicitar reembolso */}
        {canRefund && !refundDone && (
          <div className="mb-4">
            {!refundOpen ? (
              <button onClick={() => setRefundOpen(true)}
                className="bg-transparent border-none cursor-pointer text-xs font-bold text-on-surface-variant underline p-0">
                Solicitar reembolso →
              </button>
            ) : (
              <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-4">
                <p className="font-extrabold text-sm uppercase tracking-tight text-on-surface mb-2">Solicitar reembolso</p>
                <p className="text-[11px] font-medium text-on-surface-variant mb-3 leading-relaxed">
                  Solo disponible más de 6 horas antes del evento. El equipo revisará tu solicitud.
                </p>
                <NeoTextarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  maxLength={500}
                  placeholder="Cuéntanos el motivo de tu solicitud..."
                  className="min-h-[90px]"
                />
                <label className="block mt-3 mb-1.5 font-extrabold text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Adjuntar fotos (opcional)
                </label>
                <input type="file" accept="image/*" multiple onChange={async e => {
                  const files = Array.from(e.target.files ?? []);
                  const toBase64 = (f: File) => new Promise<string>(res => {
                    const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
                  });
                  setRefundPhotos(await Promise.all(files.map(toBase64)));
                }} className="text-xs font-semibold" />
                {refundPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    {refundPhotos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="" className="w-14 h-14 object-cover rounded-lg border-2 border-on-surface" />
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <NeoButton variant="secondary" className="flex-1" onClick={() => setRefundOpen(false)}>
                    Cancelar
                  </NeoButton>
                  <NeoButton
                    variant="dark"
                    className="flex-1"
                    disabled={!refundReason.trim() || refundSending}
                    onClick={async () => {
                      setRefundSending(true);
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/reservations/${id}/refund-request`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ reason: refundReason, evidencePhotos: refundPhotos }),
                        });
                        if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
                        setRefundDone(true);
                        setRefundOpen(false);
                      } catch (e: any) {
                        alert(e.message || 'Error al enviar la solicitud');
                      } finally { setRefundSending(false); }
                    }}
                  >
                    {refundSending ? 'Enviando...' : 'Enviar solicitud'}
                  </NeoButton>
                </div>
              </div>
            )}
          </div>
        )}
        {refundDone && (
          <div className="bg-[#f0fdf4] border-[3px] border-on-surface rounded-xl neo-brutal-shadow-sm px-4 py-3 mb-4 text-[13px] font-semibold text-[#166534] leading-relaxed">
            ✅ Tu solicitud de reembolso fue enviada. El equipo la revisará en breve.
          </div>
        )}

        {/* Política de cancelación */}
        <div className="bg-[#fff8f0] border-[3px] border-on-surface rounded-xl neo-brutal-shadow-sm p-4 mb-5">
          <div className="flex items-center gap-2 font-extrabold text-[11px] uppercase tracking-wider text-[#92400e] mb-2">
            <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
            Política de cancelación
          </div>
          <div className="text-xs font-medium text-[#b45309] leading-relaxed">
            Puedes solicitar reembolso hasta <strong>6 horas antes</strong> del inicio del evento.
            Pasado ese plazo, no se aceptan cancelaciones ni reembolsos.
            El boleto es de uso único e intransferible.
          </div>
        </div>

        <NeoLinkButton href="/mis-boletos" variant="secondary" className="w-full">
          ← Ver todos mis boletos
        </NeoLinkButton>
      </div>
    </div>
  );
}
