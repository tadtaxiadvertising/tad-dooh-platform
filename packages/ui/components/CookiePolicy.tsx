import React from 'react';
import { LegalLayout, LegalSection, LegalTable } from './LegalLayout';
import { openCookieSettings } from '@tad/services/cookie-consent';

/** One inventory shared by Admin, Advertiser and Driver. */
export function CookiePolicy() {
  return <LegalLayout title="Política de Cookies" subtitle="Qué guardamos en tu navegador y cómo controlar las opciones adicionales."
    lastUpdated="2026-10-30" lastUpdatedDisplay="30 de octubre de 2026">
    <LegalSection id="control" title="1. Tú controlas las opciones adicionales">
      <p>Puedes rechazar, aceptar o personalizar las opciones adicionales. Por defecto permanecen desactivadas. Rechazarlas no bloquea el acceso, el registro ni las funciones operativas del servicio.</p>
      <button type="button" onClick={openCookieSettings} className="rounded-xl border border-[#FDCB01] px-5 py-3 font-bold text-[#FDCB01]">Cambiar configuración de cookies</button>
      <p>También puedes usar el botón «Configuración de cookies» disponible en todas las páginas del portal.</p>
    </LegalSection>
    <LegalSection id="tecnologias" title="2. Cookies y almacenamiento local">
      <p>Las cookies se envían al mismo portal con sus peticiones. localStorage y sessionStorage guardan información en el navegador; IndexedDB y la caché de la aplicación permiten trabajar con conectividad limitada. No son cookies, pero explicamos su uso aquí para que puedas distinguirlos.</p>
    </LegalSection>
    <LegalSection id="categorias" title="3. Categorías y valores iniciales">
      <LegalTable headers={['Categoría', 'Uso', 'Estado inicial']} rows={[
        ['Necesarias', 'Sesión, seguridad, decisión de privacidad y funciones operativas solicitadas.', 'Siempre activas'],
        ['Preferencias adicionales', 'Permiso para futuras opciones de comodidad. No activa un proveedor adicional actualmente.', 'Desactivadas'],
        ['Analítica', 'Umami, si está configurado, y medición opcional de interacciones del portal.', 'Desactivada'],
        ['Marketing', 'Permiso para futuras integraciones publicitarias opcionales. No hay píxeles de marketing activos en estos portales.', 'Desactivado'],
      ]} />
      <p>La reproducción de campañas, medición contractual, GPS necesario para prestar el servicio y sincronización operativa no se activan ni se desactivan con este control de analítica del sitio. Los permisos del dispositivo y las condiciones del servicio se gestionan por separado.</p>
    </LegalSection>
    <LegalSection id="inventario" title="4. Inventario del navegador">
      <LegalTable headers={['Nombre o familia', 'Tecnología y finalidad', 'Conservación']} rows={[
        ['sb-access-token', 'Cookie propia necesaria para mantener la sesión del portal.', 'Hasta 7 días; se actualiza al renovar la sesión y se elimina al cerrarla. La validez del token la decide el servidor.'],
        ['sb-<proyecto>-auth-token y fragmentos .0, .1…', 'Cookies necesarias de sesión Supabase, cuando se usa ese flujo.', 'Hasta 7 días, renovables; se eliminan al cerrar sesión.'],
        ['sb-<proyecto>-auth-token-code-verifier', 'Cookie temporal del intercambio de acceso cuando corresponde.', 'Gestionada por el flujo de acceso; se limpia al cerrar sesión.'],
        ['tad_<portal>_token, tad_<portal>_user y claves de sesión Supabase', 'localStorage necesario para restaurar la sesión del portal.', 'Hasta cierre de sesión o limpieza del navegador; la expiración y autorización se validan por separado.'],
        ['tad_cookie_preferences', 'localStorage propio con categorías, versión de la política, fecha de decisión y vencimiento. No contiene datos de identidad ni tokens.', '180 días desde la última decisión explícita.'],
        ['Caché, IndexedDB y colas operativas', 'Recursos y datos necesarios para funciones solicitadas y trabajo sin conexión.', 'Según la sincronización y el funcionamiento de cada módulo; no se eliminan al rechazar cookies opcionales.'],
      ]} />
      <p>Las cookies de sesión son propias del host del portal; no se comparten mediante una cookie general de ibusiness.com.do. La implementación actual permite a JavaScript acceder a ellas para gestionar la sesión del cliente.</p>
    </LegalSection>
    <LegalSection id="analitica" title="5. Analítica y terceros">
      <p>Umami solo se descarga cuando existe configuración y has autorizado analítica. La medición automática está desactivada: cada envío comprueba la decisión vigente. No enviamos a esta analítica los parámetros de la URL, el fragmento, el título ni el enlace de procedencia; los callbacks de acceso no generan visitas.</p>
      <p>Al retirar el permiso se detienen los nuevos envíos opcionales y se retira el script. Esto no elimina datos que ya se hubieran enviado con un permiso anterior ni puede recuperar una petición que ya estaba en curso. Los enlaces externos y los servicios con los que decidas interactuar pueden aplicar sus propias políticas.</p>
    </LegalSection>
    <LegalSection id="duracion" title="6. Duración, cambio y retirada">
      <p>Recordamos aceptar y rechazar durante el mismo plazo de 180 días, por navegador y portal. Puedes cambiar tu selección en cualquier momento. Volvemos a preguntar si vence el plazo, cambia la versión de la política o la decisión guardada no es válida. Una elección de un portal no se copia a los otros.</p>
      <p>Si el navegador bloquea el almacenamiento, aplicamos tu elección en la pestaña y te avisamos de que no se guardará para próximas visitas. Cerrar el aviso sin guardar no equivale a consentir.</p>
      <p>Si el navegador activa Global Privacy Control (GPC) o Do Not Track (DNT), mantenemos analítica y marketing desactivados, incluso si existía una selección anterior.</p>
    </LegalSection>
    <LegalSection id="sesion" title="7. Cookies necesarias y cierre de sesión">
      <p>Rechazar las opciones adicionales no cierra tu sesión. Para salir usa «Cerrar sesión». Para borrar todo el almacenamiento usa los controles de tu navegador, teniendo en cuenta que puedes perder datos locales todavía sin sincronizar. No borramos automáticamente esas colas al modificar el consentimiento.</p>
    </LegalSection>
    <LegalSection id="contacto" title="8. Información y ayuda">
      <p>Consulta también la <a href="/politica-de-privacidad" className="text-[#FDCB01] underline">Política de Privacidad</a>. Si necesitas ayuda con tus preferencias o datos, utiliza el canal de Soporte de tu portal TAD.</p>
    </LegalSection>
  </LegalLayout>;
}
