'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, AlertTriangle, SquareParking } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoLinkButton } from '@/components/ui/neo';

interface TicketData {
  reservation: { id: string; status: string; createdAt: string; };
  event: { name: string; venueName: string; startsAt: string; parkingName: string; parkingAddress: string; };
  payment: { amount: number; };
  qrToken: string;
  userPhone?: string;
}

export default function ConfirmacionPage() {
  const params = useParams();
  const reservationId = params.reservationId as string;
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchTicket = (attempt = 1) => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/reservations/${reservationId}/ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const data = d.data;
        if (data?.qrToken) {
          setTicket(data);
          setLoading(false);
        } else if (attempt < 8) {
          // Webhook aún procesando — reintenta con backoff
          setTimeout(() => fetchTicket(attempt + 1), attempt * 1500);
        } else {
          setQrError(true);
          setTicket(data ?? null);
          setLoading(false);
        }
      })
      .catch(() => { setQrError(true); setLoading(false); });
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentIntentId = searchParams.get('payment_intent');
    const token = localStorage.getItem('token');

    // Stripe redirige con redirect_status=succeeded — sincronizar con backend
    // antes de empezar el polling para no depender del webhook en dev
    if (searchParams.get('redirect_status') === 'succeeded' && paymentIntentId && token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/payments/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentIntentId }),
      }).catch(() => {});
    }

    const timer = setTimeout(() => fetchTicket(), 1500);
    return () => clearTimeout(timer);
  }, [reservationId]);

  useEffect(() => {
    if (ticket?.qrToken && qrRef.current) generateQR(ticket.qrToken);
  }, [ticket]);

  const generateQR = async (token: string) => {
    if (!qrRef.current) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
      await QRCode.toCanvas(canvas, JSON.stringify({ t: token }), {
        width: isDesktop ? 260 : 200, margin: 2,
        color: { dark: '#191c1d', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      qrRef.current.innerHTML = '';
      qrRef.current.appendChild(canvas);
    } catch {
      if (qrRef.current) qrRef.current.innerHTML = '<p style="color:#747a60;font-size:12px;text-align:center">QR enviado<br/>por WhatsApp</p>';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-[3px] border-on-surface border-t-primary-container rounded-full animate-spin" />
      <p className="font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">Confirmando pago...</p>
    </div>
  );

  if (!ticket) return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center gap-3 px-6 text-center">
      <SquareParking className="w-12 h-12 text-on-surface" strokeWidth={2} />
      <p className="font-extrabold text-base uppercase tracking-tight text-on-surface">¡Pago confirmado!</p>
      <p className="text-[13px] font-medium text-on-surface-variant max-w-[280px] leading-relaxed">
        Tu reserva está lista. Recibirás tu código QR por WhatsApp en los próximos minutos.
      </p>
      <Link href="/" className="mt-2 text-xs font-extrabold text-on-surface underline">Ir al inicio</Link>
    </div>
  );

  const ticketId = `TKT-${reservationId.slice(0,8).toUpperCase()}`;

  const rowCls = 'flex justify-between gap-4 px-4 py-3 border-b-2 border-dashed border-on-surface/10 last:border-b-0 items-start';
  const lblCls = 'font-extrabold text-[10px] uppercase tracking-widest text-on-surface-variant pt-0.5 flex-shrink-0';
  const valCls = 'text-[13px] font-semibold text-on-surface text-right';

  return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader />

      <div className="max-w-lg mx-auto px-5 md:px-0 pt-6 pb-16">
        {/* Check de éxito */}
        <div className="text-center pt-6 pb-7">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-container border-[3px] border-on-surface rounded-full neo-brutal-shadow flex items-center justify-center mx-auto mb-5 [animation:fadeUp_.5s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <path d="M2 10L9.5 17.5L24 2" stroke="#191c1d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-extrabold text-2xl md:text-3xl uppercase tracking-tight text-on-surface mb-1.5">¡Lugar confirmado!</h1>
          <p className="text-[13px] font-medium text-on-surface-variant">Tu boleto está listo para usar</p>
        </div>

        {/* QR */}
        <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-6 md:p-9 flex flex-col items-center gap-4 mb-4 text-center">
          <div className="qr-border rounded-xl p-3 bg-white">
            <div className="w-[200px] h-[200px] lg:w-[260px] lg:h-[260px] flex items-center justify-center" ref={qrRef}>
              {qrError
                ? <p className="text-on-surface-variant text-xs leading-relaxed">QR enviado<br/>por WhatsApp</p>
                : <div className="w-7 h-7 border-[3px] border-surface-container-high border-t-on-surface rounded-full animate-spin"/>
              }
            </div>
          </div>
          <p className="text-xs font-medium text-on-surface-variant leading-relaxed max-w-[240px]">
            Muestra este QR al llegar al estacionamiento.<br/><strong className="text-on-surface">Solo es válido una vez.</strong>
          </p>
          <div className="font-mono text-[11px] font-bold tracking-[2px] text-on-surface bg-surface-container border-2 border-on-surface rounded-lg px-3 py-1.5">{ticketId}</div>
        </div>

        {/* Detalle */}
        <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden mb-4">
          <div className="bg-on-surface px-4 py-2.5 font-extrabold text-[10px] tracking-[3px] uppercase text-primary-container">
            Detalle del boleto
          </div>
          {[
            ['Evento',          ticket.event.name,          false],
            ['Venue',           ticket.event.venueName,     false],
            ['Fecha',           new Date(ticket.event.startsAt).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'long'}), false],
            ['Estacionamiento', ticket.event.parkingName,   false],
            ['Dirección',       ticket.event.parkingAddress,false],
            ['Subtotal',        `$${(ticket.payment.amount / 1.16).toFixed(2)} MXN`, false],
            ['IVA (16%)',       `$${(ticket.payment.amount - ticket.payment.amount / 1.16).toFixed(2)} MXN`, false],
            ['Total pagado',    `$${ticket.payment.amount.toFixed(2)} MXN`, true],
          ].map(([label, value, isTotal]) => (
            <div key={label as string} className={`${rowCls} ${isTotal ? 'bg-primary-container/40' : ''}`}>
              <span className={`${lblCls} ${isTotal ? 'text-on-surface' : ''}`}>{label}</span>
              <span className={isTotal ? 'font-mono font-bold text-base text-on-surface' : `${valCls} capitalize`}>{value}</span>
            </div>
          ))}
        </div>

        {/* WhatsApp */}
        <div className="bg-[#f0fdf4] border-[3px] border-on-surface rounded-xl neo-brutal-shadow-sm p-4 flex items-start gap-3 mb-4">
          <MessageCircle className="w-5 h-5 text-[#166534] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
          <p className="text-[13px] font-medium text-[#166534] leading-relaxed">
            También te enviamos el QR por WhatsApp{ticket.userPhone ? ` al ${ticket.userPhone}` : ''}. Guárdalo como respaldo.
          </p>
        </div>

        {/* Cómo usarlo */}
        <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-5 mb-4">
          <p className="font-extrabold text-[10px] tracking-[2px] uppercase text-on-surface-variant mb-4">Cómo usarlo</p>
          {['Llega al estacionamiento antes o durante el evento','Abre este boleto o el mensaje de WhatsApp','Muestra el código QR al operador','El operador escanea y puedes entrar'].map((text,i,arr) => (
            <div key={i} className={`flex items-center gap-3 py-2.5 ${i < arr.length - 1 ? 'border-b-2 border-dashed border-on-surface/10' : ''}`}>
              <div className="w-7 h-7 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center font-extrabold text-xs text-on-surface flex-shrink-0 neo-brutal-shadow-sm">{i+1}</div>
              <span className="text-[13px] font-semibold text-on-surface">{text}</span>
            </div>
          ))}
        </div>

        {/* Tiempo incluido */}
        <div className="bg-[#f0fdf4] border-[3px] border-on-surface rounded-xl neo-brutal-shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 font-extrabold text-[11px] uppercase tracking-wider text-[#166534] mb-2">
            <SquareParking className="w-4 h-4" strokeWidth={2.5} />
            Tiempo de estacionamiento incluido
          </div>
          <div className="text-xs font-medium text-[#15803d] leading-relaxed">
            Tu boleto incluye <strong>6 horas de estacionamiento</strong> a partir de tu hora de entrada.
          </div>
        </div>

        {/* Política */}
        <div className="bg-[#fff8f0] border-[3px] border-on-surface rounded-xl neo-brutal-shadow-sm p-4 mb-5">
          <div className="flex items-center gap-2 font-extrabold text-[11px] uppercase tracking-wider text-[#92400e] mb-2">
            <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
            Política de cancelaciones
          </div>
          <div className="text-xs font-medium text-[#b45309] leading-relaxed">
            NO SE ACEPTAN CANCELACIONES NI DEVOLUCIONES DENTRO DE LAS 6 HORAS PREVIAS AL INICIO DEL EVENTO. Transcurrido dicho plazo, el pago es definitivo e irrevocable.
          </div>
        </div>

        <NeoLinkButton href="/" className="w-full">Ir al inicio</NeoLinkButton>
      </div>
    </div>
  );
}
