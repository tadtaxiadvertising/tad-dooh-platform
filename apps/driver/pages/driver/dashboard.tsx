// apps/driver/pages/driver/dashboard.tsx
import React, { useEffect, useRef } from 'react';
import Head from 'next/head';
import { useTelemetry } from '../../hooks/useTelemetry';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useDriverHub } from '../../hooks/useDriverHub';
import { Phone } from 'lucide-react';

// ─── Sub-componentes inline (sin librerías de UI externas) ────────────────────

/** Indicador de punto pulsante */
function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(255,212,0,0.5)]"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

/** Barra de estado superior fija */
function StatusBar({
  connectionStatus,
  batchCount,
  offlineCount,
}: {
  connectionStatus: 'online' | 'offline' | 'syncing';
  batchCount: number;
  offlineCount: number;
}) {
  const isOffline = connectionStatus === 'offline';
  const isSyncing = connectionStatus === 'syncing';

  let batchLabel: string;
  let batchColor: string;

  if (isOffline) {
    batchLabel = `MODO LOCAL · ${offlineCount} pts`;
    batchColor = '#ef4444'; // red-500 for attention
  } else if (isSyncing) {
    batchLabel = `SINCRONIZANDO...`;
    batchColor = '#FFD400';
  } else {
    batchLabel = `BATCH GPS: ${batchCount}/10`;
    batchColor = '#FFD400';
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-16 bg-black/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6"
      role="banner"
    >
      {/* GPS Status */}
      <div className="flex items-center gap-2.5" aria-label="Estado GPS">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isOffline ? '#ef4444' : '#FFD400'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-[0.2em]"
          style={{ color: isOffline ? '#ef4444' : '#FFD400' }}
        >
          {isOffline ? 'Offline' : 'Tracking'}
        </span>
      </div>

      {/* Batch Monitor (centro) */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
        aria-live="polite"
        aria-label="Estado del lote de telemetría"
      >
        {isSyncing && <PulseDot color="#FFD400" />}
        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: batchColor }}>
          {batchLabel}
        </span>
      </div>

      {/* Red Status */}
      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center" aria-label={`Red: ${connectionStatus}`}>
        {isOffline ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
        )}
      </div>
    </header>
  );
}

/** Tarjeta de Ganancias con Ledger Financiero */
function EarningsLedger({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const remaining = max - current;
  const slots = 15;
  const filledSlots = Math.round((current / max) * slots);

  return (
    <section
      className="bg-[#0a0a0a] border-2 border-neutral-900 p-5"
      aria-label="Ledger de Ganancias"
    >
      <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-1">
        Ganancias del Mes
      </p>

      <p
        className="text-white font-black tracking-tighter font-mono leading-none"
        style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)' }}
        aria-label={`RD$ ${current.toLocaleString('es-DO')}`}
      >
        RD${current.toLocaleString('es-DO')}
      </p>

      {/* Tope y Slots */}
      <div className="flex items-center justify-between mt-1 mb-4">
        <span className="text-neutral-500 text-xs">
          Tope: <strong className="text-neutral-300">RD${max.toLocaleString('es-DO')}</strong>
          <span className="text-neutral-700 ml-1">(15 slots max)</span>
        </span>
        <span className="text-neutral-500 text-xs">
          Faltan: <strong className="text-[#FFD400]">RD${remaining.toLocaleString('es-DO')}</strong>
        </span>
      </div>

      {/* Barra de progreso */}
      <div
        className="w-full h-4 bg-neutral-900 border border-neutral-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% del tope mensual alcanzado`}
      >
        <div
          className="h-full bg-[#FFD400] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Slots visuales */}
      <div className="flex gap-1 mt-3" aria-hidden="true">
        {Array.from({ length: slots }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5"
            style={{ backgroundColor: i < filledSlots ? '#FFD400' : '#262626' }}
          />
        ))}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
          0 slots
        </span>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          {pct}% · Slot {filledSlots}/{slots}
        </span>
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
          15 slots
        </span>
      </div>
    </section>
  );
}

/** Botones de acciones con hit-targets masivos */
function ActionButton({
  id,
  label,
  sublabel,
  color,
  onClick,
  icon,
}: {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex flex-col items-center justify-center min-h-[120px] bg-white/[0.03] border border-white/5 rounded-3xl
                 hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.96] active:bg-white/[0.1]
                 transition-all duration-200 p-5 group relative overflow-hidden"
      aria-label={label}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)` }}
      />
      <span className="relative z-10 transition-transform duration-300 group-hover:-translate-y-1" style={{ color }} aria-hidden="true">
        {icon}
      </span>
      <span className="text-white text-[11px] font-black uppercase tracking-tight mt-3 relative z-10">
        {label}
      </span>
      {sublabel && (
        <span className="text-neutral-500 text-[9px] uppercase tracking-[0.1em] mt-1 relative z-10 font-bold">
          {sublabel}
        </span>
      )}
    </button>
  );
}

/** LockdownScreen — Paradoja 402 */
function LockdownScreen({ message }: { message: string | null }) {
  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/18097000000?text=${encodeURIComponent('Necesito regularizar mi pago de RD$6,000 para reactivar el servicio TAD.')}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCall = () => {
    window.location.href = 'tel:+18097000000';
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col p-8 overflow-y-auto animate-in fade-in duration-700"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto text-center">
        {/* Animated Shield */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-red-500/20 blur-[50px] rounded-full animate-pulse" />
          <div className="relative w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-center shadow-2xl">
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        <h1
          className="text-white font-black tracking-tighter uppercase leading-tight mb-4"
          style={{ fontSize: 'clamp(2rem, 10vw, 2.75rem)' }}
        >
          Servicio<br />
          <span className="text-red-500">Bloqueado</span>
        </h1>

        <p className="text-neutral-400 font-bold text-lg leading-snug mb-2">
          Tu cuenta tiene un pago pendiente de
        </p>
        <div className="inline-block px-6 py-3 bg-white/5 border border-white/10 rounded-2xl mb-8">
          <span className="text-white text-3xl font-black tabular-nums">RD$6,000</span>
          <span className="text-neutral-500 text-xs font-bold block mt-1 uppercase tracking-widest">Cuota Anual (Hardware)</span>
        </div>

        {message && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl mb-10 w-full">
            <p className="text-red-400 text-[10px] font-mono uppercase tracking-wider leading-relaxed">
              {message}
            </p>
          </div>
        )}

        <div className="w-full space-y-4">
          <button
            onClick={handleWhatsApp}
            className="w-full h-20 bg-tad-yellow hover:bg-white text-black font-black text-lg uppercase tracking-tighter rounded-3xl transition-all shadow-2xl shadow-tad-yellow/10 flex items-center justify-center gap-3 active:scale-95"
          >
            <span>Pagar vía WhatsApp</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </button>

          <button
            onClick={handleCall}
            className="w-full h-16 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest rounded-2xl transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            <span>Llamar a Soporte</span>
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-neutral-600 text-[10px] text-center font-bold uppercase tracking-[0.3em]">
        Tus datos se guardan localmente
      </p>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DriverDashboard() {
  const { connectionStatus, batchCount, offlineCount, startTracking, stopTracking, isTracking } =
    useTelemetry();
  const { data: hubData, loading: hubLoading, refresh: refreshHub } = useDriverHub();
  const { isLocked, message: lockMessage } = usePaymentStore();
  const [syncingNow, setSyncingNow] = React.useState(false);

  // Iniciar tracking GPS al montar
  useEffect(() => {
    startTracking();
    return () => stopTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const handleSupport = () => {
    window.open(
      `https://wa.me/18097000000?text=${encodeURIComponent('Necesito soporte técnico con la app TAD Driver.')}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleReportFalla = () => {
    window.open(
      `https://wa.me/18097000000?text=${encodeURIComponent('Quiero reportar una falla en el dispositivo TAD.')}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleSincronizar = async () => {
    setSyncingNow(true);
    // Fuerza un flush inmediato y refresca el hub
    stopTracking();
    startTracking();
    await refreshHub();
    setTimeout(() => setSyncingNow(false), 1500);
  };

  const handleReferir = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Únete a TAD Driver',
        text: 'Gana hasta RD$7,500 al mes poniendo publicidad en tu taxi. Únete con mi enlace:',
        url: window.location.origin + '/driver/onboarding',
      }).catch(() => undefined);
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent('Gana hasta RD$7,500 al mes con TAD Driver: ' + window.location.origin + '/driver/onboarding')}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  // ─── Banner de estado del servicio ────────────────────────────────────────
  const serviceBannerConfig =
    connectionStatus === 'offline'
      ? { label: 'MODO OFFLINE: Guardando localmente', color: '#71717a', bg: '#18181b', border: '#3f3f46' }
      : connectionStatus === 'syncing'
      ? { label: 'SINCRONIZANDO TELEMETRÍA...', color: '#FFD400', bg: '#1a1400', border: '#FFD400' }
      : { label: 'SERVICIO ACTIVO: PUBLICIDAD EN CURSO', color: '#22c55e', bg: '#052e16', border: '#16a34a' };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-10 font-sans">
      <Head>
        <title>TAD Driver | Monitor Operativo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="description" content="Panel de control operativo para conductores TAD DOOH" />
      </Head>

      {/* Header fijo con telemetría */}
      <StatusBar
        connectionStatus={connectionStatus}
        batchCount={batchCount}
        offlineCount={offlineCount}
      />

      {/* Contenido principal con padding-top para el header fijo */}
      <main className="max-w-md mx-auto pt-[72px] px-4 space-y-5" id="dashboard-main">

        {/* Banner de Estado de Servicio */}
        <div
          className="flex items-center justify-center gap-2 py-2.5 px-3 border"
          style={{
            backgroundColor: serviceBannerConfig.bg,
            borderColor: serviceBannerConfig.border,
          }}
          role="status"
          aria-live="polite"
        >
          <PulseDot color={serviceBannerConfig.color} />
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: serviceBannerConfig.color }}
          >
            {serviceBannerConfig.label}
          </span>
        </div>

        {/* Ledger Financiero */}
        <EarningsLedger 
          current={hubData?.balance ?? 0} 
          max={7500} 
        />

        {/* Herramientas del Chofer */}
        <section aria-labelledby="quick-actions-title">
          <h2
            id="quick-actions-title"
            className="text-neutral-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3 ml-0.5"
          >
            Operaciones Tácticas
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              id="btn-soporte"
              label="Soporte"
              sublabel="WhatsApp"
              color="#FFD400"
              onClick={handleSupport}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
              }
            />

            <ActionButton
              id="btn-reportar"
              label="Reportar Falla"
              sublabel="Dispositivo"
              color="#ef4444"
              onClick={handleReportFalla}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
            />

            <ActionButton
              id="btn-sincronizar"
              label="Sincronizar"
              sublabel={syncingNow ? 'Sincronizando...' : (offlineCount > 0 ? `${offlineCount} pendientes` : 'Al día')}
              color={syncingNow ? '#FFD400' : '#22c55e'}
              onClick={handleSincronizar}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <polyline points="23 20 23 14 17 14" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
              }
            />

            <ActionButton
              id="btn-referir"
              label="Referir Conductor"
              sublabel="Compartir enlace"
              color="#3b82f6"
              onClick={handleReferir}
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 text-center space-y-2">
          <p className="text-neutral-700 text-[10px] font-bold uppercase tracking-widest">
            TAD DOOH Platform v11.0.0
          </p>
          <p className="text-neutral-800 text-[9px] font-mono">
            GPS: {isTracking ? 'ACTIVO' : 'INACTIVO'} · Batch: {batchCount}/10 · Red: {connectionStatus.toUpperCase()}
          </p>

          {/* Dev-only: Debug trigger */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              id="debug-trigger-402"
              onClick={() => usePaymentStore.getState().setLock(true, 'DEBUG: Suscripción vencida (402)')}
              className="mt-2 text-neutral-800 text-[9px] uppercase font-bold border border-neutral-900 px-3 py-1 hover:text-red-900 transition-colors"
            >
              Debug: Forzar Bloqueo 402
            </button>
          )}
        </footer>
      </main>

      {/* ⚠️ Pantalla de Lockdown 402 — bloquea toda interacción */}
      {isLocked && <LockdownScreen message={lockMessage} />}
    </div>
  );
}
