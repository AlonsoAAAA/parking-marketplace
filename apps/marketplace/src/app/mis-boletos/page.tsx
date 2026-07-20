'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, QrCode, ChevronRight, Inbox } from 'lucide-react';
import Navbar from '@/components/Navbar';

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

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente', cls: 'bg-[#FFF9E6] text-[#B28200] border-[#f0dbb2]/50' },
  paid:      { label: 'Pagado',    cls: 'bg-[#EAF4EB] text-[#2F7A3E] border-[#cbd9cd]/50' },
  used:      { label: 'Utilizado', cls: 'bg-[#E6F5F2] text-[#007E75] border-[#cbebe5]/50' },
  expired:   { label: 'Expirado',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  cancelled: { label: 'Cancelado', cls: 'bg-[#FEEBEA] text-[#D32F2F] border-[#fbd4d2]/50' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function MisBoletosPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'activos' | 'historial'>('activos');

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
  const displayed = activeTab === 'activos' ? active : past;

  return (
    <div className="bg-background min-h-screen py-10 px-6 font-sans">
      <Navbar showExplore={false} />

      <div className="max-w-2xl mx-auto space-y-6 pt-24">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#04210f] tracking-tight">Mis reservas</h1>
          <p className="text-slate-500 text-sm">Gestiona tus boletos de estacionamiento y códigos QR de acceso.</p>
        </div>

        {error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-rose-700 text-xs font-bold">{error}</div>}

        {loading ? (
          <div className="text-center py-16 text-sm font-medium text-slate-400">Cargando...</div>
        ) : (
          <>
            <div className="border-b border-slate-200 flex gap-6">
              <button
                onClick={() => setActiveTab('activos')}
                className={`pb-3 text-sm font-mono font-bold uppercase tracking-wider transition-all relative bg-transparent border-none cursor-pointer ${
                  activeTab === 'activos' ? 'text-[#383497]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Activos ({active.length})
                {activeTab === 'activos' && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#383497] rounded-full" />}
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`pb-3 text-sm font-mono font-bold uppercase tracking-wider transition-all relative bg-transparent border-none cursor-pointer ${
                  activeTab === 'historial' ? 'text-[#383497]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Historial ({past.length})
                {activeTab === 'historial' && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#383497] rounded-full" />}
              </button>
            </div>

            {displayed.length > 0 ? (
              <div className="space-y-4">
                {displayed.map(r => {
                  const st = STATUS[r.status] ?? STATUS.expired;
                  return (
                    <Link
                      key={r.id}
                      href={`/mis-boletos/${r.id}`}
                      className="block bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all p-5 md:p-6 no-underline relative overflow-hidden group [animation:fadeIn_.3s_ease_both]"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${st.cls}`}>● {st.label}</span>
                            <span className="text-slate-400 font-mono text-[11px] font-semibold">Folio: {r.id.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-black text-slate-800 text-lg leading-tight m-0 group-hover:text-[#383497] transition-colors">{r.event_name}</h3>
                            <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 m-0">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{r.venue_name}{r.parking_name ? ` • ${r.parking_name}` : ''}</span>
                            </p>
                          </div>
                          <div className="flex gap-4 text-xs font-mono text-slate-600 pt-2 border-t border-slate-50">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{fmtDate(r.starts_at)}</span>
                            <span>•</span>
                            <span>{fmtTime(r.starts_at)}</span>
                            {r.vehicle_plate && (<><span>•</span><span>{r.vehicle_plate}</span></>)}
                          </div>
                        </div>

                        <div className="sm:text-right flex sm:flex-col justify-between sm:justify-start items-center sm:items-end w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                          {r.payment_amount && (
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-400 font-mono uppercase m-0">Monto</p>
                              <p className="font-mono text-base font-black text-[#383497] m-0">${parseFloat(r.payment_amount).toFixed(0)} MXN</p>
                            </div>
                          )}
                          {r.qr_token && (r.status === 'paid' || r.status === 'pending') && (
                            <span className="bg-[#DFF085] text-[#04210f] text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm flex items-center gap-1 border border-[#aec24f]">
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR listo</span>
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-slate-300 hidden sm:block group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center space-y-6 max-w-md mx-auto">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                    <Inbox className="w-10 h-10 stroke-[1.2]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-800 text-lg m-0">No tienes boletos {activeTab}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto m-0">
                    {activeTab === 'activos'
                      ? 'Aún no realizas ninguna reservación de cajón de estacionamiento para tus próximos eventos.'
                      : 'No tienes boletos anteriores o cancelados registrados en tu cuenta.'}
                  </p>
                </div>
                <Link href="/" className="inline-flex bg-[#383497] hover:bg-[#2b278c] text-white font-sans text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-md transition-all no-underline">
                  Ver eventos
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
