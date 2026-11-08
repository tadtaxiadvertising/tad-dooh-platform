import React from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import {
  ShieldCheck,
  Activity,
  Zap,
  Cloud,
  Database,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import clsx from "clsx";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

function configuredConsoleUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export default function MonitoringPage() {
  const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID?.trim();
  const SENTRY_URL = "https://sentry.io/";
  const SUPABASE_URL = configuredConsoleUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  const services = [
    {
      name: "Sentry Error Tracking",
      icon: Activity,
      desc: "Consola para revisar los errores recibidos por Sentry.",
      link: SENTRY_URL,
      color: "text-purple-400",
    },
    {
      name: "Umami Analytics",
      icon: BarChart3,
      desc: "Consola para consultar la analítica del sitio configurado.",
      link: `https://cloud.umami.is/`,
      color: "text-blue-400",
    },
    {
      name: "Supabase DB & Auth",
      icon: Database,
      desc: "Motor de datos PostgreSQL y gestión de sesiones.",
      link: SUPABASE_URL,
      color: "text-emerald-400",
    },
    {
      name: "EasyPanel / VPS",
      icon: Cloud,
      desc: "Infraestructura de hosting y despliegue automático.",
      link: undefined,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 space-y-10">
      <Head>
        <title>Auditoría & Salud | TAD Platform</title>
      </Head>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-tad-yellow" />
            AUDITORÍA & <span className="text-tad-yellow">SALUD</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            Accesos a las herramientas de revisión. Esta página no comprueba su
            disponibilidad ni confirma que estén recibiendo datos.
          </p>
        </div>

        <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/50 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-zinc-500 rounded-full" />
            <span className="text-sm font-bold text-zinc-300">
              Estado pendiente de revisión
            </span>
          </div>
        </div>
      </div>

      {/* SERVICE STATUS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="card-premium p-6 flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className={clsx("p-3 rounded-2xl bg-white/5", svc.color)}>
                  <svc.icon className="w-6 h-6" />
                </div>
                <div className="px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-black rounded-md border border-zinc-700">
                  Sin verificar
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg">{svc.name}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  {svc.desc}
                </p>
              </div>
            </div>
            {svc.link ? (
              <a
                href={svc.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-tad-yellow transition-colors"
              >
                ACCEDER A CONSOLA
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <p className="mt-6 text-xs text-zinc-500">
                Enlace no configurado
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ANALYTICS PANEL — replaced iframe with direct link to avoid X-Frame-Options 404s */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            PANEL DE ANALÍTICA (UMAMI)
          </h2>
          <div className="px-4 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-full border border-zinc-700">
            Consola externa
          </div>
        </div>

        <div className="card-premium p-10 flex flex-col md:flex-row items-center gap-10">
          {/* Icon */}
          <div className="w-24 h-24 shrink-0 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20">
            <BarChart3 className="w-12 h-12 text-blue-400" />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <h3 className="text-xl font-bold">Umami Analytics Cloud</h3>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
              Abre Umami para comprobar los datos disponibles y la configuración
              del sitio. El enlace a la consola no confirma que la analítica
              esté activa; su carga en el portal depende de la configuración y
              del consentimiento.
            </p>
            <div className="text-xs text-zinc-500 font-mono break-all">
              {UMAMI_ID
                ? `Website ID: ${UMAMI_ID}`
                : "Sitio de Umami sin configurar"}
            </div>
          </div>

          {/* CTA */}
          <a
            href={
              UMAMI_ID
                ? `https://cloud.umami.is/websites/${encodeURIComponent(UMAMI_ID)}`
                : "https://cloud.umami.is/"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold rounded-2xl transition-all duration-300 hover:scale-105"
          >
            <ExternalLink className="w-4 h-4" />
            ABRIR EN UMAMI
          </a>
        </div>
      </div>

      {/* ADDITIONAL METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="card-premium p-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-tad-yellow/10 rounded-2xl flex items-center justify-center border border-tad-yellow/20">
              <Zap className="w-6 h-6 text-tad-yellow" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Rendimiento Técnico</h3>
              <p className="text-zinc-500 text-sm">Sin mediciones</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400">
            La latencia y la disponibilidad requieren mediciones de los
            servicios. Consulta sus consolas para revisar esos resultados.
          </p>
        </div>

        <div className="card-premium p-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
              <Activity className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Estado General</h3>
              <p className="text-zinc-500 text-sm">Sin revisión registrada</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400">
            Esta página no realiza una revisión automática de los servicios.
            Abre las consolas disponibles para comprobar su estado actual.
          </p>
        </div>
      </div>
    </div>
  );
}
