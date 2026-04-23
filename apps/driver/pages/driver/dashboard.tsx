// apps/driver/pages/driver/dashboard.tsx
import React, { useEffect, useRef } from 'react';
import Head from 'next/head';
import { useTelemetry } from '../../hooks/useTelemetry';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useDriverHub } from '../../hooks/useDriverHub';

// ─── Sub-componentes inline (sin librerías de UI externas) ────────────────────

/** Indicador de punto pulsante */
function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
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
    batchLabel = `OFFLINE · Guardado local (${offlineCount}/${500})`;
    batchColor = '#71717a'; // zinc-500
  } else if (isSyncing) {
    batchLabel = `SINCRONIZANDO...`;
    batchColor = '#FFD400';
  } else {
    batchLabel = `LOTE GPS: ${batchCount}/10`;
    batchColor = '#FFD400';
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#0a0a0a] border-b border-neutral-800 flex items-center justify-between px-4"
      role="banner"
    >
      {/* GPS Status */}
      <div className="flex items-center gap-2" aria-label="Estado GPS">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isOffline ? '#52525b' : '#FFD400'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        <span
          className="text-[10px] font-black uppercase tracking-tighter"
          style={{ color: isOffline ? '#52525b' : '#FFD400' }}
        >
          GPS
        </span>
      </div>

      {/* Batch Monitor (centro) */}
      <div
        className="flex items-center gap-2 px-3 py-1 border"
        style={{
          borderColor: isOffline ? '#3f3f46' : '#FFD400',
          backgroundColor: isOffline ? '#18181b' : 'transparent',
        }}
        aria-live="polite"
        aria-label="Estado del lote de telemetría"
      >
        {isSyncing && <PulseDot color="#FFD400" />}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={batchColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
        </svg>
        <span className="text-[10px] font-black tracking-tight" style={{ color: batchColor }}>
          {batchLabel}
        </span>
      </div>

      {/* Red Status */}
      <div aria-label={`Red: ${connectionStatus}`}>
        {isOffline ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
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
      className="flex flex-col items-center justify-center min-h-[110px] bg-neutral-900 border-b-4 border-neutral-800
                 active:border-b-0 active:translate-y-[3px] active:bg-neutral-800
                 transition-transform duration-75 p-4 cursor-pointer select-none"
      aria-label={label}
    >
      <span style={{ color }} aria-hidden="true">
        {icon}
      </span>
      <span className="text-white text-xs font-black uppercase tracking-tighter mt-2">
        {label}
      </span>
      {sublabel && (
        <span className="text-neutral-500 text-[9px] uppercase tracking-wider mt-0.5">
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
      className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col p-6 overflow-y-auto"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lockdown-title"
      aria-describedby="lockdown-desc"
    >
      <div className="flex flex-col items-center mt-12 mb-10">
        {/* Shield Icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-6"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>

        <h1
          id="lockdown-title"
          className="text-white font-black tracking-tighter text-center leading-none mb-4"
          style={{ fontSize: 'clamp(2rem, 8vw, 3rem)' }}
        >
          CUOTA NO PAGADA
        </h1>

        <p
          id="lockdown-desc"
          className="text-neutral-400 text-center font-bold text-base leading-snug max-w-xs"
        >
          Tu cuenta ha sido suspendida. Regulariza tu pago de{' '}
          <strong className="text-white">RD$6,000</strong> para reanudar el servicio y tus ganancias.
        </p>

        {message && (
          <p className="text-neutral-600 text-xs text-center mt-3 font-mono border border-neutral-800 px-3 py-1">
            {message}
          </p>
        )}
      </div>

      <div className="space-y-3 mt-auto mb-8 w-full max-w-sm mx-auto">
        <button
          id="lockdown-whatsapp-btn"
          onClick={handleWhatsApp}
          className="w-full flex items-center justify-center gap-3 h-20 font-black text-xl uppercase tracking-tighter
                     bg-[#FFD400] text-black active:bg-[#e6bf00] transition-colors"
          aria-label="Pagar via WhatsApp"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Pagar vía WhatsApp
        </button>

        <button
          id="lockdown-call-btn"
          onClick={handleCall}
          className="w-full flex items-center justify-center gap-3 h-20 font-black text-xl uppercase tracking-tighter
                     bg-white text-black active:bg-neutral-200 transition-colors"
          aria-label="Llamar a soporte técnico"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 011 1.22 2 2 0 013 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
          </svg>
          Llamar a Soporte
        </button>

        <p className="text-neutral-700 text-[10px] text-center font-bold uppercase tracking-widest pt-2">
          Tus datos acumulados están a salvo localmente
        </p>
      </div>
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
