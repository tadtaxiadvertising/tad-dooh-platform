import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "TAD | Tu ciudad se mueve. Tu marca también.",
  description: "Conoce la publicidad en pantallas de taxis de TAD: explora campañas, oportunidades para conductores y una demostración de gestión de flotas.",
  metadataBase: new URL("https://tad.anunciante.ibusiness.com.do"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "TAD | Tu ciudad se mueve. Tu marca también.",
    description: "Explora TAD desde tu perspectiva: anunciante, conductor o flota. Demos educativas de publicidad en movimiento.",
    locale: "es_DO", type: "website", url: "/", siteName: "TAD",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-DO">
      <body>{children}</body>
    </html>
  );
}
