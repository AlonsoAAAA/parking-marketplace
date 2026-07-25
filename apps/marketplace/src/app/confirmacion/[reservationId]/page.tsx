'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, MessageSquare, AlertTriangle, SquareParking } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface TicketData {
  reservation: { id: string; status: string; createdAt: string; };
  event: { name: string; venueName: string; startsAt: string; parkingName: string; parkingAddress: string; };
  payment: { amount: number; };
  qrToken: string;
  userPhone?: string;
}

const STEPS = [
  { title: 'Llega a tiempo', text: 'Te sugerimos llegar con anticipación al inicio del evento.' },
  { title: 'Muestra el QR', text: 'Ten tu QR digital listo en tu celular para que sea escaneado en el acceso.' },
  { title: 'Estaciónate', text: 'El personal recibirá tu auto o te asignará tu lugar al llegar.' },
  { title: 'Disfruta', text: 'Tu coche se queda seguro en lote cerrado con vigilancia permanente.' },
];

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
        width: isDesktop ? 220 : 180, margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      qrRef.current.innerHTML = '';
      qrRef.current.appendChild(canvas);
    } catch {
      if (qrRef.current) qrRef.current.innerHTML = '<p style="color:#94a3b8;font-size:12px;text-align:center">QR enviado<br/>por WhatsApp</p>';
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#383497] rounded-full animate-spin" />
      <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Confirmando pago...</p>
    </div>
  );

  if (!ticket) return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center gap-3 px-6 text-center">
      <SquareParking className="w-12 h-12 text-slate-400" />
      <p className="font-bold text-lg text-brand-dark">¡Pago confirmado!</p>
      <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
        Tu reserva está lista. Recibirás tu código QR por WhatsApp en los próximos minutos.
      </p>
      <Link href="/" className="mt-2 text-xs font-bold text-[#383497] underline">Ir al inicio</Link>
    </div>
  );

  const ticketId = `TKT-${reservationId.slice(0,8).toUpperCase()}`;
  const subtotal = ticket.payment.amount / 1.16;
  const iva = ticket.payment.amount - subtotal;

  return (
    <div className="bg-background min-h-screen py-12 px-6 font-sans">
      <Navbar showExplore={false} />

      <div className="max-w-2xl mx-auto space-y-8 pt-24">
        {/* Éxito */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-[#F0F5F1] rounded-full flex items-center justify-center border-4 border-[#cbd9cd]">
              <Check className="w-10 h-10 text-emerald-700" strokeWidth={3.5} />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#383497] tracking-tight">¡Lugar confirmado!</h1>
          <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto">
            Tu lugar ha quedado reservado y asegurado con éxito. Se ha generado tu acceso digital.
          </p>
        </div>

        {/* Card de boleto */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-8 space-y-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-inner">
                <div className="w-[180px] h-[180px] lg:w-[220px] lg:h-[220px] flex items-center justify-center" ref={qrRef}>
                  {qrError
                    ? <p className="text-slate-400 text-xs leading-relaxed">QR enviado<br/>por WhatsApp</p>
                    : <div className="w-7 h-7 border-[3px] border-slate-200 border-t-[#383497] rounded-full animate-spin" />
                  }
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Folio digital</span>
              <p className="text-lg font-mono font-black text-slate-800 tracking-widest">{ticketId}</p>
            </div>
          </div>

          {/* Detalle */}
          <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
            <div className="bg-[#04210f] text-[#DFF085] p-4 text-left font-mono text-xs flex justify-between items-center">
              <span>DETALLES DEL ACCESO</span>
            </div>
            <div className="divide-y divide-slate-100 bg-slate-50 text-left text-xs font-sans">
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase">Evento</span>
                <span className="col-span-2 font-bold text-slate-800">{ticket.event.name}</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase">Estacionamiento</span>
                <span className="col-span-2 font-bold text-slate-800">{ticket.event.parkingName}</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase">Dirección</span>
                <span className="col-span-2 text-slate-600 leading-normal">{ticket.event.parkingAddress}</span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-mono text-[10px] uppercase">Fecha</span>
                <span className="col-span-2 text-slate-700 font-semibold capitalize">
                  {new Date(ticket.event.startsAt).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'long'})}
                </span>
              </div>
              <div className="p-4 space-y-2 bg-emerald-50/30">
                <div className="flex justify-between font-mono text-[11px] text-slate-500">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] text-slate-500">
                  <span>IVA (16%)</span><span>${iva.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between font-mono text-xs text-slate-800 font-bold pt-2 border-t border-slate-100">
                  <span className="uppercase text-[10px]">Total pagado</span>
                  <span className="text-emerald-700 text-sm font-black">${ticket.payment.amount.toFixed(2)} MXN</span>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-[#F0F5F1] border border-[#E0EAE2] rounded-2xl p-4 flex items-center gap-3 text-left">
            <div className="bg-emerald-600 text-white rounded-full p-2.5 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-emerald-950 m-0">También lo enviamos a tu WhatsApp</p>
              <p className="text-[11px] text-slate-600 leading-normal m-0">
                Hemos enviado este boleto QR y las instrucciones de llegada{ticket.userPhone ? ` a ${ticket.userPhone}` : ''}.
              </p>
            </div>
          </div>
        </div>

        {/* Pasos */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Pasos para el día de tu llegada</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#383497] text-white flex items-center justify-center font-mono font-black text-sm">
                  {i + 1}
                </div>
                <p className="text-xs font-bold text-slate-800 m-0">{s.title}</p>
                <p className="text-[11px] text-slate-500 leading-normal m-0">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Política de cancelación */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold uppercase tracking-wide text-amber-950 m-0">Política de cancelación importante</h4>
            <p className="leading-relaxed m-0">
              Puedes solicitar un reembolso del 100% desde{' '}
              <Link href="/mis-boletos" className="font-bold underline">Mis boletos</Link>{' '}
              hasta 6 horas antes del inicio del evento. Pasado ese plazo no se admiten cancelaciones ni reembolsos.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/mis-boletos" className="bg-[#383497] hover:bg-[#2b278c] text-white font-bold py-3.5 px-8 rounded-xl text-sm uppercase tracking-wider shadow hover:shadow-lg transition-all text-center no-underline">
            Ver mis boletos
          </Link>
          <Link href="/" className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider transition-all text-center no-underline border border-slate-200">
            ← Ir a inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
