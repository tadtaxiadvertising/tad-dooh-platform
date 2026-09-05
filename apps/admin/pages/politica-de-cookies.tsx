import { LegalLayout, LegalSection, LegalList, LegalCallout, LegalHighlight, LegalTable } from '@tad/ui';

export default function PoliticaDeCookies() {
  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle="Qué son las cookies, cómo las utilizamos y cómo puedes gestionarlas."
      lastUpdated="2026-09-05"
      lastUpdatedDisplay="5 de septiembre de 2026"
      basePath=""
    >
      <LegalSection id="que-son" title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos de texto que un sitio web almacena en tu dispositivo
          (computadora, tablet, smartphone) cuando lo visitas. Permiten al sitio recordar tus
          acciones y preferencias durante un período determinado.
        </p>
        <p>
          Además de las cookies, utilizamos tecnologías similares como:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Local Storage:</LegalHighlight> almacenamiento local del navegador que persiste datos incluso después de cerrar la sesión.</>,
            <><LegalHighlight>Session Storage:</LegalHighlight> almacenamiento temporal que se borra al cerrar el navegador.</>,
            <><LegalHighlight>Web Beacons (píxeles):</LegalHighlight> imágenes transparentes de 1x1 píxel que rastrean interacciones.</>,
            <><LegalHighlight>Local Shared Objects (Flash Cookies):</LegalHighlight> (legado, ya no utilizado).</>,
            <><LegalHighlight>SDKs móviles:</LegalHighlight> identificadores únicos en aplicaciones nativas.</>,
          ]}
        />
        <p>
          En esta política, todas estas tecnologías se denominan colectivamente "cookies" para
          simplificar.
        </p>
      </LegalSection>

      <LegalSection id="porque" title="2. ¿Por qué utilizamos cookies?">
        <p>Utilizamos cookies para los siguientes fines:</p>
        <LegalList
          items={[
            <><LegalHighlight>Autenticación:</LegalHighlight> mantener tu sesión iniciada y reconocer al usuario entre páginas.</>,
            <><LegalHighlight>Seguridad:</LegalHighlight> detectar actividades sospechosas, prevenir fraude, proteger tu cuenta.</>,
            <><LegalHighlight>Preferencias:</LegalHighlight> recordar tu idioma, zona horaria y otras configuraciones.</>,
            <><LegalHighlight>Analítica:</LegalHighlight> entender cómo los usuarios interactúan con la Plataforma para mejorarla.</>,
            <><LegalHighlight>Marketing:</LegalHighlight> mostrar contenido relevante y medir la efectividad de campañas.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="tipos" title="3. Tipos de cookies que utilizamos">
        <LegalTable
          headers={['Tipo', 'Propósito', 'Duración', 'Proveedor']}
          rows={[
            [
              'Estrictamente necesarias',
              'Autenticación, seguridad, prevención de fraude. Sin estas, la Plataforma no funciona.',
              'Sesión / 30 días',
              'TAD (propias)',
            ],
            [
              'Funcionales',
              'Recordar preferencias (idioma, zona horaria, tema).',
              'Hasta 12 meses',
              'TAD (propias)',
            ],
            [
              'Analíticas',
              'Medir el uso de la Plataforma, identificar problemas, mejorar el rendimiento.',
              'Hasta 24 meses',
              'PostHog, Sentry, Vercel Analytics',
            ],
            [
              'Marketing',
              'Mostrar publicidad relevante, medir campañas, remarketing.',
              'Hasta 24 meses',
              'Google Ads, Meta Pixel, LinkedIn Insight Tag',
            ],
            [
              'De terceros (OAuth)',
              'Permitir inicio de sesión con Google, GitHub, etc.',
              'Hasta 2 años',
              'Google, GitHub, Facebook',
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id="cookies-especificas" title="4. Cookies específicas que utilizamos">
        <h3>4.1. Cookies propias</h3>
        <LegalTable
          headers={['Nombre', 'Propósito', 'Duración']}
          rows={[
            ['sb-access-token', 'Token de autenticación de Supabase.', '1 hora'],
            ['sb-refresh-token', 'Token para renovar la sesión.', '7 días'],
            ['tad_user_data', 'Datos básicos del usuario para la UI (ID, email, rol).', '7 días'],
            ['tad_admin_token', 'Token de sesión para administradores.', '24 horas'],
            ['tad_session_id', 'Identificador único de sesión para auditoría.', '24 horas'],
          ]}
        />
        <h3>4.2. Cookies de terceros</h3>
        <LegalTable
          headers={['Proveedor', 'Cookies', 'Propósito', 'Privacidad']}
          rows={[
            ['Supabase', 'sb-*', 'Autenticación y base de datos.', 'supabase.com/privacy'],
            ['Cloudflare', '__cf_bm, _cfuvid', 'Seguridad y CDN.', 'cloudflare.com/privacypolicy'],
            ['Google OAuth', 'G_AUTHUSER_H, SID, HSID', 'Inicio de sesión con Google.', 'policies.google.com/privacy'],
            ['PostHog', 'ph_*', 'Analítica de producto.', 'posthog.com/privacy'],
            ['Sentry', 'sentrry-*', 'Monitoreo de errores.', 'sentry.io/privacy'],
          ]}
        />
      </LegalSection>

      <LegalSection id="gestionar" title="5. Cómo gestionar y eliminar cookies">
        <p>
          Puedes gestionar o eliminar las cookies a través de la configuración de tu navegador.
          A continuación, los enlaces a las páginas de ayuda de los navegadores más comunes:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Google Chrome:</LegalHighlight> <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">support.google.com/chrome/answer/95647</a></>,
            <><LegalHighlight>Mozilla Firefox:</LegalHighlight> <a href="https://support.mozilla.org/es/kb/Borrar%20cookies" target="_blank" rel="noopener noreferrer">support.mozilla.org/es/kb/Borrar cookies</a></>,
            <><LegalHighlight>Safari:</LegalHighlight> <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">support.apple.com/es-es/guide/safari/sfri11471</a></>,
            <><LegalHighlight>Microsoft Edge:</LegalHighlight> <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">support.microsoft.com/es-es/microsoft-edge/eliminar-cookies</a></>,
          ]}
        />
        <LegalCallout type="warning">
          <strong>Importante:</strong> Si desactivas las cookies estrictamente necesarias, algunas
          partes de la Plataforma podrían no funcionar correctamente. Por ejemplo, no podrás iniciar
          sesión o mantener tu sesión activa.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="consentimiento" title="6. Consentimiento">
        <p>
          Al utilizar la Plataforma por primera vez, te mostramos un banner de cookies que te permite:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Aceptar todas las cookies.</LegalHighlight></>,
            <><LegalHighlight>Rechazar todas las cookies no esenciales (mantenemos solo las estrictamente necesarias).</LegalHighlight></>,
            <><LegalHighlight>Personalizar tus preferencias por categoría.</LegalHighlight></>,
          ]}
        />
        <p>
          Puedes cambiar tus preferencias en cualquier momento haciendo clic en el enlace "Configuración
          de cookies" en el pie de página de la Plataforma.
        </p>
        <p>
          Para usuarios en el Espacio Económico Europeo (EEE), Reino Unido o California (EE.UU.),
          solicitamos consentimiento explícito antes de utilizar cookies no esenciales, conforme al
          RGPD y la CCPA.
        </p>
      </LegalSection>

      <LegalSection id="terceros" title="7. Cookies de terceros y redes sociales">
        <p>
          La Plataforma puede contener enlaces o integraciones con servicios de terceros (Google Maps,
          YouTube, Facebook, etc.) que instalan sus propias cookies cuando interactúas con ellos.
          No tenemos control sobre estas cookies.
        </p>
        <p>
          Te recomendamos revisar las políticas de cookies de estos servicios:
        </p>
        <LegalList
          items={[
            <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">Google</a>,
            <a href="https://www.facebook.com/policies/cookies/" target="_blank" rel="noopener noreferrer">Meta/Facebook</a>,
            <a href="https://www.linkedin.com/legal/cookie-policy" target="_blank" rel="noopener noreferrer">LinkedIn</a>,
          ]}
        />
      </LegalSection>

      <LegalSection id="do-not-track" title={'8. Señales de "No rastrear"'}>
        <p>
          La Plataforma honra las señales "Do Not Track" (DNT) y "Global Privacy Control" (GPC)
          que tu navegador pueda enviar. Cuando detectamos estas señales, automáticamente desactivamos
          las cookies de analítica y marketing.
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="9. Cambios a esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios en las cookies que utilizamos o por
          razones legales. Te notificaremos cualquier cambio material mediante un aviso destacado
          en la Plataforma.
        </p>
      </LegalSection>

      <LegalSection id="contacto" title="10. Contacto">
        <p>Para preguntas sobre esta Política de Cookies:</p>
        <LegalList
          items={[
            <><LegalHighlight>Email:</LegalHighlight> <a href="mailto:privacidad@tad.do">privacidad@tad.do</a></>,
            <><LegalHighlight>Formulario de contacto:</LegalHighlight> disponible en la sección de Soporte de la Plataforma.</>,
          ]}
        />
      </LegalSection>
    </LegalLayout>
  );
}
