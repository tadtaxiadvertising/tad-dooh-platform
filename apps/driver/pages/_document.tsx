// apps/driver/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

/**
 * _document.tsx — Configuración global del documento HTML
 *
 * Incluye:
 *  - Tags PWA para Android (manifest) e iOS (apple-touch-icon)
 *  - Meta theme-color para la barra del sistema
 *  - Sin scripts de analytics en el documento base (se inyectan via _app)
 */
export default function Document() {
  return (
    <Html lang="es-DO">
      <Head>
        {/* ── Identidad de la App ── */}
        <meta name="application-name" content="TAD Driver" />
        <meta
          name="description"
          content="Panel de control para conductores TAD DOOH. Telemetría GPS y monitoreo de ganancias en República Dominicana."
        />

        {/* ── PWA Android / Chrome ── */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* ── PWA iOS / Safari ── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="TAD Driver" />
        {/* Apple no lee el manifest.json — necesita estas etiquetas propias */}
        <link rel="apple-touch-icon" href="/icons/icon.svg" />

        {/* ── Misc / Seguridad ── */}
        <meta name="format-detection" content="telephone=no" />
        <link rel="shortcut icon" href="/favicon.svg" />


      </Head>
      <body className="antialiased bg-[#0a0a0a]">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
