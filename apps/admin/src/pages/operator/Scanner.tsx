import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { api } from '../../lib/api';

type Step = 'scan' | 'plate' | 'photos' | 'confirm';

const PHOTO_LABELS = ['Frente', 'Atrás', 'Lado izquierdo', 'Lado derecho'] as const;
const PHOTO_KEYS = ['photoFront', 'photoBack', 'photoLeft', 'photoRight'] as const;

interface ScanData {
  reservationId: string;
  userName: string;
  eventName: string;
}

interface Photos {
  photoFront: string;
  photoBack: string;
  photoLeft: string;
  photoRight: string;
}

export default function Scanner({ token }: { token: string }) {

  const [step, setStep] = useState<Step>('scan');
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [error, setError] = useState('');

  // Step 1 result
  const [scanData, setScanData] = useState<ScanData | null>(null);

  // Step 2
  const [plate, setPlate] = useState('');

  // Step 3
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photos, setPhotos] = useState<Partial<Photos>>({});
  const [preview, setPreview] = useState<string | null>(null);

  // Step 4
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Stream helpers ──────────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── QR scan logic ───────────────────────────────────────────────────────────

  const handleScan = useCallback(async (qrToken: string) => {
    setError('');
    try {
      const result = await api.scan(token!, qrToken);
      if (result.valid) {
        setScanData({
          reservationId: result.reservationId,
          userName: result.userName || 'Usuario',
          eventName: result.eventName || 'Evento',
        });
        stopStream();
        setStep('plate');
      } else {
        setError(`QR inválido: ${result.reason}`);
        processingRef.current = false;
      }
    } catch (e: any) {
      setError(e.message || 'Error al escanear');
      processingRef.current = false;
    }
  }, [token, stopStream]);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || processingRef.current) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (code?.data) {
      processingRef.current = true;
      handleScan(code.data);
    } else {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }, [handleScan]);

  useEffect(() => {
    if (step !== 'scan') return;
    processingRef.current = false;
    setScanning(false);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().then(() => {
            setScanning(true);
            rafRef.current = requestAnimationFrame(scanFrame);
          });
        }
      })
      .catch(() => setError('No se pudo acceder a la cámara'));

    return () => { stopStream(); processingRef.current = false; };
  }, [step, scanFrame, stopStream]);

  // ── Photo camera lifecycle ──────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'photos') return;
    setPreview(null);

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
    })
      .then(stream => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; video.play(); }
      })
      .catch(() => setError('No se pudo acceder a la cámara'));

    return () => stopStream();
  }, [step, stopStream]);

  // ── Step 2: Plate ───────────────────────────────────────────────────────────

  const handlePlateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) return;
    setStep('photos');
    setPhotoIndex(0);
    setPhotos({});
  };

  // ── Step 3: Photo capture ───────────────────────────────────────────────────

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const MAX_W = 1280, MAX_H = 960;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, w, h);
    setPreview(canvas.toDataURL('image/jpeg', 0.75));
  };

  const confirmPhoto = () => {
    if (!preview) return;
    const key = PHOTO_KEYS[photoIndex];
    setPhotos(p => ({ ...p, [key]: preview }));
    setPreview(null);
    if (photoIndex < 3) {
      setPhotoIndex(i => i + 1);
    } else {
      stopStream();
      setStep('confirm');
    }
  };

  // ── Step 4: Submit ──────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!scanData) return;
    setSubmitting(true);
    setError('');
    try {
      await api.checkin(token!, scanData.reservationId, {
        plate: plate.toUpperCase(),
        ...photos,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Error al registrar entrada');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('scan');
    setScanData(null);
    setPlate('');
    setPhotos({});
    setPreview(null);
    setError('');
    setSuccess(false);
    setManualToken('');
  };

  // ── UI ──────────────────────────────────────────────────────────────────────

  const stepIndex = ['scan', 'plate', 'photos', 'confirm'].indexOf(step);
  const stepLabels = ['Escanear QR', 'Placas', 'Fotos', 'Confirmar'];

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Escáner QR</h1>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
              i < stepIndex ? 'bg-green-500 text-white' : i === stepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === stepIndex ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── STEP 1: QR scan ── */}
      {step === 'scan' && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-white rounded-lg opacity-60" />
            </div>
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
                Iniciando cámara…
              </div>
            )}
          </div>

          <form onSubmit={e => { e.preventDefault(); if (manualToken.trim()) { processingRef.current = true; handleScan(manualToken.trim()); setManualToken(''); } }} className="flex gap-2">
            <input
              type="text"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Pegar token QR manualmente"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!manualToken.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-blue-700"
            >
              Validar
            </button>
          </form>
        </div>
      )}

      {/* ── STEP 2: Plate ── */}
      {step === 'plate' && scanData && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1">
            <p className="text-green-800 font-semibold text-sm">✅ QR válido — Acceso permitido</p>
            <p className="text-gray-700 text-sm"><span className="font-medium">Usuario:</span> {scanData.userName}</p>
            <p className="text-gray-700 text-sm"><span className="font-medium">Evento:</span> {scanData.eventName}</p>
          </div>
          <form onSubmit={handlePlateSubmit} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Número de placas</span>
              <input
                type="text"
                value={plate}
                onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="Ej: ABC-1234"
                maxLength={20}
                autoFocus
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <button
              type="submit"
              disabled={!plate.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              Continuar →
            </button>
          </form>
        </div>
      )}

      {/* ── STEP 3: Photos ── */}
      {step === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">{PHOTO_LABELS[photoIndex]}</p>
            <span className="text-sm text-gray-500 font-medium">{photoIndex + 1} / 4</span>
          </div>

          <div className="flex gap-1.5">
            {PHOTO_LABELS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < photoIndex ? 'bg-green-500' : i === photoIndex ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
            ))}
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            {preview
              ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
              : <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            }
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {preview ? (
            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Retomar
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                {photoIndex < 3 ? 'Siguiente →' : 'Finalizar'}
              </button>
            </div>
          ) : (
            <button
              onClick={capturePhoto}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              📷 Tomar foto
            </button>
          )}
        </div>
      )}

      {/* ── STEP 4: Confirm ── */}
      {step === 'confirm' && scanData && (
        <div className="space-y-4">
          {success ? (
            <div className="text-center space-y-3 py-8">
              <div className="text-5xl">✅</div>
              <p className="text-xl font-bold text-green-700">Entrada registrada</p>
              <p className="text-gray-500 text-sm">El vehículo fue registrado correctamente.</p>
              <button
                onClick={reset}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Escanear siguiente
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">Usuario:</span> {scanData.userName}</p>
                <p className="text-gray-700"><span className="font-medium">Evento:</span> {scanData.eventName}</p>
                <p className="text-gray-700"><span className="font-medium">Placas:</span>{' '}
                  <span className="font-mono tracking-widest font-semibold">{plate.toUpperCase()}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PHOTO_KEYS.map((key, i) => (
                  <div key={key} className="relative rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
                    {photos[key] && (
                      <img src={photos[key]} alt={PHOTO_LABELS[i]} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                      {PHOTO_LABELS[i]}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-green-700 transition-colors"
              >
                {submitting ? 'Registrando…' : 'Confirmar entrada'}
              </button>

              <button
                onClick={reset}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
