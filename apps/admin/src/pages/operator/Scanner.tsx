import { useRef, useState, useCallback, useEffect, CSSProperties } from 'react';
import { CameraOff, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '../../lib/api';

type Step = 'scan' | 'plate' | 'photos' | 'confirm';

const PHOTO_LABELS = ['Frente', 'Atrás', 'Lado izquierdo', 'Lado derecho'] as const;
const PHOTO_KEYS   = ['photoFront', 'photoBack', 'photoLeft', 'photoRight'] as const;

interface ScanData { reservationId: string; userName: string; eventName: string; vehiclePlate?: string; }

// Normaliza para comparar placas ignorando espacios/guiones/mayúsculas —
// evita falsos "no coinciden" por formato, no por la placa en sí.
const normalizePlate = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, '');
type PhotoMap = Record<typeof PHOTO_KEYS[number], string>;

// ── Design tokens (EstacionaT brand) ─────────────────────────────────────────
const T = {
  bg:         '#FAFAFA',
  white:      '#fff',
  text:       '#04210f',
  secondary:  '#5b6b62',
  muted:      '#9aa8a0',
  inputBg:    '#F5F6F4',
  border:     'rgba(4,33,15,0.18)',
  borderSoft: 'rgba(4,33,15,0.07)',
  radius:     16,
  radiusBtn:  10,
  shadow:     '0 1px 4px rgba(4,33,15,0.07)',
  font:       "'Plus Jakarta Sans', -apple-system, sans-serif",
  primary:    '#383497',
  primaryHover: '#2b278c',
  success:    '#86B49F',
  successBg:  '#EEF5F1',
  successText:'#1f5138',
};

const stepDotStyle = (active: boolean, done: boolean): CSSProperties => ({
  width: 32, height: 32, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700,
  background: (done || active) ? T.primary : 'rgba(4,33,15,0.1)',
  color: (done || active) ? '#fff' : T.secondary,
});

const stepLabelStyle = (active: boolean): CSSProperties => ({
  fontSize: 11, fontWeight: active ? 600 : 400,
  color: active ? T.text : T.muted,
});

const s: Record<string, CSSProperties> = {
  page:   { minHeight: '100vh', background: T.bg, fontFamily: T.font, WebkitFontSmoothing: 'antialiased' },
  inner:  { maxWidth: 480, margin: '0 auto', padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: 20 },
  title:  { fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', color: T.text },
  progressRow: { display: 'flex', alignItems: 'center', gap: 4 },
  stepCol:     { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  errorBanner: { background: '#fff0f0', border: '1px solid rgba(220,38,38,0.2)', borderRadius: T.radius, padding: '12px 16px', fontSize: 13, color: '#b91c1c', lineHeight: 1.5 },
  card:   { background: T.white, borderRadius: T.radius, padding: '20px', boxShadow: T.shadow },
  label:  { fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: T.secondary, display: 'block', marginBottom: 8 },
  input:  { width: '100%', minHeight: 52, background: T.inputBg, border: 'none', borderRadius: T.radiusBtn, padding: '0 16px', fontSize: 15, fontFamily: T.font, color: T.text, boxSizing: 'border-box' } as CSSProperties,
  inputPlate: { width: '100%', minHeight: 64, background: T.inputBg, border: 'none', borderRadius: T.radiusBtn, padding: '0 16px', fontSize: 28, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 6, color: T.text, textAlign: 'center', boxSizing: 'border-box' } as CSSProperties,
  btnPrimary:  { width: '100%', minHeight: 52, background: T.primary, color: '#fff', border: 'none', borderRadius: T.radiusBtn, fontSize: 16, fontWeight: 700, fontFamily: T.font, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  btnSecondary:{ width: '100%', minHeight: 52, background: 'transparent', color: T.text, border: `1.5px solid ${T.border}`, borderRadius: T.radiusBtn, fontSize: 15, fontWeight: 600, fontFamily: T.font, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText:     { width: '100%', minHeight: 44, background: 'none', border: 'none', color: T.secondary, fontSize: 14, fontFamily: T.font, cursor: 'pointer' },
  divider:     { height: 1, background: T.borderSoft },
  rowBetween:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  videoWrap:   { position: 'relative', borderRadius: T.radius, overflow: 'hidden', background: '#04210f', width: '100%', height: 300 } as CSSProperties,
  videoEl:     { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as CSSProperties,
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function cameraErrorMessage(err: any): string {
  const name = err?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
    return 'Permiso denegado. Ve a Ajustes del navegador → Esta página → Cámara → Permitir.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'No se encontró cámara trasera en el dispositivo.';
  if (name === 'NotReadableError' || name === 'TrackStartError')
    return 'La cámara está en uso por otra app. Ciérrala y vuelve a intentar.';
  if (name === 'SecurityError')
    return 'La cámara requiere HTTPS. Usa el campo de token manual más abajo.';
  return `Error de cámara (${name || err?.message || 'desconocido'}). Usa la entrada manual.`;
}

async function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_W = 1280, MAX_H = 960;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Step bar ───────────────────────────────────────────────────────────────────
function StepBar({ current }: { current: Step }) {
  const steps: Step[] = ['scan', 'plate', 'photos', 'confirm'];
  const labels = ['QR', 'Placas', 'Fotos', 'Confirmar'];
  const idx = steps.indexOf(current);
  return (
    <div style={s.progressRow}>
      {steps.map((st, i) => (
        <div key={st} style={s.stepCol}>
          <div style={stepDotStyle(i === idx, i < idx)}>{i < idx ? '✓' : i + 1}</div>
          <span style={stepLabelStyle(i === idx)}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Scan frame corners ─────────────────────────────────────────────────────────
const CORNERS = [
  [{ top: 0, left: 0 },    { borderTop: '3px solid #fff', borderLeft: '3px solid #fff',  borderTopLeftRadius: 8 }],
  [{ top: 0, right: 0 },   { borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderTopRightRadius: 8 }],
  [{ bottom: 0, left: 0 },  { borderBottom: '3px solid #fff', borderLeft: '3px solid #fff',  borderBottomLeftRadius: 8 }],
  [{ bottom: 0, right: 0 }, { borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderBottomRightRadius: 8 }],
] as const;

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Scanner({ token }: { token: string }) {
  const [step, setStep]           = useState<Step>('scan');
  const [error, setError]         = useState('');
  const [manualToken, setManualToken] = useState('');
  const [validating, setValidating]   = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [scanData, setScanData]   = useState<ScanData | null>(null);
  const [plate, setPlate]         = useState('');
  const [photos, setPhotos]       = useState<Partial<PhotoMap>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [countdown, setCountdown] = useState(3);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number>(0);
  const processingRef = useRef(false);
  const streamRef     = useRef<MediaStream | null>(null);
  const scanFrameRef  = useRef<() => void>(() => {});

  // ── Stop stream ─────────────────────────────────────────────────────────────
  const stopQrStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  // ── QR token handler ────────────────────────────────────────────────────────
  const handleQrToken = useCallback(async (rawData: string) => {
    let qrToken = rawData.trim();
    try { const p = JSON.parse(rawData); if (p?.t) qrToken = p.t; } catch {}

    setError('');
    setValidating(true);
    try {
      const result = await api.scan(token, qrToken);
      if (result.valid) {
        setScanData({
          reservationId: result.reservationId,
          userName:  result.userName  || 'Usuario',
          eventName: result.eventName || 'Evento',
          vehiclePlate: result.vehiclePlate,
        });
        stopQrStream();
        setStep('plate');
      } else {
        setError(`QR inválido: ${result.reason}`);
        processingRef.current = false;
        // El QR es inválido/ya usado pero la cámara sigue activa — hay que
        // retomar el loop de escaneo o el escáner queda "congelado" hasta
        // refrescar la página, aunque el video se siga viendo.
        if (streamRef.current) rafRef.current = requestAnimationFrame(scanFrameRef.current);
      }
    } catch (e: any) {
      setError(e.message || 'Error al validar el QR');
      processingRef.current = false;
      if (streamRef.current) rafRef.current = requestAnimationFrame(scanFrameRef.current);
    } finally {
      setValidating(false);
    }
  }, [token, stopQrStream]);

  // ── Scan frame loop ─────────────────────────────────────────────────────────
  const scanFrame = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || processingRef.current || v.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    if (code?.data) {
      processingRef.current = true;
      handleQrToken(code.data);
    } else {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }, [handleQrToken]);

  useEffect(() => { scanFrameRef.current = scanFrame; }, [scanFrame]);

  // ── Start camera ─────────────────────────────────────────────────────────────
  const startQrCamera = useCallback(async () => {
    setCameraError('');
    setCameraReady(false);
    processingRef.current = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('getUserMedia no disponible'), { name: 'SecurityError' });
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) { v.srcObject = stream; await v.play(); }
      setCameraReady(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      setCameraError(cameraErrorMessage(err));
    }
  }, [scanFrame]);

  // ── Auto-start / stop camera when step changes ───────────────────────────────
  useEffect(() => {
    if (step === 'scan') {
      startQrCamera();
    }
    return () => { stopQrStream(); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-restart after success (3 s countdown) ───────────────────────────────
  useEffect(() => {
    if (!success) return;
    setCountdown(3);
    const iv = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    const tm = setTimeout(() => reset(), 3000);
    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [success]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual token submit ──────────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim() || validating) return;
    processingRef.current = true;
    handleQrToken(manualToken.trim());
    setManualToken('');
  };

  // ── Photo capture ────────────────────────────────────────────────────────────
  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof PhotoMap) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressToBase64(file);
      setPhotos(p => ({ ...p, [key]: base64 }));
    } catch {
      setError('No se pudo procesar la foto. Intenta de nuevo.');
    }
    e.target.value = '';
  };

  // Solo la primera foto (Frente) es obligatoria; el resto son opcionales.
  const REQUIRED_PHOTO_KEY = PHOTO_KEYS[0];
  const photosComplete = !!photos[REQUIRED_PHOTO_KEY];
  const photosCount    = PHOTO_KEYS.filter(k => photos[k]).length;

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!scanData || !photosComplete) return;
    setSubmitting(true); setError('');
    try {
      await api.checkin(token, scanData.reservationId, { plate: plate.toUpperCase(), ...photos });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Error al registrar entrada');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('scan'); setScanData(null); setPlate('');
    setPhotos({}); setError(''); setSuccess(false);
    setManualToken(''); setCameraError(''); setCameraReady(false);
    processingRef.current = false; setCountdown(3);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={s.inner}>

        <div style={s.title}>Registro de entrada</div>
        <StepBar current={step} />

        {error && <div style={s.errorBanner}>{error}</div>}

        {/* ── PASO 1: Escáner QR ─────────────────────────────────────────── */}
        {step === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Viewfinder — always shown, error variant if camera fails */}
            {cameraError ? (
              <div style={{ ...s.card, background: '#fff8f0', border: '1px solid rgba(220,100,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 8 }}>
                  <CameraOff size={15} /> Sin acceso a la cámara
                </div>
                <div style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.6, marginBottom: 12 }}>{cameraError}</div>
                <button
                  onClick={() => { setCameraError(''); startQrCamera(); }}
                  style={{ ...s.btnSecondary, minHeight: 40, fontSize: 13 }}
                >
                  Reintentar cámara
                </button>
              </div>
            ) : (
              <div style={s.videoWrap}>
                <video ref={videoRef} style={s.videoEl} muted playsInline autoPlay />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Loading overlay */}
                {!cameraReady && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(17,17,17,0.92)' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Iniciando cámara…</span>
                  </div>
                )}

                {/* Scan frame */}
                {cameraReady && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ position: 'relative', width: 200, height: 200 }}>
                      {CORNERS.map(([pos, brd], i) => (
                        <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...pos, ...brd }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Validating overlay */}
                {validating && (
                  <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                    <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, padding: '7px 16px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={14} className="animate-spin" />
                      Validando…
                    </span>
                  </div>
                )}

                {/* Hint */}
                {cameraReady && !validating && (
                  <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                    <span style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)', fontSize: 11, padding: '5px 14px', borderRadius: 20 }}>
                      Apunta el QR al cuadro
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Manual input fallback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>o ingresa el token manualmente</span>
              <div style={{ flex: 1, height: 1, background: T.borderSoft }} />
            </div>

            <div style={s.card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>Token QR</div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  style={{ ...s.input, fontSize: 13 }}
                  type="text"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="Pega aquí el token del QR"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={!manualToken.trim() || validating}
                  style={{ ...s.btnPrimary, ...(!manualToken.trim() || validating ? s.btnDisabled : {}) }}
                >
                  {validating ? 'Validando…' : 'Validar token'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── PASO 2: Placas ─────────────────────────────────────────────── */}
        {step === 'plate' && scanData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: T.successBg, borderRadius: T.radius, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: T.successText }}><CheckCircle2 size={16} /> Acceso permitido</div>
              <div style={{ fontSize: 13, color: T.text }}>
                <span style={{ color: T.secondary }}>Usuario: </span>{scanData.userName}
              </div>
              <div style={{ fontSize: 13, color: T.text }}>
                <span style={{ color: T.secondary }}>Evento: </span>{scanData.eventName}
              </div>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!plate.trim()) return;
                setError('');
                if (scanData.vehiclePlate && normalizePlate(plate) !== normalizePlate(scanData.vehiclePlate)) {
                  setError('Placas no coinciden');
                  return;
                }
                setStep('photos'); setPhotos({});
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div>
                <label style={s.label}>Número de placas</label>
                <input
                  style={s.inputPlate}
                  type="text"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={20}
                  autoFocus
                  inputMode="text"
                  autoCapitalize="characters"
                />
              </div>
              <button
                type="submit"
                disabled={!plate.trim()}
                style={{ ...s.btnPrimary, ...(!plate.trim() ? s.btnDisabled : {}) }}
              >
                Continuar →
              </button>
            </form>
          </div>
        )}

        {/* ── PASO 3: Fotos del vehículo ─────────────────────────────────── */}
        {step === 'photos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={s.rowBetween}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>Fotos del vehículo</div>
              <div style={{ fontSize: 13, color: T.secondary, fontWeight: 500 }}>{photosCount} / 4</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PHOTO_KEYS.map((key, i) => {
                const taken    = !!photos[key];
                const required = key === REQUIRED_PHOTO_KEY;
                return (
                  <label
                    key={key}
                    htmlFor={`photo-input-${key}`}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 14, overflow: 'hidden', aspectRatio: '4/3', cursor: 'pointer',
                      position: 'relative',
                      background: taken ? '#111' : T.inputBg,
                      border: taken ? 'none' : `2px dashed ${T.border}`,
                    }}
                  >
                    {taken ? (
                      <>
                        <img src={photos[key]} alt={PHOTO_LABELS[i]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 20 }}>Cambiar</div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, fontWeight: 600, textAlign: 'center', padding: '5px 0' }}>{PHOTO_LABELS[i]}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: T.secondary }}><Camera size={26} /></div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.secondary, textAlign: 'center', padding: '0 8px' }}>{PHOTO_LABELS[i]}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: required ? '#b91c1c' : T.muted, marginTop: 2 }}>{required ? 'Obligatoria' : 'Opcional'}</div>
                      </>
                    )}
                    <input id={`photo-input-${key}`} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handlePhotoFile(e, key)} />
                  </label>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: T.muted, textAlign: 'center' }}>
              Toca cada cuadro para abrir la cámara. Solo la foto de "{PHOTO_LABELS[0]}" es obligatoria — puedes retomar tocando "Cambiar".
            </div>

            <button
              disabled={!photosComplete}
              onClick={() => setStep('confirm')}
              style={{ ...s.btnPrimary, ...(!photosComplete ? s.btnDisabled : {}) }}
            >
              {photosComplete ? 'Revisar y confirmar →' : `Falta la foto de "${PHOTO_LABELS[0]}"`}
            </button>
          </div>
        )}

        {/* ── PASO 4: Confirmación / Éxito ──────────────────────────────── */}
        {step === 'confirm' && scanData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {success ? (
              <div style={{ ...s.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.successText }}><CheckCircle2 size={36} /></div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.successText }}>Entrada registrada</div>
                  <div style={{ fontSize: 13, color: T.secondary, marginTop: 6 }}>El vehículo fue registrado correctamente.</div>
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>
                  Siguiente escaneo en <strong style={{ color: T.text }}>{countdown}s</strong>…
                </div>
                <button style={s.btnPrimary} onClick={reset}>Escanear ahora</button>
              </div>
            ) : (
              <>
                <div style={{ background: T.white, borderRadius: T.radius, overflow: 'hidden', boxShadow: T.shadow }}>
                  {([['USUARIO', scanData.userName], ['EVENTO', scanData.eventName], ['PLACAS', plate.toUpperCase()]] as const).map(([lbl, val], i) => (
                    <div key={lbl}>
                      {i > 0 && <div style={s.divider} />}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', gap: 12 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: T.secondary, flexShrink: 0 }}>{lbl}</span>
                        <span style={{ fontSize: lbl === 'PLACAS' ? 18 : 14, fontWeight: lbl === 'PLACAS' ? 700 : 500, color: T.text, fontFamily: lbl === 'PLACAS' ? 'monospace' : T.font, letterSpacing: lbl === 'PLACAS' ? 4 : 0, textAlign: 'right' }}>{val}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {PHOTO_KEYS.map((key, i) => (
                    <div key={key} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: T.inputBg, aspectRatio: '4/3' }}>
                      {photos[key] && <img src={photos[key]} alt={PHOTO_LABELS[i]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, fontWeight: 600, textAlign: 'center', padding: '5px 0' }}>{PHOTO_LABELS[i]}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  style={{ ...s.btnPrimary, minHeight: 58, fontSize: 17, ...(submitting ? s.btnDisabled : {}) }}
                >
                  {submitting ? 'Registrando…' : 'Confirmar entrada'}
                </button>

                <button style={s.btnSecondary} onClick={() => setStep('photos')}>← Volver a fotos</button>
                <button style={s.btnText} onClick={reset}>Cancelar</button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
