'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Ticket, Lock, AlertTriangle } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoButton, NeoInput, NeoLabel, NeoSpinner } from '@/components/ui/neo';

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#191c1d',
    colorBackground: '#ffffff',
    colorText: '#191c1d',
    colorDanger: '#ba1a1a',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#ffffff',
      border: '3px solid #191c1d',
      boxShadow: 'none',
      padding: '12px 14px',
      fontSize: '14px',
      fontWeight: '600',
    },
    '.Input:focus': {
      boxShadow: '3px 3px 0px 0px #191c1d',
      backgroundColor: '#ffffff',
      border: '3px solid #191c1d',
    },
    '.Label': {
      fontSize: '11px',
      fontWeight: '800',
      color: '#191c1d',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    '.Tab': {
      border: '3px solid #191c1d',
      boxShadow: '2px 2px 0px 0px #191c1d',
    },
    '.Tab--selected': {
      backgroundColor: '#ccff00',
      border: '3px solid #191c1d',
    },
    '.Error': { fontSize: '12px', fontWeight: '600' },
  },
};

interface CheckoutData { clientSecret: string; amount: number; eventName: string; }


// ─── Formulario interno (requiere contexto de Elements) ───────────────────────
function CheckoutForm({ data, reservationId }: { data: CheckoutData; reservationId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [phone, setPhone] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      const raw = (payload.phone as string) ?? '';
      // Normalizar a 10 dígitos para mostrar en el campo
      if (raw.startsWith('521') && raw.length === 13) return raw.slice(3); // legacy Twilio
      if (raw.startsWith('52')  && raw.length === 12) return raw.slice(2); // estándar
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
      // Normalizar a 52+10dígitos: quitar prefijo 521 (legacy Twilio) o 52, luego agregar 52
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
      confirmParams: {
        return_url: `${window.location.origin}/confirmacion/${reservationId}`,
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Error al procesar el pago');
      setPaying(false);
    }
  };

  return (
    <>
      <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-4 md:p-5 mb-4">
        <NeoLabel>Tu número de WhatsApp</NeoLabel>
        <div className="flex gap-2.5">
          <div className="px-4 py-3.5 bg-surface-container-high border-[3px] border-on-surface rounded-xl font-mono font-bold text-sm text-on-surface flex-shrink-0 flex items-center">+52</div>
          <NeoInput
            className="font-mono"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="55 1234 5678"
            type="tel"
          />
        </div>
        <p className="text-[11px] font-semibold text-on-surface-variant mt-2.5">
          💬 Tu boleto QR llegará aquí cuando pagues
        </p>
      </div>

      <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-4 md:p-5 mb-4">
        <NeoLabel className="mb-3.5">Tarjeta</NeoLabel>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {/* Términos y condiciones */}
      <div
        className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-4 md:p-5 mb-4 flex items-start gap-3.5 cursor-pointer"
        onClick={() => setTermsAccepted(v => !v)}>
        {/* Checkbox custom */}
        <div className={`w-6 h-6 rounded-lg flex-shrink-0 border-[3px] border-on-surface flex items-center justify-center transition-all duration-150 ${
          termsAccepted ? 'bg-primary-container neo-brutal-shadow-sm' : 'bg-white'
        }`}>
          {termsAccepted && (
            <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#191c1d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="text-[13px] font-semibold text-on-surface leading-relaxed">
          He leído y acepto los{' '}
          <a
            href="/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="font-extrabold underline"
            onClick={e => e.stopPropagation()}>
            Términos y Condiciones
          </a>
          {' '}de Estacionat
        </div>
      </div>

      {error && <div className="mb-4 bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t-[3px] border-on-surface px-5 py-4 pb-[calc(16px+env(safe-area-inset-bottom))] z-50 sm:max-w-[480px] sm:mx-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:rounded-t-xl sm:border-x-[3px] lg:static lg:bg-transparent lg:border-none lg:p-0 lg:max-w-none lg:translate-x-0 lg:mt-1">
        {/* Aviso si no aceptó */}
        {!termsAccepted && (
          <div className="flex items-center gap-2 mb-2.5 px-3 py-2 bg-surface-container border-2 border-on-surface rounded-lg">
            <span className="text-sm">☝️</span>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">Acepta los términos para continuar</span>
          </div>
        )}
        <NeoButton
          className="w-full"
          onClick={handlePay}
          disabled={!stripe || !elements || paying || !termsAccepted}
        >
          {paying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-on-surface/30 border-t-on-surface rounded-full animate-spin inline-block" />
              Procesando...
            </span>
          ) : (
            <><Lock className="w-4 h-4" strokeWidth={2.5} /> Pagar ${Math.round(data.amount)} MXN</>
          )}
        </NeoButton>
        <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold text-on-surface-variant mt-2.5">
          Pago seguro · Stripe SSL 256-bit
        </div>
      </div>
    </>
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
      <NeoHeader back="back" showTickets={false} />
      <NeoSpinner label="Preparando pago..." />
    </div>
  );

  if (fetchError) return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="back" showTickets={false} />
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-on-surface" strokeWidth={2} />
        <h2 className="font-extrabold text-lg uppercase tracking-tight text-on-surface">No se pudo iniciar el pago</h2>
        <p className="text-[13px] font-medium text-on-surface-variant max-w-xs leading-relaxed">{fetchError}</p>
        <NeoButton variant="dark" onClick={() => router.back()}>← Volver</NeoButton>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      <NeoHeader back="back" showTickets={false} />

      <div className="max-w-md mx-auto px-5 pt-7 pb-36 lg:max-w-6xl lg:px-8 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start lg:pb-16">

        {/* LEFT: resumen del pedido (sticky en desktop) */}
        <div className="lg:sticky lg:top-24">
          <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow overflow-hidden mb-4">
            <div className="bg-on-surface px-4 py-3 flex items-center gap-2.5">
              <Ticket className="w-4 h-4 text-primary-container" strokeWidth={2.5} />
              <span className="font-extrabold text-[13px] text-white uppercase tracking-tight">{data!.eventName}</span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold text-on-surface-variant">1 lugar de estacionamiento</span>
                <span className="font-mono font-bold text-on-surface">${Math.round(data!.amount)} MXN</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t-2 border-dashed border-on-surface/15">
                <span className="font-extrabold text-sm uppercase tracking-tight text-on-surface">Total</span>
                <span className="font-mono font-bold text-base text-on-surface">${Math.round(data!.amount)} MXN</span>
              </div>
            </div>
          </div>

          {/* Beneficios — solo visibles en desktop */}
          <div className="hidden lg:block bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-4">
            {['Lugar garantizado antes de llegar','Código QR único por WhatsApp','Sin cobros adicionales en puerta','Cancelación hasta 6 hrs antes'].map((item, i, arr) => (
              <div key={item} className={`flex items-center gap-2.5 py-2.5 text-[13px] font-semibold text-on-surface ${i < arr.length - 1 ? 'border-b-2 border-dashed border-on-surface/10' : ''}`}>
                <div className="w-5 h-5 bg-primary-container border-2 border-on-surface rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="#191c1d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: formulario de pago */}
        <div>
          {!STRIPE_KEY ? (
            <div className="bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow p-5 text-center text-error text-[13px] font-bold">
              ⚠️ Pago no disponible en este momento. Contacta a soporte@estacionat.mx
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: data!.clientSecret, appearance: STRIPE_APPEARANCE }}
            >
              <CheckoutForm data={data!} reservationId={reservationId} />
            </Elements>
          )}
        </div>

      </div>
    </div>
  );
}
