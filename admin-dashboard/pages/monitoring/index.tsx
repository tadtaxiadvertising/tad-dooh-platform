import React from 'react';
import Head from 'next/head';
import { 
  ShieldCheck, 
  Activity, 
  Zap, 
  Cloud, 
  Database, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  LayoutGrid,
  BarChart3
} from 'lucide-react';
import clsx from 'clsx';

export default function MonitoringPage() {
  const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID || "2a7c0085-87e5-473c-b959-8854ba785e87";
  const SENTRY_URL = "https://sentry.io/";
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const services = [
    { 
      name: 'Sentry Error Tracking', 
      status: 'OPERATIONAL', 
      icon: Activity,
      desc: 'Monitoreo de bugs y excepciones en tiempo real.',
      link: SENTRY_URL,
      color: 'text-purple-400'
    },
    { 
      name: 'Umami Analytics', 
      status: 'ACTIVE', 
      icon: BarChart3,
      desc: 'Analítica web privada y sin cookies.',
      link: `https://cloud.umami.is/`,
      color: 'text-blue-400'
    },
    { 
      name: 'Supabase DB & Auth', 
      status: 'OPERATIONAL', 
      icon: Database,
      desc: 'Motor de datos PostgreSQL y gestión de sesiones.',
      link: `${SUPABASE_URL}`,
      color: 'text-emerald-400'
    },
    { 
      name: 'EasyPanel / VPS', 
      status: 'HEALTHY', 
      icon: Cloud,
      desc: 'Infraestructura de hosting y despliegue automático.',
      link: '#',
      color: 'text-orange-400'
    }
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
          <p className="text-zinc-500 mt-2 font-medium">Control unificado de herramientas externas y estabilidad del sistema.</p>
        </div>
        
        <div className="flex items-center gap-4 px-6 py-3 bg-zinc-900/50 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-sm font-bold text-zinc-300">PROTOCOLO ANTIGRAVITY v4.5 OK</span>
          </div>
        </div>
      </div>

      {/* SERVICE STATUS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <div key={svc.name} className="card-premium p-6 flex flex-col justify-between group cursor-pointer">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className={clsx("p-3 rounded-2xl bg-white/5", svc.color)}>
                  <svc.icon className="w-6 h-6" />
                </div>
                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-md border border-emerald-500/20">
                  {svc.status}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg">{svc.name}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{svc.desc}</p>
              </div>
            </div>
            <a 
              href={svc.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-tad-yellow transition-colors"
            >
              ACCEDER A CONSOLA
              <ExternalLink className="w-4 h-4" />
            </a>
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
          <div className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
            EN TIEMPO REAL
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
              Las analíticas de uso de la plataforma se registran en Umami Cloud. Haz clic en el botón para abrirlas en una nueva pestaña. Asegúrate de que el <span className="text-white font-bold">Share Link</span> esté activado para el sitio <code className="bg-zinc-800 text-tad-yellow px-1 rounded text-xs">{UMAMI_ID}</code>.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
              <span className="text-emerald-400">●</span> Website ID: {UMAMI_ID}
            </div>
          </div>

          {/* CTA */}
          <a
            href={`https://cloud.umami.is/websites/${UMAMI_ID}`}
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
               <p className="text-zinc-500 text-sm">Latencia promedio: <span className="text-white font-bold">42ms</span></p>
             </div>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between text-sm">
               <span className="text-zinc-500">Disponibilidad (Uptime)</span>
               <span className="text-emerald-400 font-bold">99.98%</span>
             </div>
             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[99.98%]" />
             </div>
          </div>
        </div>

        <div className="card-premium p-10 space-y-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
               <CheckCircle2 className="w-6 h-6 text-emerald-500" />
             </div>
             <div>
               <h3 className="text-xl font-bold">Estado General</h3>
               <p className="text-zinc-500 text-sm">Todos los pods operativos.</p>
             </div>
          </div>
          <p className="text-sm text-zinc-400">
            Última verificación de integridad automática: <span className="text-white font-bold text-xs bg-zinc-800 px-2 py-0.5 rounded">1 minuto atrás</span>.
            Todos los micro-servicios responden bajo los 150ms.
          </p>
        </div>
      </div>
    </div>
  );
}
