'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

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

  const steps: Record<Step,{icon:string;title:string;sub:string}> = {
    phone: { icon:'📱', title:'Ingresa tu WhatsApp', sub:'Te enviamos un código para confirmar tu número.' },
    otp:   { icon:'🔐', title:'Código de verificación', sub:`Enviamos un código de 6 dígitos a +52 ${phone}` },
    name:  { icon:'👋', title:'¡Bienvenido!', sub:'¿Cómo te llamas? Aparecerá en tu boleto.' },
  };
  const cur = steps[step];

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .lw { min-height:100vh; background:#EDEDED; display:flex; flex-direction:column; }
        .lb { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; }
        .lc { width:100%; max-width:400px; background:#fff; border-radius:20px; padding:32px 28px; animation:fadeUp 0.4s ease both; }
        @media(min-width:1024px){
          .lw { background:#EDEDED radial-gradient(circle at 20% 50%, rgba(0,0,0,.03) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(0,0,0,.03) 0%, transparent 60%); }
          .lb { padding:48px; }
          .lc { max-width:480px; padding:48px 44px; border-radius:24px; box-shadow:0 4px 40px rgba(0,0,0,.08); }
        }
        .li { font-size:40px; margin-bottom:20px; display:block; }
        .lt { font-size:22px; font-weight:700; letter-spacing:-0.4px; color:#1a1a1a; margin-bottom:6px; }
        .ls { font-size:13px; font-weight:300; color:#999; line-height:1.55; margin-bottom:28px; }
        .pr { display:flex; gap:8px; }
        .pp { padding:13px 14px; background:#f5f5f5; border:1px solid rgba(0,0,0,0.1); border-radius:10px; font-size:14px; font-weight:600; color:#1a1a1a; flex-shrink:0; }
        .pi { flex:1; padding:13px 16px; background:#fff; border:1px solid rgba(0,0,0,0.1); border-radius:10px; font-size:14px; color:#1a1a1a; font-family:Inter,sans-serif; transition:border-color 0.2s; }
        .pi:focus { outline:none; border-color:#1a1a1a; }
        .pi::placeholder { color:#ccc; }
        .oi { width:100%; padding:18px; border:1px solid rgba(0,0,0,0.1); border-radius:10px; font-size:28px; font-weight:700; color:#1a1a1a; text-align:center; letter-spacing:10px; font-family:Inter,sans-serif; }
        .oi:focus { outline:none; border-color:#1a1a1a; }
        .bg { display:flex; flex-direction:column; gap:10px; margin-top:20px; }
        .lg { font-size:11px; color:#bbb; text-align:center; margin-top:20px; line-height:1.6; }
        .lg a { color:#999; text-decoration:underline; }
        .sd { display:flex; justify-content:center; gap:6px; margin-bottom:28px; }
        .sdot { width:5px; height:5px; border-radius:3px; background:rgba(0,0,0,0.1); transition:all 0.25s; }
        .sdot.on { background:#1a1a1a; width:14px; }
      `}</style>
      <div className="lw">
        <header className="pm-header">
          <Link href="/" className="pm-logo" style={{ textDecoration: 'none' }}>Estaciona<span>t</span></Link>
        </header>
        <div className="lb">
          <div className="lc">
            <div className="sd">
              {(['phone','otp','name'] as Step[]).map(s => (
                <div key={s} className={`sdot${s===step?' on':''}`} />
              ))}
            </div>
            <span className="li">{cur.icon}</span>
            <h1 className="lt">{cur.title}</h1>
            <p className="ls">{cur.sub}</p>
            {step === 'phone' && (
              <>
                <div className="pr">
                  <div className="pp">+52</div>
                  <input className="pi" value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendOtp()} placeholder="55 1234 5678" type="tel" maxLength={12} autoFocus />
                </div>
                {error && <div className="pm-error" style={{marginTop:12}}>{error}</div>}
                <div className="bg">
                  <button className="pm-btn-primary" onClick={sendOtp} disabled={loading}>{loading?'Enviando...':'Enviar código por WhatsApp 💬'}</button>
                </div>
              </>
            )}
            {step === 'otp' && (
              <>
                <input className="oi" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e=>e.key==='Enter'&&verifyOtp()} placeholder="——————" type="tel" maxLength={6} autoFocus />
                {error && <div className="pm-error" style={{marginTop:12}}>{error}</div>}
                <div className="bg">
                  <button className="pm-btn-primary" onClick={verifyOtp} disabled={loading||otp.length!==6}>{loading?'Verificando...':'Confirmar código'}</button>
                  <button className="pm-btn-secondary" onClick={()=>{setStep('phone');setOtp('');setError('');}}>Cambiar número</button>
                </div>
              </>
            )}
            {step === 'name' && (
              <>
                <input className="pi" style={{width:'100%'}} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveName()} placeholder="Tu nombre" autoFocus />
                <div className="bg">
                  <button className="pm-btn-primary" onClick={saveName}>{name.trim()?'Continuar →':'Omitir →'}</button>
                </div>
              </>
            )}
            <p className="lg">Al continuar aceptas nuestros <a href="/terminos">Términos</a> y <a href="/privacidad">Privacidad</a>.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
