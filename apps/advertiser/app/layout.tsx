import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "TAD | Tu ciudad se mueve. Tu marca también.",
  description: "Conoce la publicidad en pantallas de taxis de TAD: explora campañas, descubre el simulador de presupuesto y conoce el proceso de contratación.",
  metadataBase: new URL("https://tad.anunciante.ibusiness.com.do"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "TAD | Tu ciudad se mueve. Tu marca también.",
    description: "Explora la publicidad en taxis de TAD: campaña, pantallas, producción creativa opcional y estimaciones con contexto.",
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
