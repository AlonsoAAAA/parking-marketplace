import Link from 'next/link';
import NeoHeader from '@/components/ui/NeoHeader';

export const metadata = {
  title: 'Aviso de Privacidad · Estacionat',
};

export default function PrivacidadPage() {
  return (
    <>
      <style suppressHydrationWarning>{`
        .pp-wrap { min-height:100vh; background:#f8f9fa; font-family:Inter,-apple-system,sans-serif; }
        .pp-body { max-width:720px; margin:0 auto; padding:32px 24px 80px; }
        @media(min-width:640px){ .pp-body { padding:40px 40px 80px; } }
        @media(min-width:1024px){ .pp-body { padding:48px 0 80px; } }
        .pp-kicker { font-size:10px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:#bbb; margin-bottom:10px; }
        .pp-title  { font-size:clamp(22px,4vw,32px); font-weight:700; letter-spacing:-.5px; color:#1a1a1a; line-height:1.15; margin-bottom:6px; }
        .pp-version { font-size:11px; color:#bbb; margin-bottom:36px; }
        .pp-section { background:#fff; border-radius:16px; padding:24px 22px; margin-bottom:10px; }
        .pp-h { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#999; margin-bottom:10px; }
        .pp-p { font-size:13px; color:#444; line-height:1.75; margin-bottom:12px; }
        .pp-p:last-child { margin-bottom:0; }
        .pp-p strong { color:#1a1a1a; }
        .pp-footer { font-size:11px; color:#bbb; text-align:center; margin-top:32px; line-height:1.8; }
      `}</style>

      <div className="pp-wrap">
        <NeoHeader showTickets={false} />

        <div className="pp-body">
          <p className="pp-kicker">Aviso de Privacidad</p>
          <h1 className="pp-title">Aviso de Privacidad</h1>
          <p className="pp-version">Versión 1.0 · Ciudad de México, 2026</p>

          <div className="pp-section">
            <p className="pp-h">Responsable del tratamiento</p>
            <p className="pp-p">
              <strong>Estacionat</strong> (en adelante "el Operador"), con domicilio en Ciudad de México, es responsable del tratamiento de los datos personales que usted proporcione a través de la Plataforma, en términos de la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento.
            </p>
          </div>

          <div className="pp-section">
            <p className="pp-h">Datos personales recabados</p>
            <p className="pp-p">
              Para la prestación del servicio de reserva de estacionamiento, el Operador recaba los siguientes datos personales:
            </p>
            <p className="pp-p">
              <strong>Datos de identificación y contacto:</strong> nombre completo, número de teléfono celular (WhatsApp).
            </p>
            <p className="pp-p">
              <strong>Datos del vehículo:</strong> placas, marca, modelo y color del vehículo registrado en la Reserva.
            </p>
            <p className="pp-p">
              <strong>Datos de pago:</strong> la transacción es procesada por el proveedor de pagos Stripe, Inc. El Operador no almacena datos de tarjeta bancaria.
            </p>
          </div>

          <div className="pp-section">
            <p className="pp-h">Finalidades del tratamiento</p>
            <p className="pp-p"><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
            <p className="pp-p">
              — Crear y gestionar la cuenta del Usuario en la Plataforma.<br />
              — Procesar la Reserva y el pago correspondiente.<br />
              — Generar y enviar el Código QR de acceso al estacionamiento.<br />
              — Verificar la identidad del Usuario ante el operador del predio.<br />
              — Atender reclamaciones, aclaraciones y solicitudes relacionadas con el servicio.
            </p>
            <p className="pp-p"><strong>Finalidades secundarias (opcionales):</strong></p>
            <p className="pp-p">
              — Envío de comunicaciones sobre eventos, promociones o servicios relacionados.<br />
              Puede oponerse a estas finalidades enviando un mensaje a través de la Plataforma.
            </p>
          </div>

          <div className="pp-section">
            <p className="pp-h">Transferencia de datos</p>
            <p className="pp-p">
              Sus datos podrán ser compartidos con el <strong>operador físico del estacionamiento</strong> únicamente para fines de control de acceso y verificación de la Reserva. Dicha transferencia es necesaria para la prestación del servicio y no requiere su consentimiento en términos del artículo 37 de la LFPDPPP.
            </p>
            <p className="pp-p">
              No se realizarán transferencias a terceros ajenos al servicio sin su consentimiento expreso, salvo las excepciones previstas en la Ley.
            </p>
          </div>

          <div className="pp-section">
            <p className="pp-h">Derechos ARCO</p>
            <p className="pp-p">
              Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO), así como a revocar el consentimiento otorgado. Para ejercer estos derechos, envíe su solicitud a través de la sección de soporte en la Plataforma, indicando: nombre completo, número de teléfono registrado y descripción del derecho que desea ejercer.
            </p>
            <p className="pp-p">
              El Operador responderá en un plazo máximo de <strong>20 días hábiles</strong> a partir de la recepción de su solicitud.
            </p>
          </div>

          <div className="pp-section">
            <p className="pp-h">Seguridad y conservación</p>
            <p className="pp-p">
              El Operador implementa medidas de seguridad administrativas, técnicas y físicas para proteger sus datos personales contra daño, pérdida, alteración, destrucción o uso no autorizado.
            </p>
            <p className="pp-p">
              Los datos serán conservados durante el tiempo necesario para cumplir las finalidades descritas y las obligaciones legales aplicables.
            </p>
          </div>

          <div className="pp-section">
            <p className="pp-h">Cambios al aviso de privacidad</p>
            <p className="pp-p">
              El Operador se reserva el derecho de modificar el presente Aviso de Privacidad. Cualquier cambio será notificado a través de la Plataforma. El uso continuo del servicio después de dichas modificaciones constituye la aceptación de las mismas.
            </p>
          </div>

          <p className="pp-footer">
            Versión 1.0 · Ciudad de México, 2026<br />
            En términos de la LFPDPPP y su Reglamento
          </p>
        </div>
      </div>
    </>
  );
}
