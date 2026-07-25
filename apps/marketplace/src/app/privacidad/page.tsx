import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Aviso de Privacidad · Estacionat',
};

const SECTION = 'bg-white border border-slate-100 rounded-2xl shadow-sm p-5 md:p-6 mb-4';
const H = 'text-[11px] font-mono font-bold uppercase tracking-[2px] text-brand-dark bg-[#DFF085] inline-block px-3 py-1 rounded-full mb-4';
const P = 'text-[13px] text-slate-700 leading-[1.75] mb-3 last:mb-0';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar showExplore={false} />

      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-20 flex-grow w-full">
        <p className="text-[10px] font-mono font-bold tracking-[3px] uppercase text-slate-400 mb-3">Aviso de Privacidad</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight leading-tight mb-2">
          Aviso de Privacidad
        </h1>
        <p className="font-mono text-[11px] font-bold text-slate-400 mb-9">Versión 1.0 · Ciudad de México, 2026</p>

        <div className={SECTION}>
          <p className={H}>Responsable del tratamiento</p>
          <p className={P}>
            <strong>Estacionat</strong> (en adelante "el Operador"), con domicilio en Ciudad de México, es responsable del tratamiento de los datos personales que usted proporcione a través de la Plataforma, en términos de la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento.
          </p>
        </div>

        <div className={SECTION}>
          <p className={H}>Datos personales recabados</p>
          <p className={P}>
            Para la prestación del servicio de reserva de estacionamiento, el Operador recaba los siguientes datos personales:
          </p>
          <p className={P}>
            <strong>Datos de identificación y contacto:</strong> nombre completo, número de teléfono celular (WhatsApp).
          </p>
          <p className={P}>
            <strong>Datos del vehículo:</strong> placas, marca, modelo y color del vehículo registrado en la Reserva.
          </p>
          <p className={P}>
            <strong>Datos de pago:</strong> la transacción es procesada por el proveedor de pagos Stripe, Inc. El Operador no almacena datos de tarjeta bancaria.
          </p>
        </div>

        <div className={SECTION}>
          <p className={H}>Finalidades del tratamiento</p>
          <p className={P}><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
          <p className={P}>
            — Crear y gestionar la cuenta del Usuario en la Plataforma.<br />
            — Procesar la Reserva y el pago correspondiente.<br />
            — Generar y enviar el Código QR de acceso al estacionamiento.<br />
            — Verificar la identidad del Usuario ante el operador del predio.<br />
            — Atender reclamaciones, aclaraciones y solicitudes relacionadas con el servicio.
          </p>
          <p className={P}><strong>Finalidades secundarias (opcionales):</strong></p>
          <p className={P}>
            — Envío de comunicaciones sobre eventos, promociones o servicios relacionados.<br />
            Puede oponerse a estas finalidades enviando un mensaje a través de la Plataforma.
          </p>
        </div>

        <div className={SECTION}>
          <p className={H}>Transferencia de datos</p>
          <p className={P}>
            Sus datos podrán ser compartidos con el <strong>operador físico del estacionamiento</strong> únicamente para fines de control de acceso y verificación de la Reserva. Dicha transferencia es necesaria para la prestación del servicio y no requiere su consentimiento en términos del artículo 37 de la LFPDPPP.
          </p>
          <p className={P}>
            No se realizarán transferencias a terceros ajenos al servicio sin su consentimiento expreso, salvo las excepciones previstas en la Ley.
          </p>
        </div>

        <div className={SECTION}>
          <p className={H}>Derechos ARCO</p>
          <p className={P}>
            Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO), así como a revocar el consentimiento otorgado. Para ejercer estos derechos, envíe su solicitud a través de la sección de soporte en la Plataforma, indicando: nombre completo, número de teléfono registrado y descripción del derecho que desea ejercer.
          </p>
          <p className={P}>
            El Operador responderá en un plazo máximo de <strong>20 días hábiles</strong> a partir de la recepción de su solicitud.
          </p>
        </div>

        <div className={SECTION}>
          <p className={H}>Seguridad y conservación</p>
          <p className={P}>
            El Operador implementa medidas de seguridad administrativas, técnicas y físicas para proteger sus datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado.
          </p>
          <p className={P}>
            Los datos serán conservados durante el tiempo necesario para cumplir las finalidades descritas y las obligaciones legales aplicables.
          </p>
        </div>

        <div className={SECTION}>
          <p className={H}>Cambios al aviso de privacidad</p>
          <p className={P}>
            El Operador se reserva el derecho de modificar el presente Aviso de Privacidad. Cualquier cambio será notificado a través de la Plataforma. El uso continuo del servicio después de dichas modificaciones constituye la aceptación de las mismas.
          </p>
        </div>

        <p className="font-mono text-[11px] font-bold text-slate-400 text-center mt-8 leading-[1.8]">
          Versión 1.0 · Ciudad de México, 2026<br />
          En términos de la LFPDPPP y su Reglamento
        </p>
      </main>

      <Footer />
    </div>
  );
}
