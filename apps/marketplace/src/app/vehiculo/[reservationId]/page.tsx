'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

const TYPES = ['Auto', 'Sub', 'Pick Up', 'Moto'] as const;
type VehicleType = typeof TYPES[number];

interface Pricing { base: number; auto: number | null; sub: number | null; pickup: number | null; moto: number | null; }

const TYPE_KEY: Record<VehicleType, keyof Pricing> = {
  'Auto': 'auto', 'Sub': 'sub', 'Pick Up': 'pickup', 'Moto': 'moto',
};

export default function VehiclePage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const router = useRouter();

  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<VehicleType | ''>('');
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reservations/${reservationId}/pricing`)
      .then(r => r.json()).then(setPricing).catch(() => {});
  }, [reservationId]);

  const displayPrice = (): string | null => {
    if (!pricing || !type) return null;
    const key = TYPE_KEY[type as VehicleType];
    const p = pricing[key] ?? pricing.base;
    return `$${p.toLocaleString('es-MX')}`;
  };

  const valid = plate.trim().length >= 5 && make.trim() && model.trim() && type;

  const handleSubmit = async () => {
    if (!valid) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reservations/${reservationId}/vehicle`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plate: plate.trim().toUpperCase(), make: make.trim(), model: model.trim(), type }),
        },
      );
      if (!res.ok) { const d = await res.json(); setError(d.message || 'Error al guardar'); return; }
      router.push(`/checkout/${reservationId}`);
    } catch { setError('Error de conexión.'); } finally { setLoading(false); }
  };

  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .vw { min-height:100vh; background:#EDEDED; display:flex; flex-direction:column; }
        .vb { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; }
        .vc { width:100%; max-width:420px; background:#fff; border-radius:20px; padding:32px 28px; animation:fadeUp 0.4s ease both; }
        .vh1 { font-size:22px; font-weight:700; letter-spacing:-0.4px; color:#1a1a1a; margin-bottom:6px; }
        .vsub { font-size:13px; color:#999; margin-bottom:28px; line-height:1.55; }
        .vl { font-size:12px; font-weight:600; color:#666; margin-bottom:6px; letter-spacing:0.3px; }
        .vi { width:100%; padding:13px 16px; background:#fff; border:1px solid rgba(0,0,0,0.12); border-radius:10px; font-size:14px; color:#1a1a1a; font-family:Inter,sans-serif; box-sizing:border-box; transition:border-color 0.2s; }
        .vi:focus { outline:none; border-color:#1a1a1a; }
        .vi::placeholder { color:#ccc; }
        .vg { display:flex; flex-direction:column; gap:16px; margin-bottom:24px; }
        .vrow { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .vtypes { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .vtype { padding:12px; border:2px solid rgba(0,0,0,0.1); border-radius:10px; font-size:13px; font-weight:600; color:#666; cursor:pointer; text-align:center; transition:all 0.15s; background:#fff; }
        .vtype:hover { border-color:#999; color:#333; }
        .vtype.sel { border-color:#1a1a1a; background:#1a1a1a; color:#fff; }
        .vplate { text-transform:uppercase; letter-spacing:2px; font-weight:700; font-size:16px; }
      `}</style>
      <div className="vw">
        <header className="pm-header">
          <Link href="/" className="pm-logo">Park<span>MX</span></Link>
        </header>
        <div className="vb">
          <div className="vc">
            <span style={{ fontSize:36, display:'block', marginBottom:16 }}>🚗</span>
            <h1 className="vh1">Datos de tu vehículo</h1>
            <p className="vsub">Los necesitamos para facilitar tu entrada al estacionamiento.</p>

            <div className="vg">
              <div>
                <div className="vl">CATEGORÍA</div>
                <div className="vtypes">
                  {TYPES.map(t => {
                    const key = TYPE_KEY[t];
                    const p = pricing ? (pricing[key] ?? pricing.base) : null;
                    return (
                      <button key={t} className={`vtype${type === t ? ' sel' : ''}`} onClick={() => setType(t)}>
                        <span>{t}</span>
                        {p != null && <span style={{ display: 'block', fontSize: 11, marginTop: 2, opacity: 0.75 }}>${p.toLocaleString('es-MX')}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="vrow">
                <div>
                  <div className="vl">MARCA</div>
                  <input className="vi" value={make} onChange={e => setMake(e.target.value)} placeholder="Toyota" />
                </div>
                <div>
                  <div className="vl">MODELO</div>
                  <input className="vi" value={model} onChange={e => setModel(e.target.value)} placeholder="Corolla" />
                </div>
              </div>

              <div>
                <div className="vl">PLACAS</div>
                <input
                  className="vi vplate"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  placeholder="ABC 123 D"
                  maxLength={8}
                />
              </div>
            </div>

            {displayPrice() && (
              <div style={{ background:'#f5f5f5', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, color:'#666' }}>Total a pagar</span>
                <span style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.5px' }}>{displayPrice()}</span>
              </div>
            )}

            {error && <div className="pm-error" style={{ marginBottom:16 }}>{error}</div>}

            <button className="pm-btn-primary" onClick={handleSubmit} disabled={loading || !valid}>
              {loading ? 'Guardando...' : 'Continuar al pago →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
