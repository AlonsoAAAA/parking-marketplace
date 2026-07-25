import { useState } from 'react';
import { api } from '../lib/api';

interface Props { onLogin: (token: string) => void; }
type Step = 'phone' | 'otp';

export default function Login({ onLogin }: Props) {
  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const sendOtp = async () => {
    if (!phone.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await api.auth.sendOtp(phone.replace(/\D/g, '')) as any;
      if (res?.devOtp) setOtp(res.devOtp.split('').slice(0, 6));
      setStep('otp');
    } catch {
      setStep('otp');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true); setError('');
    try {
      const res = await api.auth.verifyOtp(phone.replace(/\D/g, ''), code);
      onLogin(res.token || res.access_token);
    } catch {
      setError('Código incorrecto o expirado.');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) document.getElementById(`otp-${index - 1}`)?.focus();
    if (e.key === 'Enter') verifyOtp();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-green-dark p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime shadow-md">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" fill="#04210f"/></svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-green-dark">EstacionaT</h1>
          <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-brand-indigo">Panel de Operación</p>
        </div>

        {step === 'phone' ? (
          <div className="flex flex-col gap-5">
            <div className="mb-1 text-center">
              <h2 className="text-xl font-bold text-slate-800">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-500">Ingresa tu celular para recibir tu código de acceso.</p>
            </div>

            {error && <div className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Número de celular</label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300 transition-all focus-within:border-brand-indigo focus-within:ring-2 focus-within:ring-brand-indigo/20">
                <span className="flex items-center border-r border-slate-300 bg-slate-100 px-4 py-3 font-mono text-sm font-bold text-slate-600">+52</span>
                <input
                  type="tel"
                  placeholder="55 1234 5678"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  className="w-full px-4 py-3 font-mono text-base tracking-wider text-slate-800 placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <button
              onClick={sendOtp}
              disabled={loading || !phone.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-indigo px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-brand-indigo-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Enviar código'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="mb-1 text-center">
              <h2 className="text-xl font-bold text-slate-800">Código de verificación</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enviamos un código de 6 dígitos a <span className="font-mono font-bold text-slate-700">+52 {phone}</span>
              </p>
            </div>

            {error && <div className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

            <div>
              <label className="mb-3 block text-center text-xs font-bold uppercase tracking-wider text-slate-700">Código de 6 dígitos</label>
              <div className="mx-auto grid max-w-xs grid-cols-6 gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="h-12 w-10 rounded-lg border border-slate-300 bg-slate-50 text-center font-mono text-xl font-bold text-slate-800 focus:border-brand-indigo focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={verifyOtp}
                disabled={loading || otp.join('').length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-indigo px-6 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-brand-indigo-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Verificar y entrar'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="block w-full py-1 text-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-brand-indigo"
              >
                ← Cambiar número de celular
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3"/></svg>
          <span className="text-xs font-medium">Acceso solo para personal autorizado.</span>
        </div>
      </div>
    </div>
  );
}
