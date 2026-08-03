'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';

type Step = 1 | 2 | 3;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';

  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (step === 2) setTimeout(() => inputRefs.current[0]?.focus(), 200);
  }, [step]);

  const cleanPhone = () => `521${phone.replace(/\D/g, '').slice(-10)}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Por favor ingresa un número de teléfono válido de 10 dígitos.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone() }),
      });
      if (!res.ok) throw new Error();
      setOtp(Array(6).fill(''));
      setStep(2);
    } catch {
      setError('No se pudo enviar el código. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return;

    // Autocompletado del teléfono (SMS) o pegado: puede llegar el código completo
    // de golpe en una sola cajita en vez de un dígito a la vez.
    if (digits.length > 1) {
      const next = [...otp];
      for (let i = 0; i < digits.length && index + i < 6; i++) next[index + i] = digits[i];
      setOtp(next);
      const focusIndex = Math.min(index + digits.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = digits;
    setOtp(next);
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    handleOtpChange(index, pasted);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setError('Ingresa el código de 6 dígitos completo enviado por SMS.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone(), otp: fullCode }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem('token', data.access_token || data.token);
      if (data.isNewUser) {
        setIsNewUser(true);
        setStep(3);
      } else {
        router.push(nextUrl);
      }
    } catch {
      setError('Código incorrecto o expirado.');
    } finally { setLoading(false); }
  };

  const handleCompleteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name: name.trim() }),
      });
    } catch {}
    router.push(nextUrl);
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar showExplore={false} />
      <div className="flex-1 py-16 px-6 flex flex-col justify-center items-center">
        <div className="w-full max-w-md space-y-8">

          {/* Indicador de progreso índigo */}
          <div className="flex items-center justify-between px-6">
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} className="contents">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    step >= s ? 'bg-[#383497] text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider font-bold transition-all ${
                    step >= s ? 'text-[#383497]' : 'text-slate-400'
                  }`}>
                    {s === 1 ? 'Teléfono' : s === 2 ? 'Código' : 'Nombre'}
                  </span>
                </div>
                {i < 2 && (
                  <div className="flex-1 h-[2px] bg-slate-200 mx-3 relative">
                    <div className="absolute top-0 left-0 h-full bg-[#383497] transition-all duration-300"
                      style={{ width: step > s ? '100%' : '0%' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">

            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl md:text-2xl font-extrabold text-brand-dark tracking-tight">Inicia sesión</h2>
                  <p className="text-slate-500 text-xs">Te enviaremos un código de seguridad de un solo uso por SMS.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase">Número celular</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 font-mono text-sm text-slate-400 font-bold border-r border-slate-200 pr-3.5 select-none">+52</div>
                    <input
                      type="tel" required maxLength={10} placeholder="55 1234 5678"
                      value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-16 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] font-mono tracking-widest transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <MessageSquare className="w-4 h-4 text-indigo-200" />
                  <span>{loading ? 'Enviando...' : 'Enviar código por SMS'}</span>
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl md:text-2xl font-extrabold text-brand-dark tracking-tight">Verifica el código</h2>
                  <p className="text-slate-500 text-xs">
                    Ingresa el código enviado al <span className="font-bold text-[#383497] font-mono">+52 {phone}</span>
                  </p>
                </div>

                <div className="flex justify-between gap-2 max-w-[320px] mx-auto py-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { inputRefs.current[idx] = el; }}
                      type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                      required maxLength={idx === 0 ? 6 : 1} value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onPaste={e => handleOtpPaste(idx, e)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      className="w-11 h-14 bg-slate-50 border-2 border-slate-200 text-center font-mono text-xl font-bold text-slate-800 rounded-xl focus:outline-none focus:border-[#383497] focus:ring-2 focus:ring-[#383497]/15 transition-all"
                    />
                  ))}
                </div>

                {error && <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>}

                <div className="space-y-3">
                  <button type="submit" disabled={loading}
                    className="w-full bg-[#383497] hover:bg-[#2b278c] disabled:bg-slate-200 text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <span>{loading ? 'Verificando...' : 'Verificar código'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => { setStep(1); setOtp(Array(6).fill('')); setError(''); }}
                    className="w-full text-slate-400 hover:text-[#383497] text-xs font-mono uppercase tracking-wider text-center bg-transparent border-none cursor-pointer py-1">
                    ← Cambiar teléfono
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleCompleteLogin} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl md:text-2xl font-extrabold text-brand-dark tracking-tight">¡Bienvenido!</h2>
                  <p className="text-slate-500 text-xs">Completa tu registro ingresando tu nombre para poder emitir tus boletos.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase">Nombre completo</label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#383497]/15 focus:border-[#383497] transition-all"
                    placeholder="Ej. Sofía Valenzuela Méndez" autoFocus
                  />
                </div>

                {error && <p className="bg-rose-50 border border-rose-100 text-rose-600 text-xs p-3.5 rounded-xl text-center">{error}</p>}

                <button type="submit"
                  className="w-full bg-[#383497] hover:bg-[#2b278c] text-white py-4 px-6 rounded-2xl font-sans text-sm font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <span>Continuar</span>
                  <Check className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="border-t border-slate-100 pt-5 text-center text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
              <span>Al continuar, aceptas nuestros </span>
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#383497] hover:underline font-bold">Términos de Servicio</a>
              <span> y nuestro </span>
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-[#383497] hover:underline font-bold">Aviso de Privacidad</a>
              <span>. Tus datos de acceso están protegidos por SSL de 256 bits.</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-1.5 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Acceso autenticado y verificado por SMS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
