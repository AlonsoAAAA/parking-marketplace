'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SHARED_CSS } from '@/lib/design';

interface CheckoutData { clientSecret: string; amount: number; eventName: string; }

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.reservationId as string;
  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/create-intent`, {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body: JSON.stringify({ reservationId }),
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : d.message);
        return d;
      })
      .then(d => setData(d))
      .catch(e => setError(e.message || 'No se pudo iniciar el pago. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, [reservationId]);

  const handlePay = async () => {
    if (!data) return;
    setPaying(true); setError('');
    try {
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) throw new Error('No se pudo cargar Stripe');
      const { error: se } = await stripe.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: { return_url: `${window.location.origin}/confirmacion/${reservationId}` },
      });
      if (se) setError(se.message || 'Error al procesar el pago');
    } catch (e: any) { setError(e.message); } finally { setPaying(false); }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#EDEDED',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:24,height:24,border:'2px solid #ddd',borderTop:'2px solid #1a1a1a',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data && error) return (
    <div style={{minHeight:'100vh',background:'#EDEDED',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'Inter,sans-serif',gap:16}}>
      <div style={{fontSize:36}}>⚠️</div>
      <h2 style={{fontSize:18,fontWeight:700,color:'#1a1a1a',textAlign:'center'}}>No se pudo iniciar el pago</h2>
      <p style={{fontSize:13,color:'#999',textAlign:'center',maxWidth:320,lineHeight:1.6}}>{error}</p>
      <button onClick={()=>router.back()} style={{marginTop:8,padding:'12px 24px',background:'#1a1a1a',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
        ← Volver
      </button>
    </div>
  );

  return (
    <>
      <style>{SHARED_CSS + `
        .cw { min-height:100vh; background:#EDEDED; }
        .cb { padding:24px 24px 100px; max-width:480px; margin:0 auto; }
        @media(min-width:640px){ .cb { padding:36px 40px 100px; } }
        .sc { background:#fff; border-radius:16px; overflow:hidden; margin-bottom:14px; }
        .sh { background:#1a1a1a; padding:14px 18px; display:flex; align-items:center; gap:10px; }
        .sb { padding:16px 18px; display:flex; flex-direction:column; gap:8px; }
        .sr { display:flex; justify-content:space-between; font-size:13px; }
        .sr span:first-child { color:#999; }
        .sr span:last-child { color:#1a1a1a; font-weight:500; }
        .sr.tot { padding-top:10px; border-top:1px solid rgba(0,0,0,0.07); font-size:15px; }
        .fc { background:#fff; border-radius:14px; padding:18px; margin-bottom:14px; }
        .ci { width:100%; padding:12px 14px; background:#f5f5f5; border:none; border-radius:8px; font-size:14px; color:#1a1a1a; font-family:'Inter',sans-serif; margin-bottom:8px; }
        .ci::placeholder { color:#bbb; }
        .ci:focus { outline:1.5px solid #1a1a1a; }
        .cr2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .cib { display:flex; gap:6px; }
        .cibg { padding:3px 8px; background:#f5f5f5; border-radius:4px; font-size:10px; font-weight:700; color:#666; border:1px solid #e5e5e5; }
        .ctab { position:fixed; bottom:0; left:0; right:0; background:rgba(237,237,237,0.95); backdrop-filter:blur(16px); border-top:1px solid rgba(0,0,0,0.07); padding:16px 24px calc(16px + env(safe-area-inset-bottom)); }
        @media(min-width:640px){ .ctab { max-width:480px; margin:0 auto; left:50%; right:auto; transform:translateX(-50%); border-radius:16px 16px 0 0; } }
        .sn { display:flex; align-items:center; justify-content:center; gap:6px; font-size:11px; color:#bbb; margin-top:10px; }
        .pr { display:flex; gap:8px; }
        .pp { padding:12px 14px; background:#f5f5f5; border-radius:8px; font-size:14px; font-weight:600; color:#1a1a1a; flex-shrink:0; }
        .pi { flex:1; padding:12px 14px; background:#f5f5f5; border:none; border-radius:8px; font-size:14px; color:#1a1a1a; font-family:'Inter',sans-serif; }
        .pi::placeholder { color:#bbb; }
        .pi:focus { outline:1.5px solid #1a1a1a; }
      `}</style>
      <div className="cw">
        <header className="pm-header" style={{paddingBottom:20}}>
          <button className="pm-back" onClick={()=>router.back()}>← Atrás</button>
          <span style={{fontSize:12,fontWeight:600,color:'#1a1a1a'}}>Pago</span>
          <span style={{width:60}}/>
        </header>
        <div className="cb">
          <div className="sc">
            <div className="sh">
              <span style={{fontSize:14}}>🎫</span>
              <span style={{fontSize:13,fontWeight:600,color:'#fff',letterSpacing:'-0.2px'}}>{data?.eventName}</span>
            </div>
            <div className="sb">
              <div className="sr"><span>1 lugar de estacionamiento</span><span>${data?.amount?.toFixed(2)} MXN</span></div>
              <div className="sr tot"><span style={{fontWeight:700}}>Total</span><span style={{fontWeight:700}}>${data?.amount?.toFixed(2)} MXN</span></div>
            </div>
          </div>
          <div className="fc">
            <label className="pm-label">Tu número de WhatsApp</label>
            <div className="pr">
              <div className="pp">+52</div>
              <input className="pi" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="55 1234 5678" type="tel"/>
            </div>
            <p style={{fontSize:11,color:'#bbb',marginTop:8}}>💬 Tu boleto QR llegará aquí cuando pagues</p>
          </div>
          <div className="fc">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <label className="pm-label" style={{marginBottom:0}}>Tarjeta</label>
              <div className="cib">{['VISA','MC','AMEX'].map(b=><div key={b} className="cibg">{b}</div>)}</div>
            </div>
            <input className="ci" placeholder="Número de tarjeta" type="tel"/>
            <div className="cr2">
              <input className="ci" style={{marginBottom:0}} placeholder="MM / AA"/>
              <input className="ci" style={{marginBottom:0}} placeholder="CVC"/>
            </div>
          </div>
          {error && <div className="pm-error">{error}</div>}
        </div>
        <div className="ctab">
          <button className="pm-btn-primary" onClick={handlePay} disabled={paying}>
            🔒 {paying ? 'Procesando...' : `Pagar $${data?.amount?.toFixed(2)} MXN`}
          </button>
          <div className="sn">Pago seguro · Stripe SSL 256-bit</div>
        </div>
      </div>
    </>
  );
}
