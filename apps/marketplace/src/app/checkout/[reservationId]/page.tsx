'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { SHARED_CSS } from '@/lib/design';

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#1a1a1a',
    colorBackground: '#ffffff',
    colorText: '#1a1a1a',
    colorDanger: '#e53e3e',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#f5f5f5',
      border: 'none',
      boxShadow: 'none',
      padding: '12px 14px',
      fontSize: '14px',
    },
    '.Input:focus': {
      boxShadow: '0 0 0 1.5px #1a1a1a',
      backgroundColor: '#f5f5f5',
    },
    '.Label': {
      fontSize: '11px',
      fontWeight: '600',
      color: '#999',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    '.Error': { fontSize: '12px' },
  },
};

interface CheckoutData { clientSecret: string; amount: number; eventName: string; }

// ─── Modal de Términos y Condiciones ──────────────────────────────────────────
function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fadeIn .2s ease both',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 560, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp .25s ease both',
      }} onClick={e => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: '#bbb', marginBottom: 4 }}>PARKMX</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.3px' }}>Términos y Condiciones</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#666', flexShrink: 0 }}>×</button>
        </div>

        {/* Contenido desplazable */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 32px', fontSize: 13, color: '#444', lineHeight: 1.7 }}>

          <Section title="1. Descripción del servicio">
            ParkMX es una plataforma digital que permite a los usuarios reservar lugares de estacionamiento en instalaciones asociadas cercanas a venues de eventos. La reservación garantiza disponibilidad del lugar conforme a los términos aquí descritos.
          </Section>

          <Section title="2. Reservaciones">
            Al realizar una reservación confirmas que la información proporcionada es verídica. Cada reservación es personal e intransferible. El código QR generado es de uso único y exclusivo para el vehículo indicado. ParkMX no se hace responsable del uso indebido del código QR por terceros.
          </Section>

          <Section title="3. Pagos">
            El cobro se realiza en el momento de confirmar la reservación a través de la pasarela de pago Stripe. Los precios se muestran en pesos mexicanos (MXN) e incluyen todos los cargos aplicables. No se realizan cobros adicionales al momento de llegar al estacionamiento.
          </Section>

          <Section title="4. Cancelaciones y reembolsos">
            Las reservaciones pueden cancelarse hasta <strong>2 horas antes</strong> del inicio del evento para recibir un reembolso completo. Cancelaciones realizadas después de ese plazo no generan reembolso. Para solicitar una cancelación contacta a soporte@parkmx.mx.
          </Section>

          <Section title="5. Disponibilidad del lugar">
            El lugar reservado está garantizado mientras el usuario llegue dentro del horario del evento. ParkMX no garantiza disponibilidad en caso de fuerza mayor (desastres naturales, cortes de servicio, etc.). En tales casos se gestionará el reembolso correspondiente.
          </Section>

          <Section title="6. Responsabilidad">
            ParkMX actúa como intermediario entre el usuario y los operadores de estacionamiento. No nos hacemos responsables por daños, robo o pérdida de objetos dentro del estacionamiento. El operador del inmueble es responsable de la seguridad dentro de sus instalaciones.
          </Section>

          <Section title="7. Datos personales">
            La información recopilada (nombre, teléfono, datos de pago) es utilizada exclusivamente para procesar tu reservación y enviarte el boleto por WhatsApp. No compartimos tus datos con terceros salvo los necesarios para procesar el pago (Stripe) y el envío de mensajes (Twilio). Consulta nuestro Aviso de Privacidad en parkmx.mx/privacidad.
          </Section>

          <Section title="8. Modificaciones">
            ParkMX se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la plataforma con al menos 7 días de anticipación.
          </Section>

          <div style={{ fontSize: 11, color: '#bbb', marginTop: 20 }}>Última actualización: mayo 2026 · soporte@parkmx.mx</div>
        </div>

        {/* Botón de cerrar */}
        <div style={{ padding: '12px 24px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid #f0f0f0', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: '14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#1a1a1a', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

// ─── Formulario interno (requiere contexto de Elements) ───────────────────────
function CheckoutForm({ data, reservationId }: { data: CheckoutData; reservationId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [phone, setPhone] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      const raw = (payload.phone as string) ?? '';
      return raw.startsWith('52') ? raw.slice(2) : raw;
    } catch { return ''; }
  });

  const handlePay = async () => {
    if (!stripe || !elements || !termsAccepted) return;
    setPaying(true);
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      const token = localStorage.getItem('token');
      const fullPhone = digits.startsWith('52') ? digits : `52${digits}`;
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
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      <div className="fc">
        <label className="pm-label">Tu número de WhatsApp</label>
        <div className="pr">
          <div className="pp">+52</div>
          <input
            className="pi"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="55 1234 5678"
            type="tel"
          />
        </div>
        <p style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>
          💬 Tu boleto QR llegará aquí cuando pagues
        </p>
      </div>

      <div className="fc">
        <label className="pm-label" style={{ marginBottom: 14, display: 'block' }}>Tarjeta</label>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {/* Términos y condiciones */}
      <div className="fc" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}
        onClick={() => setTermsAccepted(v => !v)}>
        {/* Checkbox custom */}
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: termsAccepted ? '2px solid #1a1a1a' : '2px solid #ddd',
          background: termsAccepted ? '#1a1a1a' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>
          {termsAccepted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#EDEDED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
          He leído y acepto los{' '}
          <span
            style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,.25)', cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); setShowTerms(true); }}>
            Términos y Condiciones
          </span>
          {' '}de ParkMX
        </div>
      </div>

      {error && <div className="pm-error">{error}</div>}

      <div className="ctab">
        {/* Aviso si no aceptó */}
        {!termsAccepted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '9px 12px', background: 'rgba(0,0,0,.04)', borderRadius: 8 }}>
            <span style={{ fontSize: 14 }}>☝️</span>
            <span style={{ fontSize: 11, color: '#888' }}>Acepta los términos para continuar</span>
          </div>
        )}
        <button
          className="pm-btn-primary"
          onClick={handlePay}
          disabled={!stripe || !elements || paying || !termsAccepted}
          style={{ opacity: !termsAccepted ? 0.4 : 1 }}
        >
          {paying ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Procesando...
            </span>
          ) : (
            `🔒 Pagar $${Math.round(data.amount)} MXN`
          )}
        </button>
        <div className="sn">Pago seguro · Stripe SSL 256-bit</div>
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
    <div style={{ minHeight: '100vh', background: '#EDEDED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #ddd', borderTop: '2px solid #1a1a1a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (fetchError) return (
    <div style={{ minHeight: '100vh', background: '#EDEDED', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter,sans-serif', gap: 16 }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', textAlign: 'center' }}>No se pudo iniciar el pago</h2>
      <p style={{ fontSize: 13, color: '#999', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>{fetchError}</p>
      <button onClick={() => router.back()} style={{ marginTop: 8, padding: '12px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
        ← Volver
      </button>
    </div>
  );

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cw  { min-height: 100vh; background: #EDEDED; }
        /* Mobile: single column */
        .cb  { padding: 24px 24px 120px; max-width: 480px; margin: 0 auto; }
        @media(min-width:640px){ .cb { padding: 36px 40px 120px; } }
        /* Desktop: 2-column layout */
        @media(min-width:1024px){
          .cb {
            max-width: none;
            padding: 40px 56px 80px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            align-items: start;
          }
          .co-left  { position: sticky; top: 80px; }
          .co-right { /* form column */ }
          /* Pay button: static on desktop, not fixed */
          .ctab {
            position: static !important;
            background: transparent !important;
            border-top: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin-top: 16px;
            left: auto !important; right: auto !important;
            transform: none !important;
            border-radius: 0 !important;
          }
        }
        .sc  { background: #fff; border-radius: 16px; overflow: hidden; margin-bottom: 14px; }
        .sh  { background: #1a1a1a; padding: 14px 18px; display: flex; align-items: center; gap: 10px; }
        .sb  { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
        .sr  { display: flex; justify-content: space-between; font-size: 13px; }
        .sr span:first-child { color: #999; }
        .sr span:last-child  { color: #1a1a1a; font-weight: 500; }
        .sr.tot { padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.07); font-size: 15px; }
        .fc  { background: #fff; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
        .ctab { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(237,237,237,0.95); backdrop-filter: blur(16px); border-top: 1px solid rgba(0,0,0,0.07); padding: 16px 24px calc(16px + env(safe-area-inset-bottom)); }
        @media(min-width:640px){ .ctab { max-width: 480px; margin: 0 auto; left: 50%; right: auto; transform: translateX(-50%); border-radius: 16px 16px 0 0; } }
        .sn  { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #bbb; margin-top: 10px; }
        .pr  { display: flex; gap: 8px; }
        .pp  { padding: 12px 14px; background: #f5f5f5; border-radius: 8px; font-size: 14px; font-weight: 600; color: #1a1a1a; flex-shrink: 0; }
        .pi  { flex: 1; padding: 12px 14px; background: #f5f5f5; border: none; border-radius: 8px; font-size: 14px; color: #1a1a1a; font-family: 'Inter', sans-serif; }
        .pi::placeholder { color: #bbb; }
        .pi:focus { outline: 1.5px solid #1a1a1a; }
        /* Desktop summary extras */
        .co-left-extras { display: none; }
        @media(min-width:1024px){
          .co-left-extras { display: block; margin-top: 14px; }
          .co-left-perk { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(0,0,0,.05); font-size:13px; color:#555; }
          .co-left-perk:last-child { border-bottom:none; }
          .co-left-dot { width:18px; height:18px; background:#1a1a1a; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        }
      `}</style>

      <div className="cw">
        <header className="pm-header" style={{ paddingBottom: 20 }}>
          <button className="pm-back" onClick={() => router.back()}>← Atrás</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Pago</span>
          <span style={{ width: 60 }} />
        </header>

        <div className="cb">

          {/* LEFT: resumen del pedido (sticky en desktop) */}
          <div className="co-left">
            <div className="sc">
              <div className="sh">
                <span style={{ fontSize: 14 }}>🎫</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.2px' }}>{data!.eventName}</span>
              </div>
              <div className="sb">
                <div className="sr"><span>1 lugar de estacionamiento</span><span>${Math.round(data!.amount)} MXN</span></div>
                <div className="sr tot"><span style={{ fontWeight: 700 }}>Total</span><span style={{ fontWeight: 700 }}>${Math.round(data!.amount)} MXN</span></div>
              </div>
            </div>

            {/* Beneficios — solo visibles en desktop */}
            <div className="co-left-extras">
              {['Lugar garantizado antes de llegar','Código QR único por WhatsApp','Sin cobros adicionales en puerta','Cancelación hasta 2 hrs antes'].map(item => (
                <div key={item} className="co-left-perk">
                  <div className="co-left-dot">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="#EDEDED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: formulario de pago */}
          <div className="co-right">
            {!STRIPE_KEY ? (
              <div style={{ background:'#fff', borderRadius:14, padding:20, textAlign:'center', color:'#e53e3e', fontSize:13 }}>
                ⚠️ Pago no disponible en este momento. Contacta a soporte@parkmx.mx
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
    </>
  );
}
