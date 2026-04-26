import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TAD Simulator Control Center',
  description: 'Simulation Engine for TAD DOOH ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-tad-bg flex flex-col">
        {children}
      </body>
    </html>
  );
}
