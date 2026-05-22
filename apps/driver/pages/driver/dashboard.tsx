// apps/driver/pages/driver/dashboard.tsx
import React, { useEffect } from 'react';
import Head from 'next/head';
import { useTelemetry } from '../../hooks/useTelemetry';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useDriverHub } from '../../hooks/useDriverHub';
import { Phone, Check, ShieldAlert, CreditCard, Lock, User, Loader2, Wifi, AlertCircle, ArrowRight } from 'lucide-react';
import api from '@tad/services';
import clsx from 'clsx';

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
  slotsUsed,
  totalSlots,
}: {
  current: number;
  max: number;
  slotsUsed: number;
  totalSlots: number;
}) {
  const pctIncome = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const pctSlots = totalSlots > 0 ? Math.min(100, Math.round((slotsUsed / totalSlots) * 100)) : 0;
  const pct = Math.max(pctIncome, pctSlots);
  const remaining = Math.max(0, max - current);
  const filledSlots = Math.max(0, Math.min(totalSlots, slotsUsed));

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
          <span className="text-neutral-700 ml-1">({totalSlots} slots max)</span>
        </span>
        <span className="text-neutral-500 text-xs">
          Slots: <strong className="text-[#FFD400]">{slotsUsed}/{totalSlots}</strong>
        </span>
      </div>

      {/* Barra de progreso */}
      <div
        className="w-full h-3 bg-neutral-900 border border-neutral-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pctIncome}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pctIncome}% de ingresos acumulados`}
      >
        <div
          className="h-full bg-[#FFD400] transition-all duration-700 ease-out"
          style={{ width: `${pctIncome}%` }}
        />
      </div>

      <div className="mt-2 w-full h-2 bg-neutral-900 border border-neutral-800 overflow-hidden" aria-hidden="true">
        <div
          className="h-full bg-[#f97316] transition-all duration-700 ease-out"
          style={{ width: `${pctSlots}%` }}
        />
      </div>

      {/* Slots visuales */}
      <div className="flex gap-1 mt-3" aria-hidden="true">
        {Array.from({ length: totalSlots }).map((_, i) => (
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
          Ingresos {pctIncome}% · Slots {filledSlots}/{totalSlots}
        </span>
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
          {totalSlots} slots
        </span>
      </div>

      <p className="text-[10px] text-neutral-500 font-semibold mt-2">
        Faltan <span className="text-[#FFD400]">RD${remaining.toLocaleString('es-DO')}</span> para RD${max.toLocaleString('es-DO')}
      </p>
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
  const { connectionStatus, batchCount, offlineCount, syncPending, startTracking, stopTracking, isTracking } =
    useTelemetry();
  const { data: hubData, loading: hubLoading, refresh: refreshHub } = useDriverHub();
  const { isLocked, message: lockMessage } = usePaymentStore();
  const [syncingNow, setSyncingNow] = React.useState(false);

  // Onboarding states
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [step, setStep] = React.useState(1);
  
  // Bank details
  const [bank, setBank] = React.useState<'Popular' | 'BHD' | 'Banreservas'>('Popular');
  const [accountName, setAccountName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [acceptInsurance, setAcceptInsurance] = React.useState(false);
  const [isPendingSync, setIsPendingSync] = React.useState(false);

  // Iniciar tracking GPS al montar y chequear onboarding bancario
  useEffect(() => {
    startTracking();

    const userStr = localStorage.getItem('tad_driver_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setAccountName(user.fullName || '');
      } catch (e) {
        console.error(e);
      }
    }

    const bankSetupDone = localStorage.getItem('tad_drv_bank_setup_done');
    if (!bankSetupDone) {
      setShowOnboarding(true);
    }

    // Check initial pending sync status
    const pending = localStorage.getItem('tad_pending_bank_sync');
    if (pending === 'true') {
      setIsPendingSync(true);
    }

    return () => stopTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync bank details effect
  useEffect(() => {
    const syncPendingBankDetails = async () => {
      const pending = localStorage.getItem('tad_pending_bank_sync');
      const detailsStr = localStorage.getItem('tad_offline_bank_details');
      if (pending === 'true' && detailsStr && navigator.onLine) {
        try {
          const details = JSON.parse(detailsStr);
          await api.post('/drivers/me/bank-details', details);
          localStorage.removeItem('tad_pending_bank_sync');
          setIsPendingSync(false);
          alert('¡Sincronización Exitosa! Sus datos bancarios se han guardado de forma segura en el servidor de TAD.');
        } catch (err) {
          console.error('Error in bank details auto-sync:', err);
        }
      }
    };

    window.addEventListener('online', syncPendingBankDetails);
    
    // Run sync immediately if connection is present
    if (navigator.onLine) {
      syncPendingBankDetails();
    }

    return () => window.removeEventListener('online', syncPendingBankDetails);
  }, []);

  const handleCompleteBankOnboarding = async () => {
    if (!acceptTerms || !acceptInsurance) {
      alert('Debes aceptar el contrato de servicio y el seguro de hardware.');
      return;
    }
    if (!accountName || !accountNumber) {
      alert('Por favor completa todos los datos bancarios.');
      return;
    }

    const bankDetails = {
      bank,
      accountName,
      accountNumber,
      contractAccepted: true,
      insuranceAccepted: true,
      agreementVersion: '2.0',
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('tad_offline_bank_details', JSON.stringify(bankDetails));
    localStorage.setItem('tad_drv_bank_setup_done', 'true');
    setShowOnboarding(false);

    if (navigator.onLine) {
      try {
        await api.post('/drivers/me/bank-details', bankDetails);
        localStorage.removeItem('tad_pending_bank_sync');
        setIsPendingSync(false);
        alert('¡Registro Bancario Completado! Sus datos han sido sincronizados.');
      } catch (err) {
        console.warn('Sync failed on completion, saving for offline sync:', err);
        localStorage.setItem('tad_pending_bank_sync', 'true');
        setIsPendingSync(true);
      }
    } else {
      localStorage.setItem('tad_pending_bank_sync', 'true');
      setIsPendingSync(true);
      alert('¡Modo Local Activado! Tus datos se han guardado localmente de forma segura. Se sincronizarán automáticamente al recuperar la señal de internet.');
    }
  };

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
    await syncPending();
    await refreshHub();
    setSyncingNow(false);
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
      ? { label: 'MODO LOCAL: Guardando y reintentando', color: '#f97316', bg: '#2a1405', border: '#ea580c' }
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

        {/* Offline Pending Sync Banner */}
        {isPendingSync && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center justify-between gap-3 text-orange-400">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 animate-pulse shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-left">
                Modo Local: Cuenta Bancaria Guardada (Pendiente de Red)
              </span>
            </div>
            <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-black uppercase tracking-widest">
              Offline
            </span>
          </div>
        )}

        {/* Ledger Financiero */}
        <EarningsLedger 
          current={hubData?.balance ?? 0} 
          max={7500}
          slotsUsed={hubData?.activeSlots ?? 0}
          totalSlots={hubData?.maxSlots ?? 15}
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

      {/* ─── ONBOARDING WIZARD OVERLAY ─── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2rem] p-6 lg:p-8 shadow-2xl relative my-auto">
            {/* Visual Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD400] to-transparent" />

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Socio Conductor · Registro Bancario
              </span>
              <span className="text-[10px] font-black text-[#FFD400] uppercase tracking-widest bg-[#FFD400]/10 px-2 py-1 rounded">
                Paso {step} de 3
              </span>
            </div>

            {/* STEP 1: Handshake, Contract and Compensation Formula */}
            {step === 1 && (
              <div className="space-y-5 text-left">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Contrato de Servicio <span className="text-[#FFD400]">v2.0</span>
                  </h3>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                    Términos de Operación & Compensación V12
                  </p>
                </div>

                <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-4 max-h-[30vh] overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-[#FFD400] uppercase">1. Seguro y Starter Kit</h4>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      El conductor acepta la responsabilidad civil y el cuidado del Starter Kit (Tablet y soporte especial). El costo de membresía anual de hardware es de <span className="text-white font-bold">RD$6,000</span> (con ITBIS del 18%).
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-[#FFD400] uppercase">2. Fórmula de Compensación V12</h4>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Tus ingresos mensuales se calculan en base a las campañas activas y conversiones de ventas generadas mediante el código QR:
                    </p>
                    <div className="bg-black/50 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-center text-white">
                      <span className="text-zinc-500 block uppercase font-bold text-[8px] mb-1 tracking-widest">Fórmula de Nómina</span>
                      RD$ Earnings = (Min(Ads, 15) × 500) + (CPA_Sales × 500)
                    </div>
                    <p className="text-neutral-500 text-[10px] leading-relaxed italic">
                      * Ads: Número de anuncios simultáneos en tu tablet (límite operativo absoluto de 15 slots por dispositivo).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-[#FFD400] uppercase">3. Sincronización y Transparencia</h4>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      La tablet recopila datos GPS en tiempo real. La manipulación o desconexión deliberada puede causar penalizaciones o la activación del Kill-Switch operativo (HTTP 402).
                    </p>
                  </div>
                </div>

                {/* Agreements checkboxes */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-[#FFD400] focus:ring-[#FFD400] accent-yellow-400"
                    />
                    <span className="text-[11px] text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                      Acepto formalmente el <span className="text-white font-bold">Contrato de Servicio HaaS v2.0</span> y las constantes de negocio de la plataforma TAD.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptInsurance}
                      onChange={(e) => setAcceptInsurance(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-2 border-white/10 bg-black text-[#FFD400] focus:ring-[#FFD400] accent-yellow-400"
                    />
                    <span className="text-[11px] text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                      Acepto la cobertura y cargo de <span className="text-white font-bold">Seguro de Hardware (RD$6,000/anual)</span> por responsabilidad del Starter Kit.
                    </span>
                  </label>
                </div>

                <button
                  onClick={() => {
                    if (!acceptTerms || !acceptInsurance) {
                      alert('Debes aceptar ambos términos contractuales antes de continuar.');
                      return;
                    }
                    setStep(2);
                  }}
                  className="w-full py-4.5 bg-[#FFD400] hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-wider rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Continuar al Paso Bancario
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Bank Selection */}
            {step === 2 && (
              <div className="space-y-6 text-left">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Selecciona tu <span className="text-[#FFD400]">Banco</span>
                  </h3>
                  <p className="text-zinc-500 text-xs">
                    Elige la entidad bancaria dominicana donde deseas recibir tus depósitos mensuales.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'Popular', name: 'Banco Popular Dominicano', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
                    { id: 'BHD', name: 'Banco BHD', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
                    { id: 'Banreservas', name: 'Banreservas', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBank(b.id as any);
                        setStep(3);
                      }}
                      className={clsx(
                        "p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] flex items-center justify-between group",
                        bank === b.id ? "border-[#FFD400] bg-zinc-900/60" : "border-white/5 bg-zinc-900/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-3 h-3 rounded-full", bank === b.id ? "bg-[#FFD400] animate-ping" : "bg-zinc-800")} />
                        <span className="text-sm font-black text-white uppercase tracking-tight">{b.name}</span>
                      </div>
                      <span className={clsx("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border", b.color)}>
                        {b.id}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="w-full py-4 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all active:scale-[0.98]"
                >
                  ← Volver a Contrato
                </button>
              </div>
            )}

            {/* STEP 3: Bank Details Form */}
            {step === 3 && (
              <div className="space-y-6 text-left">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Detalles de <span className="text-[#FFD400]">Cuenta</span>
                  </h3>
                  <p className="text-zinc-500 text-xs">
                    Ingresa el número de cuenta y titular de <span className="text-white font-bold">{bank}</span>.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">
                      Nombre del Titular
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 w-4 h-4 text-zinc-600" />
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="w-full bg-black border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-zinc-800 focus:outline-none focus:border-[#FFD400]/40 focus:bg-zinc-950 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">
                      Número de Cuenta
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-4 w-4 h-4 text-zinc-600" />
                      <input
                        type="tel"
                        pattern="[0-9]*"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234567890"
                        className="w-full bg-black border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono font-bold text-white placeholder:text-zinc-800 focus:outline-none focus:border-[#FFD400]/40 focus:bg-zinc-950 transition-all"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-zinc-600 ml-1 leading-relaxed">
                      * Teclado numérico táctil activo. Introduzca solo números sin guiones ni espacios.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleCompleteBankOnboarding}
                    className="flex-1 py-4 bg-[#FFD400] hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-wider rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Guardar y Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
