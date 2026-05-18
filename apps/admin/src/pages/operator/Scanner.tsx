import { useState, useEffect, useRef, useCallback } from 'react';
import { ScanResult } from '../../types';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

interface HistoryEntry { token: string; valid: boolean; name?: string; event?: string; time: string; }

export default function OperatorScanner({ token }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number>(0);
  const processingRef = useRef(false);

  const [scanning, setScanning]   = useState(false);
  const [result, setResult]       = useState<ScanResult | null>(null);
  const [error, setError]         = useState('');
  const [manual, setManual]       = useState('');
  const [history, setHistory]     = useState<HistoryEntry[]>([]);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); stopCamera(); }, [stopCamera]);

  const processQR = useCallback(async (raw: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    cancelAnimationFrame(rafRef.current);

    let qrToken = raw;
    try { const parsed = JSON.parse(raw); if (parsed.t) qrToken = parsed.t; } catch {}

    try {
      const res = await api.scan(token, qrToken);
      const r: ScanResult = {
        valid: res.valid ?? !res.error,
        reason: res.reason || res.message || (res.valid ? 'Acceso válido' : 'Token inválido'),
        userName:  res.userName  || res.user_name  || res.name,
        eventName: res.eventName || res.event_name,
        scannedAt: res.scannedAt || new Date().toISOString(),
      };
      setResult(r);
      setHistory(h => [{ token: qrToken.slice(-8), valid: r.valid, name: r.userName, event: r.eventName, time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) }, ...h.slice(0, 9)]);
      setTimeout(() => { setResult(null); processingRef.current = false; if (scanning) tick(); }, 4000);
    } catch (e: any) {
      const r: ScanResult = { valid: false, reason: e.message || 'Error de conexión' };
      setResult(r);
      setHistory(h => [{ token: qrToken.slice(-8), valid: false, time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) }, ...h.slice(0, 9)]);
      setTimeout(() => { setResult(null); processingRef.current = false; if (scanning) tick(); }, 4000);
    }
  }, [token, scanning]);

  const tick = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || processingRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import('jsqr')).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) { processQR(code.data); return; }
      } catch {}
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [processQR]);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => { setCameraReady(true); };
        await videoRef.current.play();
        setScanning(true);
        tick();
      }
    } catch { setError('No se pudo acceder a la cámara. Verifica los permisos.'); }
  };

  const handleManual = () => {
    if (!manual.trim()) return;
    processQR(manual.trim());
    setManual('');
  };

  const resultBg    = result ? (result.valid ? '#D1FAE5' : '#FEE2E2') : 'transparent';
  const resultColor = result ? (result.valid ? '#065F46' : '#991B1B') : '#1a1a1a';

  return (
    <>
      <style>{ADMIN_CSS + `
        .scanner-wrap { max-width: 580px; }
        .cam-container { position: relative; background: #1a1a1a; border-radius: 16px; overflow: hidden; aspect-ratio: 4/3; }
        .cam-video { width: 100%; height: 100%; object-fit: cover; }
        .cam-canvas { display: none; }
        .viewfinder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .vf-box { width: 56%; max-width: 220px; aspect-ratio: 1; position: relative; }
        .vf-corner { position: absolute; width: 24px; height: 24px; border-color: #fff; border-style: solid; opacity: 0.8; }
        .vf-tl { top:0; left:0; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .vf-tr { top:0; right:0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
        .vf-bl { bottom:0; left:0; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
        .vf-br { bottom:0; right:0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
        @keyframes scanLine { 0%,100%{ top:0 } 50%{ top:calc(100% - 2px) } }
        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.7); animation: scanLine 2s ease-in-out infinite; box-shadow: 0 0 6px rgba(255,255,255,0.5); }

        .result-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; text-align: center; transition: background 0.3s; }
        .result-icon { font-size: 56px; line-height: 1; }
        .result-name { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
        .result-event { font-size: 13px; opacity: 0.8; }
        .result-reason { font-size: 12px; opacity: 0.7; }

        .history-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .history-row:last-child { border-bottom: none; }
        .hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      `}</style>

      <div className="adm-page">
        <div className="adm-ph" style={{ marginBottom: 20 }}>
          <div><h1 className="adm-pt">Escáner QR</h1><p className="adm-ps">Validación de accesos en tiempo real</p></div>
        </div>

        <div className="scanner-wrap">
          <div className="cam-container">
            <video ref={videoRef} className="cam-video" playsInline muted />
            <canvas ref={canvasRef} className="cam-canvas" />

            {scanning && cameraReady && !result && (
              <div className="viewfinder">
                <div className="vf-box">
                  <div className="vf-corner vf-tl" /><div className="vf-corner vf-tr" />
                  <div className="vf-corner vf-bl" /><div className="vf-corner vf-br" />
                  <div className="scan-line" />
                </div>
              </div>
            )}

            {result && (
              <div className="result-overlay" style={{ background: resultBg }}>
                <div className="result-icon">{result.valid ? '✅' : '❌'}</div>
                {result.userName && <div className="result-name" style={{ color: resultColor }}>{result.userName}</div>}
                {result.eventName && <div className="result-event" style={{ color: resultColor }}>{result.eventName}</div>}
                <div className="result-reason" style={{ color: resultColor }}>{result.reason}</div>
              </div>
            )}

            {!scanning && !result && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <button className="adm-btn" onClick={startCamera}>Activar cámara</button>
                {error && <p style={{ fontSize: 12, color: '#fca5a5', textAlign: 'center', maxWidth: 200 }}>{error}</p>}
              </div>
            )}
          </div>

          {scanning && !result && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="adm-btn adm-btn-ghost" style={{ flex: 1 }} onClick={stopCamera}>Detener cámara</button>
            </div>
          )}

          {/* Manual input */}
          <div style={{ marginTop: 14 }}>
            <label className="adm-label">Ingresar token manualmente</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="adm-input adm-input-sm" placeholder="eyJ..." value={manual}
                onChange={e => setManual(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManual()}
                style={{ fontFamily: 'monospace', fontSize: 12 }} />
              <button className="adm-btn adm-btn-sm" onClick={handleManual} disabled={!manual.trim()}>Validar</button>
            </div>
          </div>

          {/* Scan history */}
          {history.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p className="adm-section-lbl">Historial de escaneos</p>
              <div className="adm-tw">
                {history.map((h, i) => (
                  <div key={i} className="history-row">
                    <div className="hist-dot" style={{ background: h.valid ? '#10B981' : '#EF4444' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{h.name || `Token ...${h.token}`}</div>
                      {h.event && <div style={{ fontSize: 11, color: '#bbb' }}>{h.event}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>{h.time}</span>
                    <span style={{ fontSize: 12, flexShrink: 0, color: h.valid ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                      {h.valid ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
