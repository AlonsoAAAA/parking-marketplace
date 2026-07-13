'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, CalendarDays, Clock, CreditCard, QrCode, ChevronRight, SquareParking, Ticket } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoLinkButton } from '@/components/ui/neo';

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
  pending:   { label: 'Pendiente de pago', cls: 'bg-[#fef3c7] text-[#b45309]' },
  paid:      { label: 'Pagado',            cls: 'bg-[#dcfce7] text-[#166534]' },
  used:      { label: 'Utilizado',         cls: 'bg-[#dbeafe] text-[#1e40af]' },
  expired:   { label: 'Expirado',          cls: 'bg-surface-container-high text-on-surface-variant' },
  cancelled: { label: 'Cancelado',         cls: 'bg-error-container text-error' },
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
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="/" showTickets={false} />

      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-8 pb-20">
        <h1 className="font-extrabold text-2xl md:text-3xl uppercase tracking-tight text-on-surface mb-1">Mis boletos</h1>
        <p className="text-[13px] font-medium text-on-surface-variant mb-7">Tus reservas y boletos de estacionamiento</p>

        {loading && (
          <div className="text-center py-16 font-extrabold text-[11px] tracking-[2px] uppercase text-on-surface-variant">
            Cargando...
          </div>
        )}
        {error && <div className="bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}

        {!loading && !error && reservations.length === 0 && (
          <div className="text-center py-14 bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow px-6">
            <Ticket className="w-12 h-12 mx-auto mb-4 text-on-surface" strokeWidth={2} />
            <div className="font-extrabold text-base uppercase tracking-tight text-on-surface mb-1.5">Aún no tienes boletos</div>
            <div className="text-[13px] font-medium text-on-surface-variant mb-6">Reserva tu lugar para el próximo evento</div>
            <NeoLinkButton href="/" className="inline-flex w-auto">Ver eventos →</NeoLinkButton>
          </div>
        )}

        {!loading && active.length > 0 && (
          <>
            <p className="font-extrabold text-[11px] uppercase tracking-[2px] text-on-surface-variant mt-6 mb-3">Activos</p>
            {active.map((r, i) => <BoletoCard key={r.id} r={r} i={i} />)}
          </>
        )}

        {!loading && past.length > 0 && (
          <>
            <p className="font-extrabold text-[11px] uppercase tracking-[2px] text-on-surface-variant mt-8 mb-3">Historial</p>
            {past.map((r, i) => <BoletoCard key={r.id} r={r} i={i} faded />)}
          </>
        )}
      </div>
    </div>
  );
}

function BoletoCard({ r, i, faded }: { r: Reservation; i: number; faded?: boolean }) {
  const st = STATUS[r.status] ?? STATUS.expired;

  return (
    <Link
      href={`/mis-boletos/${r.id}`}
      className="block bg-white border-[3px] border-on-surface rounded-xl p-4 md:p-5 mb-4 no-underline neo-brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 [animation:fadeIn_.4s_ease_both]"
      style={{ opacity: faded ? 0.65 : 1, animationDelay: `${i * 0.06}s` }}>

      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`inline-flex items-center font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border-2 border-on-surface flex-shrink-0 ${st.cls}`}>{st.label}</span>
        <ChevronRight className="w-5 h-5 text-on-surface/30 flex-shrink-0 self-center" strokeWidth={3} />
      </div>

      <div className="font-extrabold text-base uppercase tracking-tight text-on-surface leading-snug mb-1">{r.event_name}</div>
      <div className="flex items-center gap-1.5 text-on-surface-variant mb-3">
        <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
        <span className="text-xs font-semibold">{r.venue_name}</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-on-surface-variant">
          <CalendarDays className="w-3.5 h-3.5" strokeWidth={2.5} />{fmtDate(r.starts_at)}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-on-surface-variant">
          <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />{fmtTime(r.starts_at)}
        </span>
        {r.parking_name && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-on-surface-variant">
            <SquareParking className="w-3.5 h-3.5" strokeWidth={2.5} />{r.parking_name}
          </span>
        )}
        {r.payment_amount && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-on-surface-variant">
            <CreditCard className="w-3.5 h-3.5" strokeWidth={2.5} />${parseFloat(r.payment_amount).toFixed(0)} MXN
          </span>
        )}
      </div>

      {(r.vehicle_plate || r.qr_token) && (
        <div className="flex items-center gap-2.5 flex-wrap mt-3 pt-3 border-t-2 border-dashed border-on-surface/15">
          {r.vehicle_plate && (
            <span className="font-mono font-bold text-xs text-on-surface bg-surface-container border-2 border-on-surface rounded-lg px-2.5 py-1">
              {r.vehicle_plate}
            </span>
          )}
          {r.qr_token && (
            <span className="inline-flex items-center gap-1.5 font-extrabold text-[10px] uppercase tracking-wider text-[#166534] bg-[#dcfce7] border-2 border-on-surface rounded-lg px-2.5 py-1">
              <QrCode className="w-3.5 h-3.5" strokeWidth={2.5} />
              QR listo
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
