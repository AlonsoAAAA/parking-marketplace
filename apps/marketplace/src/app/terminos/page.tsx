import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Términos y Condiciones · Estacionat',
};

const CLAUSE = 'text-[13px] text-slate-700 leading-[1.75] mb-4 last:mb-0';
const NUM = 'font-bold text-brand-dark mr-0.5';
const SECTION = 'bg-white border border-slate-100 rounded-2xl shadow-sm p-5 md:p-6 mb-4';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar showExplore={false} />

      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-28 pb-20 flex-grow w-full">
        <p className="text-[10px] font-mono font-bold tracking-[3px] uppercase text-slate-400 mb-3">Contrato de Adhesión · v1.0</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight leading-tight mb-2">
          Términos y Condiciones del Servicio de Reserva de Estacionamiento
        </h1>
        <p className="font-mono text-[11px] font-bold text-slate-400 mb-9">Versión 1.0 · Ciudad de México, 2026</p>

        {/* Cláusula 4 - Destacada */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 mb-6">
          <div className="text-[12px] font-extrabold uppercase tracking-wider text-amber-950 mb-1.5">⚠️ Política de cancelaciones</div>
          <div className="text-xs font-semibold text-amber-800 leading-relaxed">
            NO SE ACEPTAN CANCELACIONES NI DEVOLUCIONES DENTRO DE LAS 24 HORAS PREVIAS AL INICIO DEL EVENTO.
            Transcurrido dicho plazo, el pago es definitivo e irrevocable.
          </div>
        </div>

        {/* Tabla de reembolsos */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="bg-[#04210f] text-[#DFF085] px-4 py-3 text-left font-mono font-bold text-[10px] uppercase tracking-widest">Anticipación a la cancelación</th>
                  <th className="bg-[#04210f] text-[#DFF085] px-4 py-3 text-left font-mono font-bold text-[10px] uppercase tracking-widest">Reembolso</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">Más de 48 horas antes del evento</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">100% del precio pagado</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">Entre 36 y 48 horas antes del evento</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">70% del precio pagado</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">Entre 24 y 36 horas antes del evento</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">50% del precio pagado</td>
                </tr>
                <tr className="bg-rose-50">
                  <td className="px-4 py-3 font-semibold text-slate-700 leading-relaxed">Menos de 24 horas antes del evento</td>
                  <td className="px-4 py-3 font-extrabold text-rose-700 leading-relaxed">Sin reembolso — Reserva definitiva</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cláusulas */}
        <div className={SECTION}>
          <p className={CLAUSE}>
            <span className={NUM}>1.</span> La aceptación del presente contrato de adhesión —mediante el proceso de reserva en la Plataforma— significa el pleno conocimiento y la conformidad con las condiciones aquí descritas.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>2.</span> El acceso al estacionamiento se realiza exclusivamente mediante el Código QR generado al confirmar el pago, el cual es <strong>personal e intransferible</strong> y ampara únicamente el vehículo registrado en la Reserva. En caso de extravío del Código QR, el Usuario deberá acreditar su identidad y la propiedad o tenencia legal del vehículo ante el personal del Operador.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>3.</span> El Usuario es el <strong>único responsable</strong> de capturar correctamente: venue, evento, estacionamiento, datos del vehículo (placas, marca, modelo y color) y nombre del comprador o propietario. Los errores en la información registrada no generan derecho a cambio ni a reembolso.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>5.</span> El Usuario declara <strong>bajo protesta de decir verdad</strong>: (a) que el vehículo es de su propiedad o cuenta con autorización expresa del propietario; (b) que no se encuentra robado, reportado, ni con placas alteradas o vencidas; (c) que no está involucrado en situación jurídica irregular alguna; (d) que los fondos del pago son de origen lícito; y (e) que el servicio será utilizado exclusivamente para el resguardo temporal del vehículo registrado. La falsedad en cualquiera de estas declaraciones faculta al Operador para negar el acceso sin reembolso y ejercer las acciones legales correspondientes.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>6.</span> La Plataforma presta un <strong>servicio de intermediación y reserva digital</strong> y no es prestadora del servicio físico de estacionamiento. La operación del predio, el control de acceso y la custodia del vehículo en sitio son responsabilidad del operador del estacionamiento registrado en la Plataforma, no del Operador digital. El Operador responde únicamente por la correcta gestión del servicio digital: procesamiento del pago, generación del Código QR y envío de la confirmación al Usuario. Cualquier incidencia física ocurrida dentro del predio —daños, accidentes, robos u otras— es responsabilidad del operador del establecimiento y no del Operador de la Plataforma. La celebración del presente contrato no implica asociación ni relación laboral entre el Operador de la Plataforma y el operador del estacionamiento físico.
          </p>
        </div>

        <div className={SECTION}>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4 text-xs font-semibold text-rose-800 leading-[1.65]">
            7. EL OPERADOR NO SERÁ RESPONSABLE POR: (a) objetos olvidados o dejados al interior del vehículo, tales como electrónicos, ropa, documentos, valores u otros bienes personales; (b) actos de vandalismo, grafiti o daños causados por terceros ajenos al personal del Operador; (c) fenómenos naturales (granizo, sismo, inundación, rayos, viento u otros); (d) casos extraordinarios fuera del control del Operador (disturbios, manifestaciones, actos de autoridad, emergencias sanitarias, cortes eléctricos); (e) incendio motivado por deficiencia eléctrica, falla de carburador u otra causa interna del vehículo; (f) daños mecánicos, eléctricos o de carrocería preexistentes o por desgaste del vehículo; (g) daños causados por falla mecánica del propio vehículo durante maniobras de ingreso o salida.
          </div>
          <p className={CLAUSE}>
            <span className={NUM}>8.</span> La responsabilidad del Operador sobre el vehículo concluye al término del Evento o al cierre del operativo del establecimiento, lo que ocurra primero. Los vehículos no recogidos serán reportados al administrador del predio; a partir de ese momento, la custodia y los gastos derivados son de exclusiva responsabilidad del Usuario.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>9.</span> Cualquier reclamación por daños al vehículo deberá presentarse <strong>antes de que el vehículo abandone el predio</strong> y en presencia del personal del Operador. Una vez retirado el vehículo a entera satisfacción del Usuario, <strong>no se acepta reclamación alguna</strong>.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>10.</span> El servicio prestado constituye una administración y organización de estacionamiento y <strong>no un contrato de depósito mercantil</strong> en términos del Código de Comercio. La responsabilidad del Operador se limita en todo caso al monto pagado por la Reserva correspondiente.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>11.</span> En caso de controversia, las partes se reconocen como competentes a la Procuraduría Federal del Consumidor (PROFECO) para la conciliación y, en su caso, a los Tribunales del Fuero Común de la Ciudad de México, renunciando a cualquier otro fuero.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>12.</span> El Operador no garantiza la operación ininterrumpida de la Plataforma. Las fallas técnicas, interrupciones del servicio digital, errores de conectividad o cualquier incidencia ajena al control operativo directo del Operador <strong>no generan responsabilidad adicional a cargo del Operador ni constituyen incumplimiento del presente contrato</strong>. Ante cualquier incidencia de este tipo, el Operador implementará las medidas operativas que estime pertinentes a su exclusivo criterio. <strong>Toda reclamación derivada de este supuesto deberá estar respaldada por evidencia documental fehaciente</strong> (captura de pantalla con marca de tiempo, video o fotografía que acredite la falla en el momento del intento de acceso). Sin dicha evidencia, no procede reclamación alguna.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>13.</span> La disponibilidad de cajones está sujeta a la capacidad física real del predio en el momento del Evento. En caso de discrepancia entre el aforo registrado en la Plataforma y la disponibilidad operativa al momento de la operación, el Operador determinará la solución operativa aplicable <strong>a su criterio razonable</strong>, sin que ello genere obligación de indemnización alguna más allá de lo expresamente pactado en el presente instrumento. <strong>Cualquier reclamación por este concepto deberá acreditarse mediante evidencia documental fehaciente</strong> (fotografía o video que constate la negativa de acceso o la ausencia de cajones disponibles al momento del Evento, con fecha y hora visibles). La ausencia de dicha evidencia extingue cualquier derecho de reclamación.
          </p>
          <p className={CLAUSE}>
            <span className={NUM}>14.</span> Los datos proporcionados por el Usuario serán tratados conforme al <Link href="/privacidad" className="text-[#383497] underline font-bold">Aviso de Privacidad</Link> del Operador, en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
          </p>
        </div>

        <div className="bg-[#F0F5F1] border border-[#E0EAE2] rounded-2xl p-5 mb-4">
          <p className="text-[13px] font-bold text-emerald-950 leading-[1.7] m-0">
            De no estar de acuerdo con las cláusulas anteriores, el Usuario deberá abstenerse de realizar la Reserva y solicitar la cancelación antes de confirmar el pago. Una vez recibido el vehículo a su entera satisfacción, no se acepta reclamación alguna.
          </p>
        </div>

        <p className="font-mono text-[11px] font-bold text-slate-400 text-center mt-8 leading-[1.8]">
          Versión 1.0 · Ciudad de México, 2026<br />
          Sujeto a revisión legal periódica · Para uso en plataforma digital de reservas de estacionamiento
        </p>
      </main>

      <Footer />
    </div>
  );
}
