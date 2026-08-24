'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, Info, MapPin, CheckSquare, AlertTriangle } from 'lucide-react';
import Navbar from '@/components/Navbar';

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#383497',
    colorBackground: '#ffffff',
    colorText: '#1e293b',
    colorDanger: '#e11d48',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: 'none',
      padding: '12px 14px',
      fontSize: '13px',
    },
    '.Input:focus': {
      border: '1px solid #383497',
      boxShadow: '0 0 0 2px rgba(56,52,151,0.15)',
    },
    '.Label': {
      fontSize: '10px',
      fontWeight: '600',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    '.Tab': { border: '1px solid #e2e8f0' },
    '.Tab--selected': { backgroundColor: '#383497', borderColor: '#383497' },
    '.Error': { fontSize: '12px' },
  },
};

interface CheckoutData { clientSecret: string; amount: number; eventName: string; }

// ─── Formulario interno (requiere contexto de Elements) ───────────────────────
function CheckoutForm({
  data, reservationId, onAmountChange,
}: {
  data: CheckoutData;
  reservationId: string;
  onAmountChange: (amount: number) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  // Por seguridad el checkbox de términos SIEMPRE inicia sin marcar (no auto-aceptado).
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoApplying(true);
    setPromoError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/payments/apply-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reservationId, code: promoCode.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : (d.message || 'Código inválido'));

      onAmountChange(d.amount);
      setPromoApplied(d.code);
    } catch (e: any) {
      setPromoError(e.message || 'No se pudo aplicar el código');
    } finally {
      setPromoApplying(false);
    }
  };

  const [phone, setPhone] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      const raw = (payload.phone as string) ?? '';
      if (raw.startsWith('521') && raw.length === 13) return raw.slice(3);
      if (raw.startsWith('52')  && raw.length === 12) return raw.slice(2);
      return raw;
    } catch { return ''; }
  });

  const handlePay = async () => {
    if (!stripe || !elements || !termsAccepted) return;
    setPaying(true);
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      const token = localStorage.getItem('token');
      const bare = digits.startsWith('521') && digits.length === 13
        ? digits.slice(3)
        : digits.startsWith('52') && digits.length === 12
          ? digits.slice(2)
          : digits;
      const fullPhone = `52${bare}`;
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: fullPhone }),
      }).catch(() => {});
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/confirmacion/${reservationId}` },
    });

    if (confirmError) {
      setError(confirmError.message || 'Error al procesar el pago');
      setPaying(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* WhatsApp */}
      <div className="space-y-1.5">
        <label className="block text-xs font-mono text-slate-400 uppercase">WhatsApp para recibir boleto QR</label>
        <input
          type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] font-mono tracking-wider transition-all"
          placeholder="+52 55 1234 5678"
        />
        <p className="text-[#383497] text-[11px] font-semibold flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          <span>Tu boleto QR llegará aquí inmediatamente tras el pago.</span>
        </p>
      </div>

      {/* Código promocional */}
      <div className="space-y-1.5">
        <label className="block text-xs font-mono text-slate-400 uppercase">Código promocional</label>
        {promoApplied ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
            <span className="text-emerald-700 text-xs font-bold">✅ Código "{promoApplied}" aplicado</span>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text" value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] font-mono tracking-wider transition-all uppercase"
                placeholder="CODIGO2026"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={promoApplying || !promoCode.trim()}
                className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider px-5 rounded-xl transition-all cursor-pointer"
              >
                {promoApplying ? '...' : 'Aplicar'}
              </button>
            </div>
            {promoError && <p className="text-rose-600 text-[11px] font-semibold">{promoError}</p>}
          </>
        )}
      </div>

      {/* Pago (Stripe Elements real) */}
      <div className="space-y-3">
        <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider">Datos de pago</span>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-5">
          <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'auto', googlePay: 'auto' } }} />
        </div>
      </div>

      {/* Términos */}
      <div onClick={() => setTermsAccepted(v => !v)} className="flex items-start gap-2.5 cursor-pointer select-none">
        <div className="mt-0.5">
          {termsAccepted ? (
            <div className="w-4 h-4 rounded bg-[#383497] text-white flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
          )}
        </div>
        <span className="text-[11px] text-slate-500 leading-normal">
          Acepto los{' '}
          <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#383497] font-bold hover:underline" onClick={e => e.stopPropagation()}>
            Términos de servicio
          </a>{' '}
          y autorizo el cargo inmediato por la reservación del cajón de estacionamiento.
        </span>
      </div>

      {error && <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>}

      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || !elements || paying || !termsAccepted}
        className="w-full bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {paying ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            Procesando pago seguro...
          </span>
        ) : (
          <><Lock className="w-4 h-4 text-indigo-200" /><span>Pagar ${Math.round(data.amount)} MXN</span></>
        )}
      </button>

      <div className="flex justify-center">
        <div className="bg-[#E6F4F1] text-[#006E66] border border-[#CDEAE5] text-[11px] font-bold uppercase tracking-wider font-sans rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Pago seguro · Stripe SSL</span>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
          🛡️ <span className="text-slate-800 font-bold">Garantía de cancelación:</span> Reembolso escalonado según anticipación — hasta 100% cancelando con más de 48 horas de anticipación.
        </p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.reservationId as string;
  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reservationId }),
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : d.message);
        return d;
      })
      .then(d => setData(d))
      .catch(e => setFetchError(e.message || 'No se pudo iniciar el pago. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, [reservationId]);

  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#04210f] rounded-full animate-spin" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400">Preparando pago...</p>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-slate-400" />
        <h2 className="font-bold text-lg text-brand-dark">No se pudo iniciar el pago</h2>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{fetchError}</p>
        <button onClick={() => router.back()} className="bg-[#04210f] hover:bg-[#12361d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer">← Volver</button>
      </div>
    </div>
  );

  return (
    <div className="bg-background min-h-screen py-10 px-6 font-sans">
      <Navbar back="back" showExplore={false} />

      <div className="max-w-xl mx-auto space-y-6 pt-24">
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl">
          {/* Header verde-negro / lima */}
          <div className="bg-[#04210f] text-[#DFF085] p-6 space-y-3 relative overflow-hidden">
            <span className="text-[10px] font-mono uppercase tracking-widest bg-emerald-950 px-2.5 py-1 rounded-full text-white font-bold border border-emerald-900">
              Resumen de reserva
            </span>
            <div className="space-y-1">
              <h2 className="text-white text-lg font-bold tracking-tight m-0">{data!.eventName}</h2>
              <p className="text-xs text-slate-300 flex items-center gap-1 m-0">
                <MapPin className="w-3.5 h-3.5" />
                <span>1 lugar de estacionamiento</span>
              </p>
            </div>
            <div className="flex items-end justify-between pt-4 border-t border-emerald-950">
              <span className="text-emerald-400 uppercase text-[9px] font-mono">Total a pagar</span>
              <span className="text-[#DFF085] font-black text-2xl font-mono">${Math.round(data!.amount)} MXN</span>
            </div>
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-[#DFF085]/10 rounded-full blur-2xl" />
          </div>

          {!STRIPE_KEY ? (
            <div className="p-6 text-center text-rose-600 text-sm font-bold">
              ⚠️ Pago no disponible en este momento. Contacta a soporte@estacionat.mx
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret: data!.clientSecret, appearance: STRIPE_APPEARANCE }}>
              <CheckoutForm
                data={data!}
                reservationId={reservationId}
                onAmountChange={amount => setData(prev => prev ? { ...prev, amount } : prev)}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
