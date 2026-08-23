'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Car, Lock, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#383497', colorBackground: '#ffffff', colorText: '#1e293b',
    colorDanger: '#e11d48', fontFamily: '"Plus Jakarta Sans", sans-serif',
    borderRadius: '12px', spacingUnit: '4px',
  },
};

type VehicleCategory = 'auto' | 'suv_camioneta' | 'pickup' | 'moto';
const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  auto: 'Auto', suv_camioneta: 'SUV / Camioneta', pickup: 'Pick Up', moto: 'Moto',
};

async function apiFetch(path: string, token?: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Error');
  return data;
}

interface CurrentVehicle {
  eligible: boolean; reason: string | null;
  vehicleType: VehicleCategory | null; plate: string | null;
  make: string | null; model: string | null; version: string | null;
  year: number | null; color: string | null;
}

interface Quote {
  fromVehicleType: VehicleCategory; toVehicleType: VehicleCategory;
  amountPaid: number; newPrice: number; diff: number; requiresPayment: boolean;
}

const selectClass =
  'w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-mono text-slate-400 uppercase mb-1';

// ─── Formulario de pago del extra (requiere contexto de Elements) ─────────────
function ExtraPaymentForm({ clientSecret, diff, reservationId }: { clientSecret: string; diff: number; reservationId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true); setError('');
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/mis-boletos/${reservationId}/cambiar-vehiculo?done=1` },
    });
    if (confirmError) { setError(confirmError.message || 'Error al procesar el pago'); setPaying(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {error && <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>}
      <button
        type="button" onClick={handlePay} disabled={!stripe || !elements || paying}
        className="w-full bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {paying ? 'Procesando...' : <><Lock className="w-4 h-4" /><span>Pagar ${Math.round(diff)} MXN extra</span></>}
      </button>
    </div>
  );
}

export default function CambiarVehiculoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentVehicle | null>(null);
  const [error, setError] = useState('');

  const [marcas, setMarcas] = useState<string[]>([]);
  const [modelos, setModelos] = useState<{ nombre: string; tieneVersion: boolean }[]>([]);
  const [versiones, setVersiones] = useState<string[]>([]);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [version, setVersion] = useState('');
  const [plate, setPlate] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [done, setDone] = useState(false);

  const tieneVersion = !!modelos.find(m => m.nombre === modelo)?.tieneVersion;

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.replace(`/login?next=/mis-boletos/${id}/cambiar-vehiculo`); return; }
    setToken(t);
  }, [id, router]);

  // Retorno de Stripe tras 3DS/confirmación — sincronizar el pago del extra
  useEffect(() => {
    if (!token) return;
    const pi = searchParams.get('payment_intent');
    if (pi && searchParams.get('done')) {
      apiFetch('/api/v1/payments/sync', token, { method: 'POST', body: JSON.stringify({ paymentIntentId: pi }) })
        .then(() => setDone(true))
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [token, searchParams]);

  useEffect(() => {
    if (!token || done || searchParams.get('done')) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/v1/payments/vehicle-change/current?reservationId=${id}`, token),
      apiFetch('/api/v1/vehiculos/marcas'),
    ])
      .then(([c, m]) => {
        setCurrent(c);
        setMarcas(Array.isArray(m.marcas) ? m.marcas : []);
        if (c.make) setMarca(c.make);
        if (c.plate) setPlate(c.plate);
        if (c.year) setYear(String(c.year));
        if (c.color) setColor(c.color);
      })
      .catch(e => setError(e.message || 'No se pudo cargar el boleto'))
      .finally(() => setLoading(false));
  }, [token, id, done]);

  useEffect(() => {
    if (!marca) { setModelos([]); return; }
    apiFetch(`/api/v1/vehiculos/modelos?marca=${encodeURIComponent(marca)}`)
      .then(d => setModelos(Array.isArray(d.modelos) ? d.modelos : []))
      .catch(() => setModelos([]));
  }, [marca]);

  useEffect(() => {
    if (!modelo) { setVersiones([]); setVersion(''); return; }
    const info = modelos.find(m => m.nombre === modelo);
    if (!info?.tieneVersion) { setVersiones([]); setVersion(''); return; }
    apiFetch(`/api/v1/vehiculos/versiones?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`)
      .then(d => setVersiones(Array.isArray(d.versiones) ? d.versiones : []))
      .catch(() => setVersiones([]));
  }, [marca, modelo, modelos]);

  const vehiculoOk = !!marca && !!modelo && (!tieneVersion || !!version) && plate.trim().length >= 3;

  const buildDto = () => ({
    reservationId: id,
    plate: plate.trim().toUpperCase(),
    make: marca,
    model: modelo,
    version: version || undefined,
    year: year ? Number(year) : undefined,
    color: color.trim() || undefined,
  });

  const handleQuote = async () => {
    if (!token || !vehiculoOk) return;
    setQuoting(true); setError(''); setQuote(null);
    try {
      const q = await apiFetch('/api/v1/payments/vehicle-change/quote', token, { method: 'POST', body: JSON.stringify(buildDto()) });
      setQuote(q);
    } catch (e: any) { setError(e.message || 'No se pudo calcular el cambio'); }
    finally { setQuoting(false); }
  };

  const handleApplyFree = async () => {
    if (!token) return;
    setApplying(true); setError('');
    try {
      await apiFetch('/api/v1/payments/vehicle-change/apply-free', token, { method: 'POST', body: JSON.stringify(buildDto()) });
      setDone(true);
    } catch (e: any) { setError(e.message || 'No se pudo aplicar el cambio'); }
    finally { setApplying(false); }
  };

  const handlePayExtra = async () => {
    if (!token) return;
    setApplying(true); setError('');
    try {
      const r = await apiFetch('/api/v1/payments/vehicle-change/intent', token, { method: 'POST', body: JSON.stringify(buildDto()) });
      setClientSecret(r.clientSecret);
    } catch (e: any) { setError(e.message || 'No se pudo iniciar el pago'); }
    finally { setApplying(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#04210f] rounded-full animate-spin" />
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        <h2 className="font-bold text-lg text-brand-dark">Vehículo actualizado</h2>
        <p className="text-sm text-slate-500 max-w-xs">Tu boleto ya refleja el nuevo vehículo.</p>
        <button onClick={() => router.push(`/mis-boletos/${id}`)} className="bg-[#04210f] hover:bg-[#12361d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer">
          Volver al boleto
        </button>
      </div>
    </div>
  );

  if (current && !current.eligible) return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="pt-32 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="w-10 h-10 text-slate-400" />
        <h2 className="font-bold text-lg text-brand-dark">No se puede cambiar el vehículo</h2>
        <p className="text-sm text-slate-500 max-w-xs">{current.reason}</p>
        <button onClick={() => router.push(`/mis-boletos/${id}`)} className="bg-[#04210f] hover:bg-[#12361d] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer">← Volver al boleto</button>
      </div>
    </div>
  );

  return (
    <div className="bg-background min-h-screen py-10 px-6 font-sans">
      <Navbar back="back" showExplore={false} />
      <div className="max-w-xl mx-auto space-y-6 pt-24">
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-brand-dark flex items-center gap-2"><Car className="w-5 h-5" /> Cambiar vehículo</h1>
            {current?.vehicleType && (
              <p className="text-xs text-slate-400">
                Vehículo actual: <span className="font-semibold text-slate-600">{current.make} {current.model} · {CATEGORY_LABELS[current.vehicleType]}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Marca</label>
              <select className={selectClass} value={marca} onChange={e => { setMarca(e.target.value); setModelo(''); setQuote(null); }}>
                <option value="">Selecciona</option>
                {marcas.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <select className={selectClass} value={modelo} onChange={e => { setModelo(e.target.value); setQuote(null); }} disabled={!marca || modelos.length === 0}>
                <option value="">{!marca ? 'Elige marca' : 'Selecciona'}</option>
                {modelos.map(m => <option key={m.nombre} value={m.nombre}>{m.nombre}</option>)}
              </select>
            </div>
            {tieneVersion && (
              <div className="col-span-2">
                <label className={labelClass}>Versión</label>
                <select className={selectClass} value={version} onChange={e => { setVersion(e.target.value); setQuote(null); }}>
                  <option value="">Selecciona</option>
                  {versiones.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Placa</label>
              <input className={selectClass} value={plate} onChange={e => { setPlate(e.target.value.toUpperCase()); setQuote(null); }} maxLength={10} placeholder="ABC-123" />
            </div>
            <div>
              <label className={labelClass}>Color (opcional)</label>
              <input className={selectClass} value={color} onChange={e => setColor(e.target.value)} placeholder="Blanco" />
            </div>
          </div>

          {error && <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>}

          {!quote && !clientSecret && (
            <button
              type="button" onClick={handleQuote} disabled={!vehiculoOk || quoting}
              className="w-full bg-[#04210f] hover:bg-[#12361d] disabled:bg-slate-200 text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
            >
              {quoting ? 'Calculando...' : 'Ver cambio'}
            </button>
          )}

          {quote && !clientSecret && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                <div className="flex justify-between text-xs"><span className="text-slate-400">Ya pagado</span><span className="font-mono font-semibold text-slate-700">${Math.round(quote.amountPaid)} MXN</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-400">Precio del nuevo vehículo</span><span className="font-mono font-semibold text-slate-700">${Math.round(quote.newPrice)} MXN</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-brand-dark">{quote.requiresPayment ? 'A pagar extra' : 'Diferencia'}</span>
                  <span className={`font-mono font-black ${quote.requiresPayment ? 'text-[#383497]' : 'text-emerald-600'}`}>
                    {quote.requiresPayment ? `$${Math.round(quote.diff)} MXN` : 'Sin costo'}
                  </span>
                </div>
              </div>

              {quote.requiresPayment ? (
                <button type="button" onClick={handlePayExtra} disabled={applying}
                  className="w-full bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer">
                  {applying ? 'Preparando pago...' : 'Continuar y pagar'}
                </button>
              ) : (
                <button type="button" onClick={handleApplyFree} disabled={applying}
                  className="w-full bg-[#04210f] hover:bg-[#12361d] disabled:bg-slate-200 text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer">
                  {applying ? 'Aplicando...' : 'Confirmar cambio'}
                </button>
              )}
            </div>
          )}

          {clientSecret && STRIPE_KEY && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
              <ExtraPaymentForm clientSecret={clientSecret} diff={quote!.diff} reservationId={id} />
            </Elements>
          )}

          <div className="flex justify-center">
            <div className="bg-[#E6F4F1] text-[#006E66] border border-[#CDEAE5] text-[11px] font-bold uppercase tracking-wider font-sans rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Pago seguro · Stripe SSL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
