'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Smartphone, ShieldCheck, PartyPopper } from 'lucide-react';
import NeoHeader from '@/components/ui/NeoHeader';
import { NeoButton, NeoInput } from '@/components/ui/neo';

type Step = 'phone' | 'otp' | 'name';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cleanPhone = () => `521${phone.replace(/\D/g, '').slice(-10)}`;

  const sendOtp = async () => {
    if (phone.replace(/\D/g,'').length < 10) { setError('Ingresa 10 dígitos'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/auth/send-otp`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ phone: cleanPhone() }),
      });
      if (!res.ok) throw new Error();
      setStep('otp');
    } catch { setError('No se pudo enviar el código.'); } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { setError('El código debe ser de 6 dígitos'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/auth/verify-otp`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ phone: cleanPhone(), otp }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem('token', data.access_token || data.token);
      data.isNewUser ? setStep('name') : router.push(nextUrl);
    } catch { setError('Código incorrecto o expirado.'); } finally { setLoading(false); }
  };

  const saveName = async () => {
    if (name.trim()) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/users/me`, {
          method:'PATCH',
          headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}`},
          body: JSON.stringify({ name: name.trim() }),
        });
      } catch {}
    }
    router.push(nextUrl);
  };

  const steps: Record<Step,{Icon:typeof Smartphone;title:string;sub:string}> = {
    phone: { Icon: Smartphone,  title:'Ingresa tu WhatsApp',      sub:'Te enviamos un código para confirmar tu número.' },
    otp:   { Icon: ShieldCheck, title:'Código de verificación',   sub:`Enviamos un código de 6 dígitos a +52 ${phone}` },
    name:  { Icon: PartyPopper, title:'¡Bienvenido!',             sub:'¿Cómo te llamas? Aparecerá en tu boleto.' },
  };
  const cur = steps[step];

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <NeoHeader showTickets={false} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 z-0" />

        <div className="relative z-10 w-full max-w-md bg-white border-[3px] border-on-surface rounded-xl neo-shadow-lg p-7 md:p-10 [animation:fadeUp_.4s_ease_both]">
          {/* Indicador de pasos */}
          <div className="flex justify-center gap-2 mb-7">
            {(['phone','otp','name'] as Step[]).map(s => (
              <div key={s} className={`h-2 rounded-full border-2 border-on-surface transition-all duration-300 ${s===step ? 'w-8 bg-primary-container' : 'w-2 bg-surface-container-high'}`} />
            ))}
          </div>

          <div className="w-12 h-12 rounded-lg bg-primary-container border-2 border-on-surface flex items-center justify-center neo-brutal-shadow-sm mb-5">
            <cur.Icon className="w-6 h-6 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="font-extrabold text-xl md:text-2xl uppercase tracking-tight text-on-surface mb-1.5">{cur.title}</h1>
          <p className="text-[13px] font-medium text-on-surface-variant leading-relaxed mb-7">{cur.sub}</p>

          {step === 'phone' && (
            <>
              <div className="flex gap-2.5">
                <div className="px-4 py-3.5 bg-surface-container-high border-[3px] border-on-surface rounded-xl font-mono font-bold text-sm text-on-surface flex-shrink-0 flex items-center">+52</div>
                <NeoInput value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendOtp()} placeholder="55 1234 5678" type="tel" maxLength={12} autoFocus className="font-mono" />
              </div>
              {error && <div className="mt-3 bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}
              <div className="flex flex-col gap-2.5 mt-5">
                <NeoButton onClick={sendOtp} disabled={loading}>{loading?'Enviando...':'Enviar código por WhatsApp 💬'}</NeoButton>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <input
                value={otp}
                onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                onKeyDown={e=>e.key==='Enter'&&verifyOtp()}
                placeholder="——————" type="tel" maxLength={6} autoFocus
                className="w-full bg-white border-[3px] border-on-surface rounded-xl px-4 py-4 font-mono font-bold text-2xl md:text-3xl text-center tracking-[10px] text-on-surface placeholder:text-on-surface/25 focus:outline-none focus:neo-brutal-shadow transition-shadow"
              />
              {error && <div className="mt-3 bg-error-container border-2 border-error rounded-lg px-3 py-2 text-error text-xs font-bold">{error}</div>}
              <div className="flex flex-col gap-2.5 mt-5">
                <NeoButton onClick={verifyOtp} disabled={loading||otp.length!==6}>{loading?'Verificando...':'Confirmar código'}</NeoButton>
                <NeoButton variant="secondary" onClick={()=>{setStep('phone');setOtp('');setError('');}}>Cambiar número</NeoButton>
              </div>
            </>
          )}

          {step === 'name' && (
            <>
              <NeoInput value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveName()} placeholder="Tu nombre" autoFocus />
              <div className="flex flex-col gap-2.5 mt-5">
                <NeoButton onClick={saveName}>{name.trim()?'Continuar →':'Omitir →'}</NeoButton>
              </div>
            </>
          )}

          <p className="text-[11px] text-on-surface-variant/70 text-center mt-6 leading-relaxed font-medium">
            Al continuar aceptas nuestros <Link href="/terminos" className="underline">Términos</Link> y <Link href="/privacidad" className="underline">Privacidad</Link>.
          </p>
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
