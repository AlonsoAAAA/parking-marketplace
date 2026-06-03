import Link from 'next/link';
import { SHARED_CSS } from '@/lib/design';

export const metadata = {
  title: 'Términos y Condiciones · ParkMX',
};

export default function TerminosPage() {
  return (
    <>
      <style suppressHydrationWarning>{SHARED_CSS + `
        .tc-wrap { min-height:100vh; background:#EDEDED; font-family:Inter,-apple-system,sans-serif; }
        .tc-body { max-width:720px; margin:0 auto; padding:32px 24px 80px; }
        @media(min-width:640px){ .tc-body { padding:40px 40px 80px; } }
        @media(min-width:1024px){ .tc-body { padding:48px 0 80px; } }

        .tc-kicker { font-size:10px; font-weight:600; letter-spacing:3px; text-transform:uppercase;
          color:#bbb; margin-bottom:10px; }
        .tc-title { font-size:clamp(22px,4vw,32px); font-weight:700; letter-spacing:-.5px;
          color:#1a1a1a; line-height:1.15; margin-bottom:6px; }
        .tc-version { font-size:11px; color:#bbb; margin-bottom:36px; }

        .tc-alert { background:#fff8f0; border-left:3px solid #f59e0b; border-radius:0 12px 12px 0;
          padding:16px 18px; margin-bottom:28px; }
        .tc-alert-t { font-size:13px; font-weight:700; color:#92400e; margin-bottom:4px; }
        .tc-alert-b { font-size:12px; color:#b45309; line-height:1.6; }

        .tc-table { width:100%; border-collapse:collapse; margin:16px 0 8px; font-size:12px; }
        .tc-table th { background:#1a1a1a; color:#fff; padding:10px 14px; text-align:left;
          font-size:10px; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
        .tc-table td { padding:10px 14px; border-bottom:1px solid rgba(0,0,0,.07); color:#444;
          line-height:1.5; }
        .tc-table tr:last-child td { border-bottom:none; }
        .tc-table tr:nth-child(even) td { background:#f9f9f9; }
        .tc-table .no-refund { color:#991b1b; font-weight:700; }

        .tc-section { background:#fff; border-radius:16px; padding:24px 22px;
          margin-bottom:10px; }
        .tc-clause { font-size:13px; color:#1a1a1a; line-height:1.75; margin-bottom:14px; }
        .tc-clause:last-child { margin-bottom:0; }
        .tc-clause strong { color:#1a1a1a; }
        .tc-num { font-weight:700; color:#1a1a1a; margin-right:2px; }
        .tc-caps { background:#fff0f0; border:1px solid #fecaca; border-radius:10px;
          padding:14px 16px; margin-bottom:14px; font-size:12px; font-weight:600;
          color:#991b1b; line-height:1.65; letter-spacing:.1px; }

        .tc-footer { font-size:11px; color:#bbb; text-align:center; margin-top:32px;
          line-height:1.8; }
        .tc-closing { background:#fff; border-radius:16px; padding:20px 22px;
          margin-bottom:10px; border-left:4px solid #1a1a1a; }
        .tc-closing p { font-size:13px; color:#1a1a1a; font-weight:600; line-height:1.7; }
      `}</style>

      <div className="tc-wrap">
        <header className="pm-header">
          <Link href="/" className="pm-logo">Park<span>MX</span></Link>
          <Link href="/" className="pm-nav-link">← Inicio</Link>
        </header>

        <div className="tc-body">
          <p className="tc-kicker">Contrato de Adhesión · v1.0</p>
          <h1 className="tc-title">Términos y Condiciones del Servicio de Reserva de Estacionamiento</h1>
          <p className="tc-version">Versión 1.0 · Ciudad de México, 2026</p>

          {/* Cláusula 4 - Destacada */}
          <div className="tc-alert">
            <div className="tc-alert-t">⚠️ Política de cancelaciones</div>
            <div className="tc-alert-b">
              NO SE ACEPTAN CANCELACIONES NI DEVOLUCIONES DENTRO DE LAS 6 HORAS PREVIAS AL INICIO DEL EVENTO.
              Transcurrido dicho plazo, el pago es definitivo e irrevocable.
            </div>
          </div>

          {/* Tabla de reembolsos */}
          <div className="tc-section">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Anticipación a la cancelación</th>
                  <th>Reembolso</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Más de 48 horas antes del evento</td>
                  <td>100% menos cargo de procesamiento (máx. 3.5%)</td>
                </tr>
                <tr>
                  <td>Entre 24 y 48 horas antes del evento</td>
                  <td>70% del precio pagado</td>
                </tr>
                <tr>
                  <td>Entre 6 y 24 horas antes del evento</td>
                  <td>50% del precio pagado</td>
                </tr>
                <tr>
                  <td>Menos de 6 horas antes del evento</td>
                  <td className="no-refund">Sin reembolso — Reserva definitiva</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cláusulas */}
          <div className="tc-section">
            <p className="tc-clause">
              <span className="tc-num">1.</span> La aceptación del presente contrato de adhesión —mediante el proceso de reserva en la Plataforma— significa el pleno conocimiento y la conformidad con las condiciones aquí descritas.
            </p>
            <p className="tc-clause">
              <span className="tc-num">2.</span> El acceso al estacionamiento se realiza exclusivamente mediante el Código QR generado al confirmar el pago, el cual es <strong>personal e intransferible</strong> y ampara únicamente el vehículo registrado en la Reserva. En caso de extravío del Código QR, el Usuario deberá acreditar su identidad y la propiedad o tenencia legal del vehículo ante el personal del Operador.
            </p>
            <p className="tc-clause">
              <span className="tc-num">3.</span> El Usuario es el <strong>único responsable</strong> de capturar correctamente: venue, evento, estacionamiento, datos del vehículo (placas, marca, modelo y color) y nombre del comprador o propietario. Los errores en la información registrada no generan derecho a cambio ni a reembolso.
            </p>
            <p className="tc-clause">
              <span className="tc-num">5.</span> El Usuario declara <strong>bajo protesta de decir verdad</strong>: (a) que el vehículo es de su propiedad o cuenta con autorización expresa del propietario; (b) que no se encuentra robado, reportado, ni con placas alteradas o vencidas; (c) que no está involucrado en situación jurídica irregular alguna; (d) que los fondos del pago son de origen lícito; y (e) que el servicio será utilizado exclusivamente para el resguardo temporal del vehículo registrado. La falsedad en cualquiera de estas declaraciones faculta al Operador para negar el acceso sin reembolso y ejercer las acciones legales correspondientes.
            </p>
            <p className="tc-clause">
              <span className="tc-num">6.</span> La Plataforma presta un <strong>servicio de intermediación y reserva digital</strong> y no es prestadora del servicio físico de estacionamiento. La operación del predio, el control de acceso y la custodia del vehículo en sitio son responsabilidad del operador del estacionamiento registrado en la Plataforma, no del Operador digital. El Operador responde únicamente por la correcta gestión del servicio digital: procesamiento del pago, generación del Código QR y envío de la confirmación al Usuario. Cualquier incidencia física ocurrida dentro del predio —daños, accidentes, robos u otras— es responsabilidad del operador del establecimiento y no del Operador de la Plataforma. La celebración del presente contrato no implica asociación ni relación laboral entre el Operador de la Plataforma y el operador del estacionamiento físico.
            </p>
          </div>

          <div className="tc-section">
            <div className="tc-caps">
              7. EL OPERADOR NO SERÁ RESPONSABLE POR: (a) objetos olvidados o dejados al interior del vehículo, tales como electrónicos, ropa, documentos, valores u otros bienes personales; (b) actos de vandalismo, grafiti o daños causados por terceros ajenos al personal del Operador; (c) fenómenos naturales (granizo, sismo, inundación, rayos, viento u otros); (d) casos extraordinarios fuera del control del Operador (disturbios, manifestaciones, actos de autoridad, emergencias sanitarias, cortes eléctricos); (e) incendio motivado por deficiencia eléctrica, falla de carburador u otra causa interna del vehículo; (f) daños mecánicos, eléctricos o de carrocería preexistentes o por desgaste del vehículo; (g) daños causados por falla mecánica del propio vehículo durante maniobras de ingreso o salida.
            </div>
            <p className="tc-clause">
              <span className="tc-num">8.</span> La responsabilidad del Operador sobre el vehículo concluye al término del Evento o al cierre del operativo del establecimiento, lo que ocurra primero. Los vehículos no recogidos serán reportados al administrador del predio; a partir de ese momento, la custodia y los gastos derivados son de exclusiva responsabilidad del Usuario.
            </p>
            <p className="tc-clause">
              <span className="tc-num">9.</span> Cualquier reclamación por daños al vehículo deberá presentarse <strong>antes de que el vehículo abandone el predio</strong> y en presencia del personal del Operador. Una vez retirado el vehículo a entera satisfacción del Usuario, <strong>no se acepta reclamación alguna</strong>.
            </p>
            <p className="tc-clause">
              <span className="tc-num">10.</span> El servicio prestado constituye una administración y organización de estacionamiento y <strong>no un contrato de depósito mercantil</strong> en términos del Código de Comercio. La responsabilidad del Operador se limita en todo caso al monto pagado por la Reserva correspondiente.
            </p>
            <p className="tc-clause">
              <span className="tc-num">11.</span> En caso de controversia, las partes se reconocen como competentes a la Procuraduría Federal del Consumidor (PROFECO) para la conciliación y, en su caso, a los Tribunales del Fuero Común de la Ciudad de México, renunciando a cualquier otro fuero.
            </p>
            <p className="tc-clause">
              <span className="tc-num">12.</span> El Operador no garantiza la operación ininterrumpida de la Plataforma. Las fallas técnicas, interrupciones del servicio digital, errores de conectividad o cualquier incidencia ajena al control operativo directo del Operador <strong>no generan responsabilidad adicional a cargo del Operador ni constituyen incumplimiento del presente contrato</strong>. Ante cualquier incidencia de este tipo, el Operador implementará las medidas operativas que estime pertinentes a su exclusivo criterio. <strong>Toda reclamación derivada de este supuesto deberá estar respaldada por evidencia documental fehaciente</strong> (captura de pantalla con marca de tiempo, video o fotografía que acredite la falla en el momento del intento de acceso). Sin dicha evidencia, no procede reclamación alguna.
            </p>
            <p className="tc-clause">
              <span className="tc-num">13.</span> La disponibilidad de cajones está sujeta a la capacidad física real del predio en el momento del Evento. En caso de discrepancia entre el aforo registrado en la Plataforma y la disponibilidad operativa al momento de la operación, el Operador determinará la solución operativa aplicable <strong>a su criterio razonable</strong>, sin que ello genere obligación de indemnización alguna más allá de lo expresamente pactado en el presente instrumento. <strong>Cualquier reclamación por este concepto deberá acreditarse mediante evidencia documental fehaciente</strong> (fotografía o video que constate la negativa de acceso o la ausencia de cajones disponibles al momento del Evento, con fecha y hora visibles). La ausencia de dicha evidencia extingue cualquier derecho de reclamación.
            </p>
            <p className="tc-clause">
              <span className="tc-num">14.</span> Los datos proporcionados por el Usuario serán tratados conforme al <Link href="/privacidad" style={{ color: '#1a1a1a', textDecoration: 'underline' }}>Aviso de Privacidad</Link> del Operador, en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
            </p>
          </div>

          <div className="tc-closing">
            <p>De no estar de acuerdo con las cláusulas anteriores, el Usuario deberá abstenerse de realizar la Reserva y solicitar la cancelación antes de confirmar el pago. Una vez recibido el vehículo a su entera satisfacción, no se acepta reclamación alguna.</p>
          </div>

          <p className="tc-footer">
            Versión 1.0 · Ciudad de México, 2026<br />
            Sujeto a revisión legal periódica · Para uso en plataforma digital de reservas de estacionamiento
          </p>
        </div>
      </div>
    </>
  );
}
