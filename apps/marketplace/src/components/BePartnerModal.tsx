'use client';
import { useState } from 'react';
import { X, Store, CheckCircle, ShieldAlert } from 'lucide-react';

interface BePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#04210f] focus:outline-none transition-all';
const labelCls = 'block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-1';

export default function BePartnerModal({ isOpen, onClose }: BePartnerModalProps) {
  const [ownerName, setOwnerName] = useState('');
  const [parkingName, setParkingName] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState<number>(20);
  const [pricePerHour, setPricePerHour] = useState<number>(40);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!ownerName.trim()) newErrors.ownerName = 'Tu nombre es requerido.';
    if (!parkingName.trim()) newErrors.parkingName = 'El nombre del estacionamiento es requerido.';
    if (!address.trim()) newErrors.address = 'La dirección exacta es requerida.';
    if (capacity <= 0) newErrors.capacity = 'Ingresa una capacidad válida.';
    if (pricePerHour <= 0) newErrors.pricePerHour = 'Ingresa un precio válido.';
    if (!email.trim()) newErrors.email = 'El correo de contacto es requerido.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Ingresa un correo válido.';
    if (!phone.trim()) newErrors.phone = 'El teléfono es requerido.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const subject = encodeURIComponent(`Quiero ser socio — ${parkingName}`);
    const body = encodeURIComponent(
      `Nombre: ${ownerName}\nEstacionamiento: ${parkingName}\nDirección: ${address}\n` +
      `Cajones disponibles: ${capacity}\nTarifa por hora: $${pricePerHour}\n` +
      `Correo: ${email}\nTeléfono: ${phone}`,
    );
    window.location.href = `mailto:soporte@estacionat.mx?subject=${subject}&body=${body}`;
    setIsSuccess(true);
  };

  const handleClose = () => {
    setIsSuccess(false);
    setOwnerName(''); setParkingName(''); setAddress('');
    setCapacity(20); setPricePerHour(40); setEmail(''); setPhone('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={handleClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm [animation:fadeIn_.2s_ease_both]" />
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-md w-full border border-slate-100 flex flex-col max-h-[90vh] [animation:fadeUp_.25s_ease_both]">
          <div className="bg-[#04210f] text-white p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#DFF085]" />
              <span className="bg-[#DFF085] text-brand-dark text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Socio EstacionaT
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight mt-3">Suma tu estacionamiento</h2>
            <p className="text-slate-300 text-xs mt-1">
              Únete a la red más grande de reservas de estacionamiento para eventos en CDMX.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isSuccess ? (
              <div className="text-center py-8 space-y-4 [animation:fadeIn_.3s_ease_both]">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">¡Postulación lista para enviar!</h3>
                <p className="text-slate-600 text-sm max-w-sm mx-auto leading-relaxed">
                  Se abrió tu cliente de correo con los datos de <strong>{parkingName}</strong> prellenados.
                  Envía el correo y te contactaremos en menos de 24 horas para validar documentos y activar tu espacio.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 w-full bg-[#04210f] text-white py-3 rounded-xl font-bold hover:bg-[#12361d] transition-colors cursor-pointer text-sm"
                >
                  Entendido, cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>Tu Nombre Completo *</label>
                  <input type="text" placeholder="Ej: Juan Pérez" value={ownerName} onChange={e => setOwnerName(e.target.value)} className={inputCls} />
                  {errors.ownerName && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.ownerName}</p>}
                </div>

                <div>
                  <label className={labelCls}>Nombre del Estacionamiento *</label>
                  <input type="text" placeholder="Ej: Estacionamiento San Ángel" value={parkingName} onChange={e => setParkingName(e.target.value)} className={inputCls} />
                  {errors.parkingName && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.parkingName}</p>}
                </div>

                <div>
                  <label className={labelCls}>Dirección del Estacionamiento *</label>
                  <textarea rows={2} placeholder="Ej: Av. Revolución 1420, Guadalupe Inn, CDMX" value={address} onChange={e => setAddress(e.target.value)} className={`${inputCls} resize-none`} />
                  {errors.address && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Cajones Disponibles *</label>
                    <input type="number" min={5} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 0)} className={inputCls} />
                    {errors.capacity && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.capacity}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Tarifa por Hora ($) *</label>
                    <input type="number" min={10} value={pricePerHour} onChange={e => setPricePerHour(parseInt(e.target.value) || 0)} className={inputCls} />
                    {errors.pricePerHour && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.pricePerHour}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Correo *</label>
                    <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                    {errors.email && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.email}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono / Celular *</label>
                    <input type="tel" placeholder="55-1234-5678" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
                    {errors.phone && <p className="text-red-600 text-xs mt-1 font-semibold">{errors.phone}</p>}
                  </div>
                </div>

                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex items-start gap-2 text-xs text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="m-0">Para operar en EstacionaT, requerirás copia de INE, RFC y comprobante de propiedad/arrendamiento.</p>
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-[#04210f] text-[#DFF085] hover:bg-[#12361d] font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer">
                    Enviar Postulación
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
