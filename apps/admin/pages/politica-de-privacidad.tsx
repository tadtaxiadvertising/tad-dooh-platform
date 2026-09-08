import { LegalLayout, LegalSection, LegalList, LegalCallout, LegalHighlight, LegalTable } from '@tad/ui';

export default function PoliticaDePrivacidad() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      subtitle="Cómo recopilamos, usamos, almacenamos y protegemos tu información personal en TAD DOOH."
      lastUpdated="2026-09-05"
      lastUpdatedDisplay="5 de septiembre de 2026"
      basePath=""
    >
      <LegalSection id="introduccion" title="1. Introducción y alcance">
        <p>
          En <LegalHighlight>TAD Taxi Advertising S.R.L.</LegalHighlight> (en adelante, "TAD", "nosotros" o "nuestro"),
          respetamos tu privacidad y nos comprometemos a proteger tu información personal de conformidad con
          la <strong>Ley No. 172-13 sobre Protección de Datos Personales</strong> de la República Dominicana y las
          mejores prácticas internacionales de seguridad de la información.
        </p>
        <p>
          Esta Política de Privacidad describe qué datos recopilamos, cómo los utilizamos, con quién los
          compartimos y qué derechos tienes sobre tu información cuando utilizas nuestra plataforma TAD DOOH
          (en adelante, la "Plataforma"), incluyendo nuestros portales de Anunciantes, Conductores, Administración
          y cualquier otro servicio relacionado.
        </p>
        <p>
          Al crear una cuenta o utilizar nuestros servicios, confirmas que has leído, comprendido y aceptado
          los términos de esta política. Si no estás de acuerdo con alguna parte, te recomendamos no utilizar
          nuestros servicios.
        </p>
      </LegalSection>

      <LegalSection id="datos-recopilados" title="2. Datos que recopilamos">
        <p>Recopilamos las siguientes categorías de información personal, de acuerdo con el tipo de usuario y la aplicación que utilices:</p>
        <p>
          <strong>Nuestra matriz de permisos de recopilación en background detalla exactamente qué datos se coleccionan por tipo de usuario y aplicación.</strong>
        </p>
        <LegalCallout type="info">
          <strong>Consulte la sección 2.5 a continuación para ver la matriz completa por tipo de usuario.</strong>
        </LegalCallout>
        <h3>2.1. Datos de identificación</h3>
        <LegalList
          items={[
            <><LegalHighlight>Datos de cuenta:</LegalHighlight> nombre completo, dirección de correo electrónico, número de teléfono, fotografía de perfil (opcional).</>,
            <><LegalHighlight>Credenciales de acceso:</LegalHighlight> contraseñas cifradas (hasheadas con bcrypt), tokens de sesión, claves API (para integraciones).</>,
            <><LegalHighlight>Datos de verificación:</LegalHighlight> documentos de identidad (cédula, RNC, RTN) para empresas y conductores, licencias de conducir, certificaciones vehiculares.</>,
          ]}
        />
        <h3>2.2. Datos de uso y operación</h3>
        <LegalList
          items={[
            <><LegalHighlight>Actividad en la Plataforma:</LegalHighlight> páginas visitadas, acciones realizadas, tiempo de sesión, clics, consultas de búsqueda, filtros aplicados.</>,
            <><LegalHighlight>Datos de campañas publicitarias:</LegalHighlight> creatividades, presupuestos, segmentaciones, métricas de impresiones, alcance, frecuencia, rendimiento publicitario.</>,
            <><LegalHighlight>Datos de dispositivos y vehículos:</LegalHighlight> para conductores, identificadores de tablet, ubicación GPS en tiempo real (cuando el servicio está activo), kilómetros recorridos, horas operativas, patrones de ruta.</>,
            <><LegalHighlight>Comunicaciones:</LegalHighlight> mensajes enviados a través de la plataforma, notificaciones, tickets de soporte.</>,
          ]}
        />
        <h3>2.3. Datos técnicos</h3>
        <LegalList
          items={[
            <><LegalHighlight>Información del dispositivo:</LegalHighlight> tipo de dispositivo, sistema operativo, versión de la app, identificadores únicos (IDFA, GAID, IMEI cuando aplique).</>,
            <><LegalHighlight>Datos de conexión:</LegalHighlight> dirección IP, tipo de navegador, proveedor de servicios de internet, datos de red móvil.</>,
            <><LegalHighlight>Cookies y tecnologías similares:</LegalHighlight> ver nuestra <a href="/politica-de-cookies">Política de Cookies</a> para más detalles.</>,
          ]}
        />
        <h3>2.4. Datos financieros</h3>
        <LegalList
          items={[
            <><LegalHighlight>Para anunciantes:</LegalHighlight> información de facturación, historial de pagos, facturas emitidas, métodos de pago (procesados por proveedores certificados PCI-DSS; nunca almacenamos números completos de tarjetas).</>,
            <><LegalHighlight>Para conductores:</LegalHighlight> comisiones generadas, pagos realizados, datos bancarios para transferencias, historial de retiros.</>,
          ]}
        />
        <h3>2.5. Matriz de permisos por tipo de usuario y aplicación</h3>
        <p>
          La siguiente matriz detalla los datos que se coleccionan en cada una de nuestras tres aplicaciones
          (Administrador, Anunciante, Conductor), según el tipo de usuario, y para qué fines se utilizan.
        </p>
        <p>
          <strong>Los datos se categorizan como:</strong>
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Essencial / Strictly Necessary:</LegalHighlight> datos requeridos para la funcionalidad básica de la plataforma, autenticación y seguridad. No requiere consentimiento.</>,
            <><LegalHighlight>Analítica / Performance:</LegalHighlight> datos recopilados para entender cómo se usa la plataforma, métricas de rendimiento y patrones de uso. Requiere consentimiento.</>,
            <><LegalHighlight>Funcional / Preferences:</LegalHighlight> datos que habilitan funciones personalizadas, configuraciones y mejora de la experiencia de usuario. Requiere consentimiento.</>,
            <><LegalHighlight>Administrativo / System:</LegalHighlight> datos utilizados para funciones administrativas, gestión de usuarios, configuración de la plataforma y supervisión. Aplicable a administradores.</>,
            <><LegalHighlight>Campaña / Business:</LegalHighlight> datos relacionados con campañas publicitarias, creativos, segmentación y métricas de rendimiento. Aplicable a anunciantes.</>,
            <><LegalHighlight>Ubicación / Telemetry:</LegalHighlight> datos GPS y de ubicación para seguimiento de dispositivos, monitoreo de flotas y optimización de rutas. Aplicable a conductores; requiere consentimiento explícito.</>,
            <><LegalHighlight>Financiero / Billing:</LegalHighlight> datos de pagos, ganancias, historial de transacciones e información de facturación.</>,
          ]}
        />
        <p>
          <strong>Matriz resumida por tipo de usuario:</strong>
        </p>
        <LegalTable
          columns={['Categoría', 'Admin', 'Anunciante', 'Conductor']}
          data={[
            { categoría: 'Essencial / Strictly Necessary', admin: 'Sí', anunciante: 'Sí', conductor: 'Sí' },
            { categoría: 'Analítica / Performance', admin: 'Sí', anunciante: 'Sí', conductor: 'Sí' },
            { categoría: 'Funcional / Preferences', admin: 'Sí', anunciante: 'Sí', conductor: 'Sí' },
            { categoría: 'Administrativo / System', admin: 'Sí', anunciante: 'No', conductor: 'No' },
            { categoría: 'Campaña / Business', admin: 'No', anunciante: 'Sí', conductor: 'No' },
            { categoría: 'Ubicación / Telemetry', admin: 'No', anunciante: 'No', conductor: 'Sí' },
            { categoría: 'Financiero / Billing', admin: 'Sí', anunciante: 'Sí', conductor: 'Sí' },
          ]}
        />
        <p>
          <strong>Propósito de cada categoría:</strong>
        </p>
        <LegalTable
          columns={['Categoría', 'Propósito']}
          data={[
            { categoría: 'Essencial / Strictly Necessary', propósito: 'Funcionalidad básica de la plataforma, autenticación y seguridad' },
            { categoría: 'Analítica / Performance', propósito: 'Medir uso de la plataforma, identificar mejoras, monitorear salud del sistema' },
            { categoría: 'Funcional / Preferences', propósito: 'Recordar preferencias del usuario, experiencia personalizada, guardar progreso de formularios' },
            { categoría: 'Administrativo / System', propósito: 'Gestión de cuentas y roles de usuario (solo admin), configuración de plataforma, cumplimiento y auditoría' },
            { categoría: 'Campaña / Business', propósito: 'Creación y gestión de campañas publicitarias, subida y generación de activos creativos, seguimiento de rendimiento de campañas, gestión de enlaces QR de conversión, procesamiento de facturación y pago para campañas' },
            { categoría: 'Ubicación / Telemetry', propósito: 'Seguimiento de ubicación de vehículos para monitoreo de flotas, visualización en tiempo real en dashboard, optimización de exhibición de anuncios basada en cobertura geográfica, garantizar seguridad y seguridad del conductor, generar analíticas de ruta y métricas de rendimiento' },
            { categoría: 'Financiero / Billing', propósito: 'Procesar pagos y facturación para campañas, seguir ganancias y saldos de wallet, habilitar pagos y cálculos de comisiones, mantener registros financieros compatibles con impuestos, gestionar pagos de suscripción y referidos' },
          ]}
        />
      </LegalSection>

      <LegalSection id="uso-de-datos" title="3. Cómo utilizamos tus datos">
        <p>Utilizamos la información personal recopilada para los siguientes fines:</p>
        <LegalList
          items={[
            <><LegalHighlight>Prestación del servicio:</LegalHighlight> crear y mantener tu cuenta, procesar campañas publicitarias, gestionar flotas de vehículos, mostrar contenido relevante, calcular comisiones y pagos.</>,
            <><LegalHighlight>Mejora del producto:</LegalHighlight> analizar patrones de uso, identificar errores, desarrollar nuevas funcionalidades, optimizar el rendimiento de la plataforma.</>,
            <><LegalHighlight>Comunicaciones:</LegalHighlight> enviar notificaciones transaccionales (confirmaciones, alertas, actualizaciones), boletines informativos (solo con tu consentimiento), responder consultas de soporte.</>,
            <><LegalHighlight>Seguridad y prevención de fraude:</LegalHighlight> detectar actividades sospechosas, prevenir ataques, proteger la integridad de la plataforma y los fondos de los usuarios.</>,
            <><LegalHighlight>Cumplimiento legal:</LegalHighlight> cumplir con obligaciones tributarias, regulatorias y judiciales aplicables en República Dominicana.</>,
            <><LegalHighlight>Investigación y análisis:</LegalHighlight> realizar estudios de mercado, análisis de tendencias, informes agregados y anónimos sobre el sector de publicidad DOOH en RD.</>,
          ]}
        />
        <LegalCallout type="info">
          <strong>Importante:</strong> Nunca vendemos tus datos personales a terceros con fines de marketing.
          Nunca los utilizamos para fines distintos a los descritos en esta política sin tu consentimiento explícito.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="base-legal" title="4. Base legal para el tratamiento">
        <p>El tratamiento de tus datos personales se basa en las siguientes bases legales según la Ley 172-13:</p>
        <LegalList
          items={[
            <><LegalHighlight>Consentimiento:</LegalHighlight> cuando nos otorgas tu consentimiento explícito para fines específicos (boletines, marketing, cookies opcionales).</>,
            <><LegalHighlight>Ejecución contractual:</LegalHighlight> cuando el tratamiento es necesario para prestarte los servicios que contrataste (gestión de cuenta, procesamiento de pagos).</>,
            <><LegalHighlight>Cumplimiento de obligación legal:</LegalHighlight> cuando debemos tratar datos para cumplir con leyes tributarias, laborales o regulatorias.</>,
            <><LegalHighlight>Interés legítimo:</LegalHighlight> cuando tenemos un interés legítimo que no vulnera tus derechos fundamentales (seguridad de la plataforma, prevención de fraude).</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="compartir-datos" title="5. Con quién compartimos tus datos">
        <p>Compartimos información personal únicamente en las siguientes circunstancias:</p>
        <h3>5.1. Proveedores de servicios</h3>
        <p>
          Con terceros que nos ayudan a operar la plataforma, todos bajo acuerdos de confidencialidad y
          tratamiento de datos:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Supabase Inc.</LegalHighlight> — Proveedor de base de datos, autenticación y almacenamiento.</>,
            <><LegalHighlight>Cloudflare Inc.</LegalHighlight> — Red de distribución de contenido y protección DDoS.</>,
            <><LegalHighlight>Easypanel / Rewvid</LegalHighlight> — Proveedor de infraestructura de hosting.</>,
            <><LegalHighlight>Google LLC</LegalHighlight> — Proveedor de OAuth, mapas y herramientas de analítica.</>,
            <><LegalHighlight>Procesadores de pago</LegalHighlight> — Certificados PCI-DSS para procesar transacciones.</>,
          ]}
        />
        <h3>5.2. Entre usuarios de la plataforma</h3>
        <LegalList
          items={[
            <>Los anunciantes ven <strong>información agregada y anónima</strong> sobre el rendimiento de sus campañas (impresiones, alcance, kilómetros) pero nunca datos personales de conductores individuales.</>,
            <>Los conductores ven información necesaria para sus operaciones (rutas asignadas, horarios, comisiones) pero nunca datos personales de los anunciantes.</>,
          ]}
        />
        <h3>5.3. Por obligación legal</h3>
        <p>
          Podemos divulgar información personal cuando sea requerido por ley, orden judicial, o para
          cooperar con autoridades gubernamentales competentes en investigaciones legítimas.
        </p>
        <h3>5.4. Transferencias comerciales</h3>
        <p>
          En caso de fusión, adquisición o venta de activos, los datos personales podrían ser transferidos
          al adquirente, siempre bajo las mismas protecciones de esta política. Te notificaremos con
          al menos 30 días de anticipación.
        </p>
      </LegalSection>

      <LegalSection id="retencion" title="6. Retención de datos">
        <p>Conservamos tus datos personales durante los siguientes períodos:</p>
        <LegalList
          items={[
            <><LegalHighlight>Datos de cuenta activa:</LegalHighlight> mientras tu cuenta esté activa y durante 5 años después de su cierre (para cumplir obligaciones legales y fiscales).</>,
            <><LegalHighlight>Datos de campañas publicitarias:</LegalHighlight> 7 años después de la finalización de la campaña (requisito fiscal DGII).</>,
            <><LegalHighlight>Datos de transacciones financieras:</LegalHighlight> 10 años (Código Tributario de RD).</>,
            <><LegalHighlight>Datos de geolocalización de conductores:</LegalHighlight> 90 días para datos en tiempo real; 2 años para datos agregados.</>,
            <><LegalHighlight>Logs de auditoría y seguridad:</LegalHighlight> 3 años.</>,
            <><LegalHighlight>Cookies de sesión:</LegalHighlight> hasta 30 días. Cookies persistentes: según configuración (ver <a href="/politica-de-cookies">Política de Cookies</a>).</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="seguridad" title="7. Seguridad de la información">
        <p>Implementamos medidas técnicas y organizativas robustas para proteger tus datos:</p>
        <LegalList
          items={[
            <><LegalHighlight>Cifrado en tránsito:</LegalHighlight> HTTPS/TLS 1.3 en todas las comunicaciones.</>,
            <><LegalHighlight>Cifrado en reposo:</LegalHighlight> AES-256 para datos sensibles almacenados.</>,
            <><LegalHighlight>Hashing de contraseñas:</LegalHighlight> bcrypt con cost factor 12+.</>,
            <><LegalHighlight>Autenticación de dos factores (2FA):</LegalHighlight> disponible y recomendada para todas las cuentas.</>,
            <><LegalHighlight>Row Level Security (RLS):</LegalHighlight> en la base de datos para garantizar que cada usuario solo acceda a sus propios datos.</>,
            <><LegalHighlight>Auditorías de seguridad:</LegalHighlight> pruebas de penetración anuales y escaneos automatizados mensuales.</>,
            <><LegalHighlight>Monitoreo 24/7:</LegalHighlight> detección de intrusiones y actividades sospechosas.</>,
            <><LegalHighlight>Backups cifrados:</LegalHighlight> con rotación diaria y almacenamiento offsite.</>,
            <><LegalHighlight>Principio de mínimo privilegio:</LegalHighlight> acceso a datos limitado según necesidad del rol.</>,
          ]}
        />
        <LegalCallout type="warning">
          <strong>Aviso de seguridad:</strong> Ningún sistema es 100% seguro. En caso de una brecha de
          seguridad que afecte tus datos personales, te notificaremos dentro de las 72 horas siguientes,
          conforme a la Ley 172-13.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="derechos" title="8. Tus derechos sobre tus datos">
        <p>Conforme a la Ley 172-13, tienes los siguientes derechos:</p>
        <LegalList
          items={[
            <><LegalHighlight>Derecho de acceso:</LegalHighlight> conocer qué datos personales tenemos sobre ti y cómo los utilizamos.</>,
            <><LegalHighlight>Derecho de rectificación:</LegalHighlight> corregir datos inexactos o incompletos.</>,
            <><LegalHighlight>Derecho de supresión ("derecho al olvido"):</LegalHighlight> solicitar la eliminación de tus datos cuando ya no sean necesarios.</>,
            <><LegalHighlight>Derecho de oposición:</LegalHighlight> oponerte al tratamiento de tus datos para fines específicos (marketing, analítica).</>,
            <><LegalHighlight>Derecho de portabilidad:</LegalHighlight> recibir tus datos en un formato estructurado y de uso común (JSON, CSV).</>,
            <><LegalHighlight>Derecho de limitación:</LegalHighlight> solicitar que limitemos el procesamiento mientras se resuelve una disputa.</>,
            <><LegalHighlight>Derecho a no ser objeto de decisiones automatizadas:</LegalHighlight> incluyendo la elaboración de perfiles, salvo excepciones legales.</>,
          ]}
        />
        <p>
          Para ejercer cualquiera de estos derechos, envíanós una solicitud a{' '}
          <a href="mailto:privacidad@tad.do">privacidad@tad.do</a> incluyendo:
        </p>
        <LegalList
          items={[
            'Tu nombre completo y documento de identidad.',
            'Descripción clara del derecho que deseas ejercer.',
            'Dirección de correo electrónico asociada a tu cuenta.',
            'Cualquier información adicional que nos ayude a verificar tu identidad.',
          ]}
        />
        <p>
          Responderemos a tu solicitud en un plazo máximo de <strong>10 días hábiles</strong>.
          Si tu solicitud es compleja, podemos extender este plazo a 30 días, notificándote la razón.
        </p>
      </LegalSection>

      <LegalSection id="menores" title="9. Privacidad de menores de edad">
        <p>
          La Plataforma no está dirigida a menores de 18 años. No recopilamos intencionalmente datos
          personales de menores. Si eres padre/madre o tutor y descubres que tu hijo nos ha proporcionado
          datos personales, contáctanos a <a href="mailto:privacidad@tad.do">privacidad@tad.do</a> y
          procederemos a eliminarlos.
        </p>
      </LegalSection>

      <LegalSection id="transferencias-internacionales" title="10. Transferencias internacionales">
        <p>
          Algunos de nuestros proveedores de servicios (Supabase, Cloudflare, Google) almacenan datos en
          servidores ubicados fuera de República Dominicana, principalmente en Estados Unidos y Europa.
        </p>
        <p>
          Estas transferencias se realizan únicamente a países con niveles adecuados de protección de datos
          o bajo garantías contractuales que aseguren el cumplimiento de estándares equivalentes a la Ley 172-13.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="11. Cambios a esta política">
        <p>
          Podemos actualizar esta política periódicamente. Te notificaremos cualquier cambio material por:
        </p>
        <LegalList
          items={[
            'Correo electrónico a la dirección asociada a tu cuenta.',
            'Notificación destacada dentro de la Plataforma.',
            'Publicación de la versión actualizada con la fecha de "Última actualización" en la parte superior.',
          ]}
        />
        <p>
          Tu uso continuado de la Plataforma después de la fecha de entrada en vigor de los cambios
          constituye tu aceptación de la nueva política. Si no estás de acuerdo, puedes ejercer tu
          derecho de supresión cerrando tu cuenta.
        </p>
      </LegalSection>

      <LegalSection id="contacto" title="12. Contacto del Responsable de Protección de Datos">
        <p>Para cualquier consulta, queja o solicitud relacionada con esta política o el tratamiento de tus datos personales, puedes contactarnos:</p>
        <LegalList
          items={[
            <><LegalHighlight>Responsable:</LegalHighlight> Oficial de Protección de Datos (DPO) de TAD Taxi Advertising S.R.L.</>,
            <><LegalHighlight>Email:</LegalHighlight> <a href="mailto:privacidad@tad.do">privacidad@tad.do</a></>,
            <><LegalHighlight>Teléfono:</LegalHighlight> +1 (809) XXX-XXXX</>,
            <><LegalHighlight>Dirección:</LegalHighlight> Av. [Tu-Dirección], Santo Domingo, República Dominicana.</>,
          ]}
        />
        <p>
          También tienes derecho a presentar una queja ante la <strong>Dirección de Protección de Datos Personales (DPD)</strong>
          de la República Dominicana si consideras que hemos vulnerado tus derechos.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
