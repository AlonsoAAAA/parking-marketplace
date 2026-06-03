import { useState } from 'react';
import { api } from '../lib/api';

interface Props { onLogin: (token: string) => void; }
type Step = 'phone' | 'otp';

export default function Login({ onLogin }: Props) {
  const [step, setStep]     = useState<Step>('phone');
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const sendOtp = async () => {
    if (!phone.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await api.auth.sendOtp(phone.replace(/\D/g, '')) as any;
      if (res?.devOtp) setOtp(res.devOtp);
      setStep('otp');
    } catch {
      setStep('otp');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true); setError('');
    try {
      const res = await api.auth.verifyOtp(phone.replace(/\D/g, ''), otp);
      onLogin(res.token || res.access_token);
    } catch {
      setError('Código incorrecto o expirado.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .lr { min-height:100vh; background:#EDEDED; display:flex; align-items:center; justify-content:center; padding:24px; font-family:'Inter',-apple-system,sans-serif; }
        .lc { background:#fff; border-radius:20px; padding:40px 36px; width:100%; max-width:380px; }
        @media(max-width:440px){ .lc { padding:32px 24px; } }
        .ll { font-size:11px; font-weight:600; letter-spacing:4px; text-transform:uppercase; color:#1a1a1a; margin-bottom:32px; }
        .ll span { color:#bbb; }
        .lt { font-size:26px; font-weight:700; letter-spacing:-0.5px; margin-bottom:6px; }
        .ls { font-size:13px; color:#999; margin-bottom:28px; font-weight:400; line-height:1.5; }
        .llbl { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#999; display:block; margin-bottom:8px; }
        .li { width:100%; padding:13px 16px; background:#F7F7F7; border:1.5px solid transparent; border-radius:10px; font-size:15px; font-family:'Inter',sans-serif; color:#1a1a1a; transition:border-color 0.2s; margin-bottom:16px; }
        .li:focus { border-color:#1a1a1a; background:#fff; outline:none; }
        .li::placeholder { color:#ccc; }
        .lb-btn { width:100%; padding:14px; background:#1a1a1a; color:#EDEDED; border:none; border-radius:10px; font-size:13px; font-weight:600; font-family:'Inter',sans-serif; cursor:pointer; transition:background 0.2s; }
        .lb-btn:hover:not(:disabled) { background:#333; }
        .lb-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .le { background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px 16px; font-size:12px; color:#991b1b; margin-bottom:16px; }
        .lb-back { background:none; border:none; font-size:12px; color:#bbb; cursor:pointer; font-family:'Inter',sans-serif; margin-top:16px; width:100%; text-align:center; }
        .lb-back:hover { color:#1a1a1a; }
        .lhint { font-size:11px; color:#bbb; text-align:center; margin-top:14px; line-height:1.6; }
        .lhint strong { color:#999; }
        .ldemo { background:#f5f5f5; border-radius:10px; padding:14px 16px; margin-top:20px; font-size:11px; color:#999; line-height:1.8; }
        .ldemo strong { color:#1a1a1a; font-family:monospace; }
      `}</style>
      <div className="lr">
        <div className="lc">
          <div className="ll">Park<span>MX</span></div>
          {step === 'phone' ? (
            <>
              <h1 className="lt">Acceso Admin</h1>
              <p className="ls">Ingresa tu número para recibir un código de verificación.</p>
              {error && <div className="le">{error}</div>}
              <label className="llbl">Teléfono</label>
              <input className="li" type="tel" placeholder="+52 55 0000 0000" value={phone}
                onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendOtp()} autoFocus />
              <button className="lb-btn" onClick={sendOtp} disabled={loading || !phone.trim()}>
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
              <div className="ldemo">
                <div style={{marginBottom:6}}>Credenciales de prueba</div>
                <div>Admin → <strong>5511111111</strong></div>
                <div>Operador → <strong>5512345678</strong></div>
                <div style={{marginTop:4}}>OTP: <strong>111222</strong> (siempre)</div>
              </div>
            </>
          ) : (
            <>
              <h1 className="lt">Código OTP</h1>
              <p className="ls">Enviamos un código a <strong style={{color:'#1a1a1a'}}>{phone}</strong></p>
              {error && <div className="le">{error}</div>}
              <label className="llbl">Código de 6 dígitos</label>
              <input className="li" type="number" placeholder="——————" value={otp}
                onChange={e => setOtp(e.target.value.slice(0, 6))} onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                autoFocus style={{letterSpacing:'4px', fontSize:22, textAlign:'center'}} />
              <button className="lb-btn" onClick={verifyOtp} disabled={loading || otp.length < 6}>
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              <p className="lhint">Demo: el código es siempre <strong>111222</strong></p>
              <button className="lb-back" onClick={() => { setStep('phone'); setOtp(''); setError(''); }}>← Cambiar número</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
