import Link from 'next/link';
import { LegalLayout, LegalSection, LegalList, LegalCallout, LegalHighlight, LegalTable } from '@tad/ui';

export default function TerminosDeServicio() {
  return (
    <LegalLayout
      title="Términos de Servicio"
      subtitle="Las reglas y condiciones que rigen el uso de la plataforma TAD DOOH."
      lastUpdated="2026-09-05"
      lastUpdatedDisplay="5 de septiembre de 2026"
      basePath=""
    >
      <LegalSection id="aceptacion" title="1. Aceptación de los términos">
        <p>
          Al acceder o utilizar la plataforma TAD DOOH (en adelante, la "Plataforma") operada por
          <LegalHighlight> TAD Taxi Advertising S.R.L.</LegalHighlight> (en adelante, "TAD", "nosotros" o
          "nuestro"), una sociedad comercial organizada bajo las leyes de la República Dominicana con
          domicilio en Santo Domingo, RNC [Tu-RNC], usted ("Usuario", "usted" o "su") acepta estar legalmente
          obligado por estos Términos de Servicio.
        </p>
        <p>
          Si no está de acuerdo con alguno de estos términos, le pedimos que se abstenga de utilizar
          la Plataforma. El uso continuado de cualquier parte de la Plataforma constituye su aceptación
          de estos términos.
        </p>
      </LegalSection>

      <LegalSection id="servicio" title="2. Descripción del servicio">
        <p>
          TAD DOOH es una plataforma de publicidad digital out-of-home (DOOH) que opera una red de pantallas
          digitales instaladas en taxis y vehículos comerciales en República Dominicana.
        </p>
        <h3>2.1. Servicios para Anunciantes</h3>
        <LegalList
          items={[
            'Crear, gestionar y monitorear campañas publicitarias en la red de pantallas.',
            'Acceder a reportes de impresiones, alcance, frecuencia y métricas de rendimiento.',
            'Subir creatividades (videos, imágenes, animaciones) en formatos soportados.',
            'Configurar segmentaciones geográficas, temporales y demográficas.',
            'Gestionar facturación, pagos y facturación fiscal.',
          ]}
        />
        <h3>2.2. Servicios para Conductores</h3>
        <LegalList
          items={[
            'Registrarse como operador de vehículo en la red TAD.',
            'Recibir compensaciones por las impresiones publicitarias servidas en su vehículo.',
            'Acceder a dashboards de ganancias,里程 y horarios.',
            'Gestionar perfil, vehículo y datos bancarios para pagos.',
          ]}
        />
        <h3>2.3. Servicios para Administradores</h3>
        <LegalList
          items={[
            'Gestionar la operación general de la red.',
            'Aprobar campañas, conductores y vehículos.',
            'Acceder a reportes ejecutivos y analítica de negocio.',
          ]}
        />
      </LegalSection>

      <LegalSection id="cuenta" title="3. Registro y cuenta de usuario">
        <h3>3.1. Elegibilidad</h3>
        <p>
          Para utilizar la Plataforma debe ser mayor de 18 años, tener capacidad legal para celebrar
          contratos, y en el caso de empresas, estar debidamente constituida conforme a las leyes de
          República Dominicana o del país de origen del Usuario.
        </p>
        <h3>3.2. Registro</h3>
        <p>Para acceder a ciertas funcionalidades, debe crear una cuenta proporcionando:</p>
        <LegalList
          items={[
            'Información de identificación verdadera, precisa, actual y completa.',
            'Para empresas: RNC/RTN, documentos de constitución, representación legal válida.',
            'Para conductores: cédula de identidad, licencia de conducir vigente, documentos del vehículo.',
            'Una dirección de correo electrónico válida y un número de teléfono accesible.',
          ]}
        />
        <h3>3.3. Verificación</h3>
        <p>
          TAD se reserva el derecho de verificar la identidad de los Usuarios en cualquier momento,
          solicitando documentación adicional o realizando verificaciones biométricas o de terceros.
          La aprobación de una cuenta está sujeta a esta verificación.
        </p>
        <h3>3.4. Seguridad de la cuenta</h3>
        <p>
          Usted es responsable de mantener la confidencialidad de sus credenciales, de todas las
          actividades que ocurran bajo su cuenta, y de notificarnos inmediatamente sobre cualquier
          uso no autorizado. TAD no será responsable por pérdidas derivadas del uso no autorizado
          de su cuenta.
        </p>
        <p>
          Recomendamos encarecidamente habilitar la autenticación de dos factores (2FA) para todas
          las cuentas.
        </p>
      </LegalSection>

      <LegalSection id="uso-aceptable" title="4. Uso aceptable">
        <h3>4.1. Conductas prohibidas</h3>
        <p>Al utilizar la Plataforma, usted se compromete a NO:</p>
        <LegalList
          items={[
            'Publicar contenido ilegal, difamatorio, obsceno, pornográfico, violento, discriminatorio, o que incite al odio.',
            'Infringir derechos de propiedad intelectual de terceros (marcas, derechos de autor, patentes).',
            'Realizar actividades fraudulentas, phishing, o distribuir malware.',
            'Intentar acceder a áreas restringidas, realizar ingeniería inversa, o interrumpir el servicio.',
            'Suplantar la identidad de otra persona o entidad.',
            'Recopilar datos de otros usuarios sin su consentimiento.',
            'Utilizar la Plataforma para lavar dinero, financiar terrorismo, o cualquier actividad ilícita.',
            'Manipular o falsificar métricas, impresiones o datos de rendimiento.',
            'Publicar contenido que incite a la violencia, discriminación o actividades ilegales.',
            'Publicar publicidad de productos o servicios ilegales según las leyes dominicanas (armas, drogas, etc.).',
          ]}
        />
        <h3>4.2. Contenido publicitario</h3>
        <p>
          Todo el contenido publicitario debe cumplir con:
        </p>
        <LegalList
          items={[
            'Las leyes y regulaciones de República Dominicana, incluyendo las del CONEP, INDOTEL y Pro Consumidor.',
            'Las políticas de contenido de Google (cuando se utiliza OAuth) y Supabase.',
            'Las especificaciones técnicas de las pantallas (formatos, resoluciones, duraciones).',
            'Los derechos de autor y propiedad intelectual aplicables.',
          ]}
        />
        <p>
          TAD se reserva el derecho de rechazar, suspender o eliminar cualquier contenido que considere
          inapropiado, ilegal, o que viole estos términos, sin previo aviso y sin responsabilidad alguna.
        </p>
      </LegalSection>

      <LegalSection id="propiedad-intelectual" title="5. Propiedad intelectual">
        <h3>5.1. Derechos de TAD</h3>
        <p>
          La Plataforma, incluyendo su diseño, código fuente, interfaces, marcas registradas, logotipos,
          nombres comerciales, y todo el contenido creado por TAD, está protegido por las leyes de propiedad
          intelectual de República Dominicana y tratados internacionales.
        </p>
        <p>
          Se le concede una licencia limitada, no exclusiva, no transferible y revocable para utilizar
          la Plataforma conforme a estos términos. No se concede ninguna otra licencia.
        </p>
        <h3>5.2. Contenido del Usuario</h3>
        <p>
          Usted conserva todos los derechos sobre el contenido que sube a la Plataforma (creatividades,
          logos, textos, etc.). Sin embargo, al subir contenido, usted otorga a TAD una licencia mundial,
          no exclusiva, libre de regalías, transferible y sublicenciable para:
        </p>
        <LegalList
          items={[
            'Almacenar, reproducir, mostrar y distribuir el contenido a través de la red de pantallas.',
            'Modificar el formato del contenido para adaptarlo a las especificaciones técnicas de las pantallas.',
            'Utilizar el contenido en materiales promocionales y reportes agregados.',
          ]}
        />
        <p>
          Esta licencia termina cuando usted elimina el contenido o cierra su cuenta, excepto para el
          contenido ya distribuido en la red de pantallas.
        </p>
        <h3>5.3. Reportes y métricas</h3>
        <p>
          Los datos de rendimiento agregados y anónimos de la Plataforma pueden ser utilizados por
          TAD con fines de investigación, mejora del servicio y publicaciones de mercado.
        </p>
      </LegalSection>

      <LegalSection id="pagos" title="6. Pagos, comisiones y facturación">
        <h3>6.1. Para Anunciantes</h3>
        <LegalList
          items={[
            'Los precios se muestran en pesos dominicanos (DOP) o dólares estadounidenses (USD) según se especifique.',
            'Los pagos se procesan a través de proveedores certificados PCI-DSS.',
            'Las facturas se emiten conforme a las normas de la DGII y se envían electrónicamente.',
            'Los reembolsos se procesan según nuestra política de reembolsos (ver sección 6.3).',
            'El incumplimiento en el pago puede resultar en la suspensión inmediata de las campañas.',
          ]}
        />
        <h3>6.2. Para Conductores</h3>
        <LegalList
          items={[
            'Las comisiones se calculan en función de las impresiones efectivamente servidas.',
            'Los pagos se realizan semanal o mensualmente según la configuración del conductor.',
            'Los fondos se transfieren a la cuenta bancaria registrada del conductor.',
            'TAD retiene los impuestos aplicables según la ley dominicana.',
          ]}
        />
        <h3>6.3. Política de reembolsos</h3>
        <LegalList
          items={[
            'Reembolso completo: si cancela dentro de las 24 horas posteriores al pago, antes de iniciar la campaña.',
            'Reembolso parcial: si la campaña no puede completarse por causas atribuibles a TAD, se reembolsará la parte proporcional no utilizada.',
            'Sin reembolso: una vez que la campaña haya comenzado a servirse, no se emiten reembolsos, salvo disposición legal en contrario.',
          ]}
        />
      </LegalSection>

      <LegalSection id="sla" title="7. Nivel de servicio y disponibilidad">
        <p>
          TAD se esfuerza por mantener la Plataforma disponible 24/7, pero no garantiza un tiempo
          de actividad del 100%. Planificamos mantenimientos programados que serán notificados con
          al menos 48 horas de anticipación.
        </p>
        <LegalTable
          headers={['Métrica', 'Objetivo', 'Compromiso']}
          rows={[
            ['Disponibilidad mensual', '99.5%', 'Sin compensación por debajo del 99%'],
            ['Tiempo de respuesta API', '< 500ms (p95)', 'Monitoreo continuo'],
            ['Tiempo de resolución de incidentes críticos', '< 4 horas', 'Soporte 24/7'],
          ]}
        />
        <p>
          La disponibilidad de las pantallas físicas depende de múltiples factores externos (electricidad,
          conectividad, mantenimiento vehicular) y no está cubierta por estos SLAs.
        </p>
      </LegalSection>

      <LegalSection id="suspension" title="8. Suspensión y terminación">
        <h3>8.1. Terminación por el Usuario</h3>
        <p>
          Puede cerrar su cuenta en cualquier momento desde la configuración de su perfil o contactando
          a soporte. La terminación no exime del pago de obligaciones pendientes.
        </p>
        <h3>8.2. Terminación por TAD</h3>
        <p>
          Podemos suspender o terminar su acceso a la Plataforma en cualquier momento, con o sin causa,
          incluyendo pero no limitado a:
        </p>
        <LegalList
          items={[
            'Violación de estos Términos de Servicio o de la Política de Privacidad.',
            'Actividades fraudulentas, ilegales o que dañen la reputación de TAD.',
            'Incumplimiento de pago reiterado.',
            'Requerimiento de autoridad competente.',
            'Inactividad prolongada (más de 12 meses sin acceso).',
          ]}
        />
        <h3>8.3. Efectos de la terminación</h3>
        <p>
          Tras la terminación, perderá el acceso a la Plataforma, a sus datos de cuenta y a los reportes.
          Conservaremos sus datos según nuestra <Link href="/politica-de-privacidad">Política de Privacidad</Link>{' '}
          y las obligaciones legales aplicables.
        </p>
      </LegalSection>

      <LegalSection id="limitaciones" title="9. Limitaciones de responsabilidad">
        <p>
          En la máxima extensión permitida por la ley aplicable, TAD NO será responsable por:
        </p>
        <LegalList
          items={[
            'Daños indirectos, incidentales, especiales, consecuenciales o punitivos.',
            'Pérdida de beneficios, ingresos, clientes, oportunidades comerciales o datos.',
            'Interrupciones del servicio, bugs, o errores en la Plataforma.',
            'Acciones de terceros, incluyendo hackers, proveedores de internet, o fallos de infraestructura.',
            'Contenido publicitario de los anunciantes o su conformidad con leyes publicitarias.',
            'Daños causados por el uso indebido de la Plataforma por parte del Usuario.',
          ]}
        />
        <p>
          La responsabilidad total de TAD ante usted por cualquier reclamación relacionada con la
          Plataforma se limitará al monto total pagado por usted a TAD en los 12 meses anteriores
          al evento que originó la reclamación.
        </p>
      </LegalSection>

      <LegalSection id="indemnizacion" title="10. Indemnización">
        <p>
          Usted acepta defender, indemnizar y mantener indemne a TAD, sus directores, empleados y agentes
          de cualquier reclamación, daño, responsabilidad, pérdida, costo o gasto (incluyendo honorarios
          legales) que surja de:
        </p>
        <LegalList
          items={[
            'Su uso indebido de la Plataforma.',
            'Su violación de estos Términos de Servicio.',
            'Su violación de cualquier derecho de tercero.',
            'Cualquier contenido que usted suba o publique en la Plataforma.',
          ]}
        />
      </LegalSection>

      <LegalSection id="modificaciones" title="11. Modificaciones">
        <p>
          TAD puede modificar estos Términos de Servicio en cualquier momento. Te notificaremos los
          cambios materiales con al menos 30 días de anticipación por correo electrónico y mediante
          una notificación destacada en la Plataforma.
        </p>
        <p>
          Tu uso continuado de la Plataforma después de la fecha de entrada en vigor de los cambios
          constituye tu aceptación de los nuevos términos. Si no estás de acuerdo, puedes cerrar tu
          cuenta antes de la fecha de entrada en vigor.
        </p>
      </LegalSection>

      <LegalSection id="ley-aplicable" title="12. Ley aplicable y resolución de disputas">
        <p>
          Estos Términos se rigen por las leyes de la República Dominicana, sin referencia a sus
          conflictos de principios legales.
        </p>
        <p>
          Cualquier disputa, controversia o reclamación que surja de o se relacione con estos Términos
          o la Plataforma se resolverá preferentemente mediante negociación directa entre las partes.
          Si no se alcanza un acuerdo dentro de los 30 días, las partes se someterán a:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Mediación:</LegalHighlight> ante el Centro de Mediación y Arbitraje de la Cámara de Comercio y Producción de Santo Domingo.</>,
            <><LegalHighlight>Arbitraje:</LegalHighlight> si la mediación no resuelve la disputa, las disputas se resolverán mediante arbitraje vinculante según el reglamento de dicho Centro.</>,
            <><LegalHighlight>Jurisdicción subsidiaria:</LegalHighlight> en caso de que el arbitraje no sea aplicable, las partes se someten a los tribunales competentes de Santo Domingo, República Dominicana.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="disposiciones" title="13. Disposiciones generales">
        <LegalList
          items={[
            <><LegalHighlight>Acuerdo completo:</LegalHighlight> estos Términos, junto con la <Link href="/politica-de-privacidad">Política de Privacidad</Link>, constituyen el acuerdo completo entre usted y TAD.</>,
            <><LegalHighlight>Divisibilidad:</LegalHighlight> si alguna disposición se considera inválida, las demás permanecen en vigor.</>,
            <><LegalHighlight>No renuncia:</LegalHighlight> la falta de ejercicio de cualquier derecho no constituye una renuncia al mismo.</>,
            <><LegalHighlight>Cesión:</LegalHighlight> usted no puede ceder estos Términos sin nuestro consentimiento escrito. TAD puede cederlos a un afiliado o sucesor.</>,
            <><LegalHighlight>Fuerza mayor:</LegalHighlight> TAD no será responsable por incumplimiento debido a causas fuera de su control razonable (desastres naturales, pandemias, fallos de internet, etc.).</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="contacto" title="14. Contacto">
        <p>Para preguntas, quejas o solicitudes relacionadas con estos Términos de Servicio:</p>
        <LegalList
          items={[
            <><LegalHighlight>Email:</LegalHighlight> <a href="mailto:legal@tad.do">legal@tad.do</a></>,
            <><LegalHighlight>Teléfono:</LegalHighlight> +1 (809) XXX-XXXX</>,
            <><LegalHighlight>Dirección postal:</LegalHighlight> TAD Taxi Advertising S.R.L., Av. [Tu-Dirección], Santo Domingo, República Dominicana.</>,
            <><LegalHighlight>Atención al cliente:</LegalHighlight> disponible de lunes a viernes, 9:00 a 18:00 (AST).</>,
          ]}
        />
        <LegalCallout type="critical">
          <strong>Importante:</strong> El uso de la Plataforma constituye su aceptación de estos
          Términos. Si no está de acuerdo con alguna parte, debe abstenerse de utilizar la Plataforma.
        </LegalCallout>
      </LegalSection>
    </LegalLayout>
  );
}
