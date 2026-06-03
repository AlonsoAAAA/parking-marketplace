'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

interface TicketData {
  reservation: { id: string; status: string; createdAt: string; };
  event: { name: string; venueName: string; startsAt: string; parkingName: string; parkingAddress: string; };
  payment: { amount: number; };
  qrToken: string;
  userPhone?: string;
}

const MOCK: TicketData = {
  reservation: { id: 'abc123', status: 'paid', createdAt: new Date().toISOString() },
  event: { name: 'Natanael Cano', venueName: 'Foro Sol', startsAt: '2025-06-21T20:00:00', parkingName: 'Foro Sol Norte', parkingAddress: 'Viaducto Río de la Piedad 187' },
  payment: { amount: 180 },
  qrToken: 'eyJhbGciOiJIUzI1NiJ9.mock',
  userPhone: '+52 55 1234 5678',
};

export default function ConfirmacionPage() {
  const params = useParams();
  const reservationId = params.reservationId as string;
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchTicket = (attempt = 1) => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reservations/${reservationId}/ticket`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const data = d.data;
        if (data?.qrToken) {
          setTicket(data);
          setLoading(false);
        } else if (attempt < 8) {
          // Webhook aún procesando — reintenta con backoff
          setTimeout(() => fetchTicket(attempt + 1), attempt * 1500);
        } else {
          if (!data?.qrToken) setQrError(true);
          setTicket(data || MOCK);
          setLoading(false);
        }
      })
      .catch(() => { setTicket(MOCK); setLoading(false); });
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentIntentId = searchParams.get('payment_intent');
    const token = localStorage.getItem('token');

    // Stripe redirige con redirect_status=succeeded — sincronizar con backend
    // antes de empezar el polling para no depender del webhook en dev
    if (searchParams.get('redirect_status') === 'succeeded' && paymentIntentId && token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentIntentId }),
      }).catch(() => {});
    }

    const timer = setTimeout(() => fetchTicket(), 1500);
    return () => clearTimeout(timer);
  }, [reservationId]);

  useEffect(() => {
    if (ticket?.qrToken && qrRef.current) generateQR(ticket.qrToken);
  }, [ticket]);

  const generateQR = async (token: string) => {
    if (!qrRef.current) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
      await QRCode.toCanvas(canvas, JSON.stringify({ t: token }), {
        width: isDesktop ? 260 : 200, margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      qrRef.current.innerHTML = '';
      qrRef.current.appendChild(canvas);
    } catch {
      if (qrRef.current) qrRef.current.innerHTML = '<p style="color:#bbb;font-size:12px;text-align:center">QR enviado<br/>por WhatsApp</p>';
    }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#EDEDED',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,fontFamily:'Inter,sans-serif'}}>
      <div style={{width:28,height:28,border:'2px solid #ddd',borderTop:'2px solid #1a1a1a',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <p style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'#bbb'}}>Confirmando pago...</p>
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!ticket) return null;
  const ticketId = `TKT-${reservationId.slice(0,8).toUpperCase()}`;

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        @keyframes checkPop { 0%{transform:scale(0)} 70%{transform:scale(1.15)} 100%{transform:scale(1)} }
        .cnw { min-height:100vh; background:#EDEDED; }
        .cnb { padding:24px 24px 48px; max-width:480px; margin:0 auto; }
        @media(min-width:640px){ .cnb { padding:36px 40px 64px; } }
        @media(min-width:1024px){ .cnb { max-width:640px; padding:48px 0 80px; } }
        .cc { width:64px; height:64px; background:#1a1a1a; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 18px; animation:checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        @media(min-width:1024px){ .cc { width:80px; height:80px; } }
        .qw { background:#fff; border-radius:20px; padding:28px; display:flex; flex-direction:column; align-items:center; gap:16px; margin-bottom:14px; }
        @media(min-width:1024px){ .qw { padding:40px; } }
        .qb { width:200px; height:200px; display:flex; align-items:center; justify-content:center; }
        @media(min-width:1024px){ .qb { width:260px; height:260px; } }
        .qh { font-size:12px; color:#999; text-align:center; line-height:1.6; max-width:240px; }
        .qi { font-size:10px; color:#bbb; font-family:'Courier New',monospace; letter-spacing:2px; background:#f5f5f5; padding:5px 12px; border-radius:6px; }
        .tc { background:#fff; border-radius:16px; overflow:hidden; margin-bottom:14px; }
        .th { background:#1a1a1a; padding:10px 16px; }
        .tht { font-size:9px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.4); }
        .tr { display:flex; justify-content:space-between; padding:11px 16px; border-bottom:1px solid #f5f5f5; align-items:flex-start; gap:16px; }
        .tr:last-child { border-bottom:none; }
        .tl { font-size:11px; color:#bbb; flex-shrink:0; }
        .tv { font-size:12px; color:#1a1a1a; font-weight:500; text-align:right; }
        .wn { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:14px 16px; display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; }
        .wnt { font-size:13px; color:#166534; line-height:1.5; }
        .stc { background:#fff; border-radius:16px; padding:20px; margin-bottom:24px; }
        .stt { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#bbb; margin-bottom:16px; }
        .si { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .si:last-child { margin-bottom:0; }
        .sn { width:26px; height:26px; background:#1a1a1a; color:#EDEDED; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
        .st { font-size:13px; color:#444; line-height:1.4; }
      `}</style>
      <div className="cnw">
        <header className="pm-header" style={{paddingBottom:0}}>
          <span className="pm-logo">Park<span>MX</span></span>
        </header>
        <div className="cnb">
          <div style={{textAlign:'center',padding:'32px 0 28px'}}>
            <div className="cc">
              <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                <path d="M2 10L9.5 17.5L24 2" stroke="#EDEDED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{fontSize:26,fontWeight:700,letterSpacing:'-0.5px',color:'#1a1a1a',marginBottom:6}}>¡Lugar confirmado!</h1>
            <p style={{fontSize:13,color:'#999',fontWeight:300}}>Tu boleto está listo para usar</p>
          </div>
          <div className="qw">
            <div className="qb" ref={qrRef}>
              {qrError
                ? <p style={{color:'#bbb',fontSize:12,textAlign:'center',lineHeight:1.6}}>QR enviado<br/>por WhatsApp</p>
                : <div style={{width:28,height:28,border:'2px solid #eee',borderTop:'2px solid #1a1a1a',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
              }
            </div>
            <p className="qh">Muestra este QR al llegar al estacionamiento.<br/><strong>Solo es válido una vez.</strong></p>
            <div className="qi">{ticketId}</div>
          </div>
          <div className="tc">
            <div className="th"><span className="tht">Detalle del boleto</span></div>
            {[
              ['Evento',          ticket.event.name,          false],
              ['Venue',           ticket.event.venueName,     false],
              ['Fecha',           new Date(ticket.event.startsAt).toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'long'}), false],
              ['Estacionamiento', ticket.event.parkingName,   false],
              ['Dirección',       ticket.event.parkingAddress,false],
              ['Subtotal',        `$${(ticket.payment.amount / 1.16).toFixed(2)} MXN`, false],
              ['IVA (16%)',       `$${(ticket.payment.amount - ticket.payment.amount / 1.16).toFixed(2)} MXN`, false],
              ['Total pagado',    `$${ticket.payment.amount.toFixed(2)} MXN`, true],
            ].map(([label, value, isTotal]) => (
              <div key={label as string} className="tr" style={isTotal ? { background: '#f9f9f9' } : {}}>
                <span className="tl" style={isTotal ? { fontWeight: 600, color: '#1a1a1a' } : {}}>{label}</span>
                <span className="tv" style={isTotal ? { fontSize: 15, fontWeight: 700, color: '#1a1a1a' } : {}}>{value}</span>
              </div>
            ))}
          </div>
          <div className="wn">
            <span style={{fontSize:22,flexShrink:0}}>💬</span>
            <p className="wnt">También te enviamos el QR por WhatsApp{ticket.userPhone ? ` al ${ticket.userPhone}` : ''}. Guárdalo como respaldo.</p>
          </div>
          <div className="stc">
            <p className="stt">Cómo usarlo</p>
            {['Llega al estacionamiento antes o durante el evento','Abre este boleto o el mensaje de WhatsApp','Muestra el código QR al operador','El operador escanea y puedes entrar'].map((text,i) => (
              <div key={i} className="si">
                <div className="sn">{i+1}</div>
                <span className="st">{text}</span>
              </div>
            ))}
          </div>
          <Link href="/" className="pm-btn-primary" style={{display:'flex',textDecoration:'none'}}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </>
  );
}
