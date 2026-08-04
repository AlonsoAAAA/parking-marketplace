'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, CreditCard, AlertTriangle, CheckCircle2, Upload, Send, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '@/components/Navbar';

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
  vehiclePlate: string | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente', cls: 'bg-[#FFF9E6] text-[#B28200] border-[#f0dbb2]/50' },
  paid:      { label: 'Pagado',    cls: 'bg-[#EAF4EB] text-[#2F7A3E] border-[#cbd9cd]/50' },
  used:      { label: 'Utilizado', cls: 'bg-[#E6F5F2] text-[#007E75] border-[#cbebe5]/50' },
  expired:   { label: 'Expirado',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  cancelled: { label: 'Cancelado', cls: 'bg-[#FEEBEA] text-[#D32F2F] border-[#fbd4d2]/50' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
  const [dragActive, setDragActive] = useState(false);

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

  useEffect(() => {
    if (ticket?.qrToken && qrRef.current) renderQR(ticket.qrToken);
  }, [ticket]);

  const renderQR = async (token: string) => {
    if (!qrRef.current) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      const size = typeof window !== 'undefined' && window.innerWidth >= 640 ? 220 : 180;
      await QRCode.toCanvas(canvas, JSON.stringify({ t: token }), {
        width: size, margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      qrRef.current.innerHTML = '';
      qrRef.current.appendChild(canvas);
    } catch {
      if (qrRef.current) qrRef.current.innerHTML =
        '<p style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.6">No se pudo<br/>generar el QR</p>';
    }
  };

  const addFiles = async (files: File[]) => {
    const toBase64 = (f: File) => new Promise<string>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
    });
    const encoded = await Promise.all(files.map(toBase64));
    setRefundPhotos(prev => [...prev, ...encoded].slice(0, 5));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) addFiles(Array.from(e.dataTransfer.files));
  };

  const submitRefund = async () => {
    if (!refundReason.trim()) return;
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
  };

  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="/mis-boletos" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#04210f] rounded-full animate-spin" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Cargando boleto...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="/mis-boletos" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-bold text-rose-600">{error}</p>
        <Link href="/mis-boletos" className="text-xs font-semibold text-slate-500 no-underline">← Volver</Link>
      </div>
    </div>
  );

  if (!ticket) return null;

  const st = STATUS[ticket.reservation.status] ?? STATUS.expired;
  const ticketId = `TKT-${id.slice(0, 8).toUpperCase()}`;
  const isPaid    = ticket.reservation.status === 'paid';
  const isPending = ticket.reservation.status === 'pending';
  const isUsed    = ticket.reservation.status === 'used';
  const hasQR     = isPaid || isUsed;
  const canRefund = isPaid && new Date(ticket.event.startsAt) > new Date(Date.now() + 24 * 3600 * 1000);
  const canChangeVehicle = isPaid && new Date(ticket.event.startsAt) > new Date();
  const exitTime  = fmtTime(new Date(new Date(ticket.event.startsAt).getTime() + 6 * 3600 * 1000).toISOString());

  return (
    <div className="bg-background min-h-screen py-10 px-6 font-sans">
      <Navbar back="/mis-boletos" showExplore={false} />

      <div className="max-w-xl mx-auto space-y-6 pt-24 pb-16">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-brand-dark tracking-tight m-0">Detalle de boleto</h1>
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${st.cls}`}>● {st.label}</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          {/* Header verde-negro */}
          <div className="bg-[#04210f] text-white p-6 relative overflow-hidden space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-snug m-0">{ticket.event.name}</h2>
              <p className="text-[#DFF085] text-xs font-mono font-semibold flex items-center gap-1 m-0">
                <MapPin className="w-3.5 h-3.5" />
                <span>{ticket.event.venueName}{ticket.event.parkingName ? ` • ${ticket.event.parkingName}` : ''}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-950 text-xs font-mono">
              <div>
                <span className="text-emerald-400 block uppercase text-[9px] tracking-wide">Fecha y hora</span>
                <span className="text-white font-bold block mt-0.5 capitalize">{fmtDate(ticket.event.startsAt)} • {fmtTime(ticket.event.startsAt)}</span>
              </div>
              <div>
                <span className="text-emerald-400 block uppercase text-[9px] tracking-wide">Folio</span>
                <span className="text-white font-bold block mt-0.5">{ticketId}</span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* QR */}
            {hasQR && (
              <div className="flex flex-col items-center space-y-3 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dotted border-slate-300">
                  <div className="bg-white p-2 rounded-xl">
                    <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] flex items-center justify-center" ref={qrRef}>
                      {ticket.qrToken
                        ? <div className="w-7 h-7 border-[3px] border-slate-200 border-t-[#383497] rounded-full animate-spin" />
                        : <p className="text-slate-400 text-xs leading-relaxed">QR enviado<br/>por WhatsApp</p>
                      }
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed text-center max-w-[260px] m-0">
                  Muestra este código al llegar al estacionamiento. <strong className="text-slate-800">Es de uso único.</strong>
                </p>
                {isUsed && ticket.qrToken && (
                  <div className="inline-flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-[#007E75] bg-[#E6F5F2] border border-[#cbebe5] rounded-full px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ya fue escaneado
                  </div>
                )}
              </div>
            )}

            {/* Pago pendiente */}
            {isPending && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center space-y-3">
                <CreditCard className="w-8 h-8 mx-auto text-amber-600" />
                <div className="font-bold text-amber-950 text-sm">Completa tu pago</div>
                <p className="text-xs text-amber-800 leading-relaxed m-0">Tu lugar está reservado temporalmente. Complétalo antes de que expire.</p>
                <Link href={`/checkout/${id}`} className="inline-block bg-[#383497] hover:bg-[#2b278c] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl no-underline">
                  Pagar ahora →
                </Link>
              </div>
            )}

            {/* Horarios */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden text-xs">
              <div className="bg-slate-50 p-3.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Horarios de operación autorizados
              </div>
              <div className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 font-semibold">Hora de entrada:</span>
                  <span className="font-bold text-slate-800 text-right">{fmtTime(ticket.event.startsAt)} hrs</span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-500 font-semibold">Hora máxima de salida:</span>
                  <span className="font-bold text-rose-700 text-right">{exitTime} hrs (+6 hrs)</span>
                </div>
                {ticket.vehiclePlate && (
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500 font-semibold">Placas:</span>
                    <span className="font-bold text-slate-800 text-right font-mono tracking-wider">{ticket.vehiclePlate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Desglose */}
            {ticket.payment.amount > 0 && (
              <div className="bg-[#FAFAFA] border border-slate-100 rounded-2xl p-4 space-y-2.5 font-mono text-[11px] text-slate-500">
                <div className="flex justify-between text-slate-400 text-[9px] uppercase tracking-wider pb-1.5 border-b border-slate-100">
                  <span>Concepto de cargo</span><span>Monto</span>
                </div>
                <div className="flex justify-between"><span>Subtotal:</span><span>${(ticket.payment.amount / 1.16).toFixed(2)} MXN</span></div>
                <div className="flex justify-between"><span>IVA (16%):</span><span>${(ticket.payment.amount - ticket.payment.amount / 1.16).toFixed(2)} MXN</span></div>
                <div className="flex justify-between text-slate-800 font-bold text-xs pt-2 border-t border-slate-100">
                  <span>TOTAL:</span><span>${ticket.payment.amount.toFixed(2)} MXN</span>
                </div>
              </div>
            )}

            {/* Cambiar vehículo */}
            {canChangeVehicle && (
              <div className="pt-2 border-t border-slate-100">
                <Link
                  href={`/mis-boletos/${id}/cambiar-vehiculo`}
                  className="w-full text-[#383497] hover:text-[#2b278c] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 py-1 no-underline"
                >
                  <span>Cambiar vehículo</span>
                </Link>
              </div>
            )}

            {/* Solicitar reembolso */}
            {canRefund && !refundDone && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundOpen(v => !v)}
                  className="w-full text-[#383497] hover:text-[#2b278c] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer py-1 bg-transparent border-none"
                >
                  <span>{refundOpen ? 'Ocultar solicitud' : 'Solicitar reembolso'}</span>
                  {refundOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {refundOpen && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 [animation:fadeIn_.2s_ease_both]">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase">Motivo del reembolso</label>
                      <textarea
                        required rows={3} maxLength={500}
                        value={refundReason} onChange={e => setRefundReason(e.target.value)}
                        placeholder="Por favor explica brevemente el motivo de tu cancelación..."
                        className="w-full bg-white border border-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] transition-all text-slate-700 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase">Sube evidencias o fotos (opcional, máx. 5)</label>
                      <div
                        onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                          dragActive ? 'border-[#383497] bg-[#383497]/5' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="file" id="photos-upload" accept="image/*" multiple
                          onChange={e => e.target.files && addFiles(Array.from(e.target.files))}
                          className="hidden"
                        />
                        <label htmlFor="photos-upload" className="cursor-pointer space-y-1.5 block">
                          <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs text-slate-600 font-semibold m-0">
                            Arrastra tus fotos aquí o <span className="text-[#383497] underline">busca archivos</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono uppercase m-0">Formatos admitidos: JPG, PNG</p>
                        </label>
                      </div>
                      {refundPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {refundPhotos.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl p-4 flex items-start gap-3 shadow-sm text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed m-0">
                        <span className="font-extrabold uppercase text-amber-950">Política de reembolso:</span> Reembolso escalonado según anticipación (100% con +48h, 70% entre 36-48h, 50% entre 24-36h). Sin reembolso dentro de las 24 horas previas al evento. Tu solicitud está sujeta a nuestros{' '}
                        <a href="/terminos" target="_blank" rel="noopener noreferrer" className="font-extrabold underline text-amber-950">
                          términos y condiciones
                        </a>
                        {' '}y puede ser rechazada.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!refundReason.trim() || refundSending}
                      onClick={submitRefund}
                      className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-sans text-xs font-black uppercase tracking-widest py-3 rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-rose-200" />
                      <span>{refundSending ? 'Procesando reembolso...' : 'Enviar solicitud de reembolso'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {refundDone && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-xs leading-relaxed">
                📌 <span className="font-bold text-rose-950">Solicitud enviada.</span> Tu solicitud de reembolso fue enviada. El equipo la revisará en breve.
              </div>
            )}
          </div>
        </div>

        <Link href="/mis-boletos" className="block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider transition-all no-underline border border-slate-200">
          ← Ver todos mis boletos
        </Link>
      </div>
    </div>
  );
}
