import { useState, useEffect, useMemo } from 'react';

interface PricingConfig {
  marginMin:          number;
  marginMax:          number;
  weightDistance:     number;
  weightAnticipation: number;
  weightDemand:       number;
}

interface PriceBreakdown {
  contractPrice:  number;
  basePrice:      number;
  ivaAmount:      number;
  finalPrice:     number;
  profit:         number;
  marginPercent:  number;
  multipliers: { distance: number; anticipation: number; demand: number; composite: number };
}

const API = (import.meta as any).env?.VITE_API_URL || '';

// ─── Motor de precios (espejo del servicio NestJS) ────────────────────────────
const IVA = 0.16;
const MULT_MIN = { distance: 0.8, anticipation: 0.9, demand: 0.85 };
const MULT_MAX = { distance: 1.5, anticipation: 1.6, demand: 1.40 };

function lerp(x: number, x0: number, y0: number, x1: number, y1: number) {
  if (x <= x0) return y0; if (x >= x1) return y1;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
function distMult(km: number) {
  if (km <= 0.5) return 1.5;
  if (km <= 1.0) return lerp(km, 0.5, 1.5, 1.0, 1.2);
  if (km <= 2.0) return lerp(km, 1.0, 1.2, 2.0, 1.0);
  if (km <= 3.0) return lerp(km, 2.0, 1.0, 3.0, 0.8);
  return 0.8;
}
function antMult(h: number) {
  if (h <= 0)   return 1.6;
  if (h <= 6)   return lerp(h,  0,  1.6,  6,  1.3);
  if (h <= 24)  return lerp(h,  6,  1.3, 24,  1.1);
  if (h <= 72)  return lerp(h, 24,  1.1, 72,  1.0);
  if (h <= 168) return lerp(h, 72,  1.0, 168, 0.9);
  return 0.9;
}
function demMult(pct: number) {
  const p = Math.max(0, Math.min(100, pct));
  if (p <= 50) return lerp(p,  0, 0.85,  50, 1.0);
  if (p <= 80) return lerp(p, 50, 1.0,   80, 1.2);
  return         lerp(p, 80, 1.2, 100, 1.4);
}
function computePrice(
  contractPrice: number, distKm: number, antHours: number, occupancy: number,
  cfg: PricingConfig,
): PriceBreakdown {
  const mDist = distMult(distKm);
  const mAnt  = antMult(antHours);
  const mDem  = demMult(occupancy);
  const { weightDistance: wd, weightAnticipation: wa, weightDemand: wdem, marginMin, marginMax } = cfg;
  const composite = wd * mDist + wa * mAnt + wdem * mDem;
  const compMin   = wd * MULT_MIN.distance + wa * MULT_MIN.anticipation + wdem * MULT_MIN.demand;
  const compMax   = wd * MULT_MAX.distance + wa * MULT_MAX.anticipation + wdem * MULT_MAX.demand;
  const score     = compMax > compMin ? Math.max(0, Math.min(1, (composite - compMin) / (compMax - compMin))) : 0.5;
  const marginPct = marginMin + score * (marginMax - marginMin);
  const basePrice = +(contractPrice * (1 + marginPct / 100)).toFixed(2);
  const ivaAmount = +(basePrice * IVA).toFixed(2);
  const finalPrice = Math.round(basePrice + ivaAmount);
  const profit    = +(basePrice - contractPrice).toFixed(2);
  return {
    contractPrice, basePrice, ivaAmount, finalPrice, profit,
    marginPercent: +marginPct.toFixed(2),
    multipliers: { distance: +mDist.toFixed(4), anticipation: +mAnt.toFixed(4), demand: +mDem.toFixed(4), composite: +composite.toFixed(4) },
  };
}

const label = (txt: string) => (
  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#999', display: 'block', marginBottom: 6 }}>
    {txt}
  </span>
);

const numInput = (value: number, onChange: (v: number) => void, min: number, max: number, step = 1, suffix = '') => (
  <div style={{ position: 'relative' }}>
    <input
      type="number" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      style={{ width: '100%', padding: '10px 14px', paddingRight: suffix ? 36 : 14, border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
      onFocus={e => e.target.style.borderColor = '#1a1a1a'}
      onBlur={e => e.target.style.borderColor = '#e8e8e8'}
    />
    {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: 13, pointerEvents: 'none' as const }}>{suffix}</span>}
  </div>
);

const slider = (value: number, onChange: (v: number) => void, min: number, max: number, step = 0.01) => (
  <input type="range" min={min} max={max} step={step} value={value}
    onChange={e => onChange(+e.target.value)}
    style={{ width: '100%', accentColor: '#1a1a1a' }}
  />
);

export default function AdminPricing({ token }: { token: string }) {
  const [config, setConfig] = useState<PricingConfig>({
    marginMin: 15, marginMax: 60,
    weightDistance: 0.40, weightAnticipation: 0.35, weightDemand: 0.25,
  });
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');
  const [loaded, setLoaded]   = useState(false);

  // Preview calculator state
  const [contractPrice, setContractP] = useState(100);
  const [distKm,   setDistKm]         = useState(1.5);
  const [antHours, setAntHours]       = useState(48);
  const [occupancy,setOccupancy]      = useState(60);

  // Load current config
  useEffect(() => {
    fetch(`${API}/api/v1/pricing-config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.data) setConfig(d.data);
        setLoaded(true);
      }).catch(() => setLoaded(true));
  }, [token]);

  // Live preview — computed client-side, sin necesidad del API
  const preview = useMemo<PriceBreakdown>(
    () => computePrice(contractPrice, distKm, antHours, occupancy, config),
    [contractPrice, distKm, antHours, occupancy, config],
  );

  const weightsSum = +(config.weightDistance + config.weightAnticipation + config.weightDemand).toFixed(4);
  const weightsOk  = Math.abs(weightsSum - 1) <= 0.01;

  const setWeight = (key: keyof PricingConfig, val: number) => {
    setConfig(prev => ({ ...prev, [key]: +val.toFixed(3) }));
  };

  const handleSave = async () => {
    if (!weightsOk) { setError('Los pesos deben sumar exactamente 100%'); return; }
    if (config.marginMin >= config.marginMax) { setError('El margen mínimo debe ser menor al máximo'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/api/v1/pricing-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.message || 'Error al guardar'); return; }
      setConfig(d.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const card = (children: React.ReactNode, title: string) => (
    <div style={{ background: '#fff', borderRadius: 16, padding: '24px 24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#1a1a1a', margin: '0 0 20px' }}>{title}</h3>
      {children}
    </div>
  );

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 24, height: 24, border: '2px solid #eee', borderTop: '2px solid #1a1a1a', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '0 0 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Precios dinámicos</h2>
        <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
          Configura márgenes y pesos. El precio final = precio contrato × (1 + margen) × 1.16 IVA.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Columna izquierda: configuración ── */}
        <div>
          {card(
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                {label('Margen mínimo')}
                {numInput(config.marginMin, v => setConfig(c => ({ ...c, marginMin: v })), 0, 100, 1, '%')}
                <p style={{ fontSize: 11, color: '#bbb', margin: '5px 0 0' }}>Aplica cuando todo favorece al cliente</p>
              </div>
              <div style={{ flex: 1 }}>
                {label('Margen máximo')}
                {numInput(config.marginMax, v => setConfig(c => ({ ...c, marginMax: v })), 0, 200, 1, '%')}
                <p style={{ fontSize: 11, color: '#bbb', margin: '5px 0 0' }}>Aplica en condiciones de máxima demanda</p>
              </div>
            </div>,
            '📊 Márgenes globales'
          )}

          {card(
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Distancia */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  {label('📍 Distancia al venue')}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{(config.weightDistance * 100).toFixed(0)}%</span>
                </div>
                {slider(config.weightDistance, v => setWeight('weightDistance', v), 0, 1)}
                <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>Cerca = precio mayor · Lejos = precio menor</p>
              </div>

              {/* Anticipación */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  {label('⏱ Anticipación')}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{(config.weightAnticipation * 100).toFixed(0)}%</span>
                </div>
                {slider(config.weightAnticipation, v => setWeight('weightAnticipation', v), 0, 1)}
                <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>Última hora = precio mayor · Semana antes = precio menor</p>
              </div>

              {/* Demanda */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  {label('🔥 Demanda (ocupación)')}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{(config.weightDemand * 100).toFixed(0)}%</span>
                </div>
                {slider(config.weightDemand, v => setWeight('weightDemand', v), 0, 1)}
                <p style={{ fontSize: 11, color: '#bbb', margin: '3px 0 0' }}>Lleno = precio mayor · Vacío = precio menor</p>
              </div>

              {/* Suma de pesos */}
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: weightsOk ? '#f0fdf4' : '#fff1f2',
                border: `1px solid ${weightsOk ? '#bbf7d0' : '#fecdd3'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: weightsOk ? '#166534' : '#9f1239' }}>
                  {weightsOk ? '✓ Los pesos suman 100%' : '⚠ Los pesos deben sumar 100%'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: weightsOk ? '#166534' : '#9f1239' }}>
                  {(weightsSum * 100).toFixed(1)}%
                </span>
              </div>
            </div>,
            '⚖️ Pesos de multiplicadores'
          )}

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', color: '#9f1239', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !weightsOk}
            style={{
              width: '100%', padding: '13px', background: saved ? '#22c55e' : '#1a1a1a',
              color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: saving || !weightsOk ? 'not-allowed' : 'pointer',
              opacity: !weightsOk ? 0.5 : 1,
              transition: 'background .3s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {saving ? (
              <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }}/> Guardando...</>
            ) : saved ? '✓ Configuración guardada' : 'Guardar configuración'}
          </button>
        </div>

        {/* ── Columna derecha: calculadora de previsualización ── */}
        <div>
          {card(
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                {label('💰 Precio contrato (sin IVA)')}
                {numInput(contractPrice, setContractP, 1, 9999, 1, 'MXN')}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  {label('📍 Distancia al venue')}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{distKm.toFixed(1)} km</span>
                </div>
                {slider(distKm, setDistKm, 0, 5, 0.1)}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginTop: 2 }}>
                  <span>0 km</span><span>5 km</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  {label('⏱ Anticipación')}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                    {antHours < 24 ? `${antHours}h` : `${(antHours/24).toFixed(1)}d`}
                  </span>
                </div>
                {slider(antHours, setAntHours, 0, 168, 1)}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginTop: 2 }}>
                  <span>Ahora</span><span>1 semana</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  {label('🔥 Ocupación del estacionamiento')}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{occupancy}%</span>
                </div>
                {slider(occupancy, setOccupancy, 0, 100, 1)}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginTop: 2 }}>
                  <span>0% vacío</span><span>100% lleno</span>
                </div>
              </div>
            </div>,
            '🧮 Calculadora de precio'
          )}

          {/* Resultado */}
          {card(
            <div>
              {/* Multiplicadores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { label: '📍 Distancia', value: preview.multipliers.distance },
                  { label: '⏱ Anticipación', value: preview.multipliers.anticipation },
                  { label: '🔥 Demanda', value: preview.multipliers.demand },
                ].map(m => (
                  <div key={m.label} style={{ background: '#f5f5f5', borderRadius: 10, padding: '10px 12px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{m.value.toFixed(2)}×</div>
                  </div>
                ))}
              </div>

              {/* Desglose de precio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Precio contrato',   value: `$${preview.contractPrice}`,                  sub: 'lo que pagas al estacionamiento' },
                  { label: `Margen aplicado`,   value: `+${preview.marginPercent.toFixed(1)}%`,       sub: `composite × ${(preview.multipliers.composite).toFixed(3)}` },
                  { label: 'Precio base',        value: `$${preview.basePrice.toFixed(2)}`,           sub: 'sin IVA' },
                  { label: 'IVA 16%',            value: `+$${preview.ivaAmount.toFixed(2)}`,          sub: '' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                    <div>
                      <div style={{ color: '#555', fontWeight: 500 }}>{row.label}</div>
                      {row.sub && <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{row.sub}</div>}
                    </div>
                    <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#1a1a1a', borderRadius: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1, textTransform: 'uppercase' as const }}>Precio final al usuario</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>IVA incluido</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
                  ${preview.finalPrice}
                </div>
              </div>

              {/* Ganancia */}
              <div style={{ marginTop: 10, padding: '10px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#166534' }}>💰 Tu ganancia por reserva</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>${preview.profit.toFixed(2)} MXN</span>
              </div>
            </div>,
            '📋 Desglose de precio'
          )}
        </div>
      </div>
    </div>
  );
}
