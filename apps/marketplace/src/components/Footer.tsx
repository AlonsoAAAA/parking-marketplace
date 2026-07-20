'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Send, ShieldCheck, Check } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && /\S+@\S+\.\S+/.test(email)) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="bg-[#04210f] text-slate-200 pt-16 pb-8 border-t border-emerald-950">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 max-w-7xl mx-auto">

        {/* Marca */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#DFF085] flex items-center justify-center shadow">
              <span className="font-mono text-[#04210f] font-black text-base">P</span>
            </div>
            <span className="font-sans text-xl font-bold tracking-tight text-white">
              Estaciona<span className="text-[#DFF085]">T</span>
            </span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
            La plataforma líder en reserva de estacionamientos para eventos masivos en México. Tu auto, nuestra prioridad.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#DFF085] font-mono">
            <ShieldCheck className="w-4 h-4 text-[#DFF085]" />
            <span>Pago 100% seguro con Stripe</span>
          </div>
        </div>

        {/* Navegación */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[#DFF085] mb-4">Producto</h4>
            <ul className="space-y-2.5 text-sm text-slate-300 list-none p-0 m-0">
              <li><Link className="hover:text-[#DFF085] transition-colors no-underline" href="/#eventos">Buscar eventos</Link></li>
              <li><Link className="hover:text-[#DFF085] transition-colors no-underline" href="/venues">Venues</Link></li>
              <li><Link className="hover:text-[#DFF085] transition-colors no-underline" href="/mis-boletos">Mis boletos</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[#DFF085] mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-slate-300 list-none p-0 m-0">
              <li><Link className="hover:text-[#DFF085] transition-colors no-underline" href="/terminos">Términos y condiciones</Link></li>
              <li><Link className="hover:text-[#DFF085] transition-colors no-underline" href="/privacidad">Aviso de privacidad</Link></li>
              <li><a className="hover:text-[#DFF085] transition-colors no-underline" href="mailto:soporte@estacionat.mx">soporte@estacionat.mx</a></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="space-y-4">
          <h4 className="font-sans text-xs font-bold uppercase tracking-widest text-[#DFF085]">Suscríbete</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Recibe ofertas exclusivas para asegurar el mejor cajón en tus conciertos favoritos.
          </p>

          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo electrónico"
              className="bg-white/10 border-none rounded-xl text-sm px-4 py-3 w-full focus:ring-2 focus:ring-[#DFF085] text-white placeholder:text-white/40 focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="bg-[#DFF085] text-[#04210f] p-3 rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
            >
              {subscribed ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
          {subscribed && (
            <p className="text-xs text-[#DFF085] font-semibold [animation:fadeIn_.3s_ease_both]">
              ¡Te has suscrito con éxito! Pronto recibirás promociones.
            </p>
          )}
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-white/10 text-center text-xs text-slate-400">
        <p>© 2026 EstacionaT. Todos los derechos reservados. Hecho con <span className="text-rose-500">❤</span> en CDMX.</p>
      </div>
    </footer>
  );
}
