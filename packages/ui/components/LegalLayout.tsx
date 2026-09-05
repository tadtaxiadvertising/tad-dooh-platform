'use client';
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Cookie, Scale } from 'lucide-react';

export interface LegalLayoutProps {
  /** Page title (e.g. "Política de Privacidad") */
  title: string;
  /** Last updated date in ISO format (e.g. "2026-09-05") */
  lastUpdated: string;
  /** Localized last updated date for display */
  lastUpdatedDisplay?: string;
  /** Page subtitle (e.g. "Cómo recopilamos, usamos y protegemos tu información") */
  subtitle?: string;
  /** Sections of the legal document */
  children: React.ReactNode;
  /** Base path for navigation links (e.g. "/" or "/admin") */
  basePath?: string;
}

interface RelatedLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const RELATED_LINKS: RelatedLink[] = [
  { href: '/politica-de-privacidad', label: 'Política de Privacidad', icon: Shield },
  { href: '/terminos-de-servicio', label: 'Términos de Servicio', icon: FileText },
  { href: '/politica-de-cookies', label: 'Política de Cookies', icon: Cookie },
  { href: '/aviso-legal', label: 'Aviso Legal', icon: Scale },
];

/**
 * LegalLayout — A shared layout component for legal pages (Privacy Policy,
 * Terms of Service, Cookie Policy, Legal Notice).
 *
 * Provides consistent dark-mode styling, navigation back to home/login,
 * cross-links between legal documents, and a "last updated" date.
 */
export function LegalLayout({
  title,
  lastUpdated,
  lastUpdatedDisplay,
  subtitle,
  children,
  basePath = '',
}: LegalLayoutProps) {
  const displayDate = lastUpdatedDisplay || formatDate(lastUpdated);

  return (
    <>
      <Head>
        <title>{`${title} | TAD DOOH`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={subtitle || title} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={`${title} | TAD DOOH`} />
        <meta property="og:description" content={subtitle || title} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`${basePath}/${slugify(title)}`} />
      </Head>

      <div className="relative min-h-screen bg-black text-white font-sans selection:bg-[#FDCB01] selection:text-black">
        {/* Decorative background — same as login pages */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-[#FDCB01]/[0.05] blur-[130px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-blue-600/[0.04] blur-[110px] rounded-full" />
        </div>

        <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-16">
          {/* Top bar with logo and back link */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href={`${basePath}/login`}
              className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-[#FDCB01]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Volver
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDCB01] text-black font-black tracking-tighter text-sm">
              TAD
            </div>
          </div>

          {/* Document header */}
          <header className="mb-10 border-b border-white/10 pb-8">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-base text-white/60 leading-relaxed">
                {subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Vigente
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                Última actualización: {displayDate}
              </span>
            </div>
          </header>

          {/* Document body — prose styling */}
          <article className="prose-legal">{children}</article>

          {/* Footer with cross-links to other legal pages */}
          <footer className="mt-16 border-t border-white/10 pt-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40 mb-4">
              Documentos relacionados
            </h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RELATED_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={`${basePath}${link.href}`}
                    className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-all hover:border-[#FDCB01]/40 hover:bg-white/[0.04]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDCB01]/10 text-[#FDCB01]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-bold text-white/80 group-hover:text-white">
                      {link.label}
                    </span>
                    <span className="text-white/30 group-hover:text-[#FDCB01] transition-colors">→</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-10 pt-6 border-t border-white/5 text-center text-[11px] text-white/30">
              <p>© {new Date().getFullYear()} TAD Taxi Advertising S.R.L. — Todos los derechos reservados.</p>
              <p className="mt-1">
                RNC: [Tu-RNC] · Av. [Tu-Dirección], Santo Domingo, República Dominicana
              </p>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

export interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/** Section component for legal documents — provides anchor IDs and consistent heading */
export function LegalSection({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-white/70">
        {children}
      </div>
    </section>
  );
}

/** Bullet list for legal content */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="my-3 space-y-2 pl-4 border-l-2 border-[#FDCB01]/30">
      {items.map((item, idx) => (
        <li key={idx} className="text-[15px] leading-relaxed text-white/70 pl-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Highlighted callout for important legal notices */
export function LegalCallout({ children, type = 'info' }: { 
  children: React.ReactNode; 
  type?: 'info' | 'warning' | 'critical' 
}) {
  const styles = {
    info: 'border-[#FDCB01]/40 bg-[#FDCB01]/[0.04] text-white/80',
    warning: 'border-amber-500/40 bg-amber-500/[0.04] text-amber-100',
    critical: 'border-red-500/40 bg-red-500/[0.04] text-red-200',
  };
  return (
    <div className={`my-4 rounded-lg border-l-4 px-4 py-3 ${styles[type]}`}>
      <div className="text-[14px] leading-relaxed">{children}</div>
    </div>
  );
}

/** Inline highlight for key terms */
export function LegalHighlight({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-white">{children}</strong>;
}

/** Table for structured legal data */
export function LegalTable({ headers, rows }: { 
  headers: string[]; 
  rows: string[][] 
}) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.04]">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/50"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, i) => (
            <tr key={i} className="text-white/70">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[14px] leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// === Helpers ===

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}
