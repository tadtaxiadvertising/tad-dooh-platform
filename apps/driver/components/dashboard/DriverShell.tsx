// apps/driver/components/dashboard/DriverShell.tsx
/**
 * DriverShell — Shell orquestador del Driver Portal con 4 tabs internos.
 *
 * ARQUITECTURA:
 *  - Los hooks (useTelemetry, useDriverHub, usePaymentStore) viven en
 *    pages/driver/dashboard.tsx y se pasan como props a este shell.
 *  - El shell gestiona el estado del tab activo (useState).
 *  - Los tabs cambian SOLO el JSX del <main>, lo que significa que los hooks
 *    del dashboard NO se desmontan (startTracking/stopTracking no se re-envocan).
 *  - La BottomNavigationBar se renderiza a nivel shell, no por página.
 *
 * Z-INDEX MAP:
 *  30 — BottomNavigationBar
 *  40 — StatusBar (header, ya existente)
 *  95 — DriverOnboardingModal
 * 100 — LockdownScreen
 */
'use client';

import React, { useState } from 'react';
import { BottomNavigationBar, type DriverTab } from './BottomNavigationBar';
import { RoutesTab } from './RoutesTab';
import { SettingsTab } from './SettingsTab';
import { WalletTab } from './WalletTab';
import {
  DriverWalletCard,
  DriverWalletCardSkeleton,
} from './DriverWalletCard';
import { GrowthCenter } from './GrowthCenter';
import { PulseDot } from './dashboard-utils';
import type { WalletState } from './DriverWalletCard';
import type { DriverHubData } from '../../hooks/useDriverHub';

// ─── Types ───────────────────────────────────────────────────────────────────
type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface DriverShellProps {
  // Telemetría (useTelemetry) — passed through for display only
  connectionStatus: ConnectionStatus;
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  // Hub
  hubData: DriverHubData | null;
  isLocalMode: boolean;
  // Wallet card state
  walletState: WalletState | null;
  // Actions
  onSupport: () => void;
  onReportFalla: () => void;
  onReferir: () => void;
  onLogout: () => void;
  // Sync
  syncingNow: boolean;
  onSincronizar: () => void;
  // Injected children (rendered at shell level for z-index control)
  statusBar?: React.ReactNode;
  readinessCard?: React.ReactNode;
  onboardingModal?: React.ReactNode;
  lockdownScreen?: React.ReactNode;
}

// ─── EarningsLedger (inline, moved from dashboard.tsx) ─────────────────────────
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
  const remaining = Math.max(0, max - current);
  const filledSlots = Math.max(0, Math.min(totalSlots, slotsUsed));

  return (
    <section
      className="rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-5 backdrop-blur-sm"
      aria-label="Ledger de Ganancias"
    >
      <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-1">
        Ganancias del Mes
      </p>
      <p
        className="text-white font-black tracking-tighter font-mono leading-none"
        style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)' }}
      >
        RD${current.toLocaleString('es-DO')}
      </p>
      <div className="flex items-center justify-between mt-1 mb-4">
        <span className="text-neutral-500 text-xs">
          Tope: <strong className="text-neutral-300">RD${max.toLocaleString('es-DO')}</strong>
          <span className="text-neutral-700 ml-1">({totalSlots} slots max)</span>
        </span>
        <span className="text-neutral-500 text-xs">
          Slots: <strong className="text-[#FFD400]">{slotsUsed}/{totalSlots}</strong>
        </span>
      </div>
      <div
        className="w-full h-3 bg-neutral-900 border border-neutral-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pctIncome}
        aria-valuemin={0}
        aria-valuemax={100}
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
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">0 slots</span>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          Ingresos {pctIncome}% · Slots {filledSlots}/{totalSlots}
        </span>
        <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{totalSlots} slots</span>
      </div>
      <p className="text-[10px] text-neutral-500 font-semibold mt-2">
        Faltan <span className="text-[#FFD400]">RD${remaining.toLocaleString('es-DO')}</span> para RD${max.toLocaleString('es-DO')}
      </p>
    </section>
  );
}

// ─── HomeTab (inline) — El contenido principal del dashboard migrado ──────────
function HomeTab({
  hubData,
  isLocalMode,
  walletState,
  connectionStatus,
  readinessCard,
}: {
  hubData: DriverHubData | null;
  isLocalMode: boolean;
  walletState: WalletState | null;
  connectionStatus: ConnectionStatus;
  readinessCard?: React.ReactNode;
}) {
  const serviceBannerConfig =
    connectionStatus === 'offline'
      ? { label: 'MODO OFFLINE: Guardando local y reintentando en segundo plano', color: '#f97316', bg: '#2a1405', border: '#ea580c' }
      : connectionStatus === 'syncing'
        ? { label: 'SINCRONIZANDO TELEMETRÍA...', color: '#FFD400', bg: '#1a1400', border: '#FFD400' }
        : { label: 'SERVICIO ACTIVO: PUBLICIDAD EN CURSO', color: '#22c55e', bg: '#052e16', border: '#16a34a' };

  return (
    <div className="space-y-5">
      {isLocalMode && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 backdrop-blur-md px-4 py-3" role="status" aria-live="polite">
          <p className="text-xs font-black tracking-wide text-amber-200">⚠️ Operando en Modo Local (Red Inestable)</p>
        </div>
      )}

      {/* Service Status Banner */}
      <div
        className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border backdrop-blur-sm"
        style={{ backgroundColor: serviceBannerConfig.bg, borderColor: serviceBannerConfig.border }}
        role="status"
        aria-live="polite"
      >
        <PulseDot color={serviceBannerConfig.color} />
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: serviceBannerConfig.color }}>
          {serviceBannerConfig.label}
        </span>
      </div>

      {/* Readiness Card — injected from parent (exact same component as before) */}
      {readinessCard}

      {/* Wallet Card */}
      {walletState ? <DriverWalletCard wallet={walletState} /> : <DriverWalletCardSkeleton />}

      {/* Growth Center */}
      <GrowthCenter
        referralUrl={`/driver/onboarding?ref=${hubData?.driverId ?? 'tad500'}`}
        referralCode={hubData?.driverId ? `DRV-${hubData.driverId.slice(0, 6).toUpperCase()}` : 'DRV-TAD500'}
        onShare={() => {
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
              'noopener,noreferrer',
            );
          }
        }}
      />

      {/* Earnings Ledger */}
      <EarningsLedger
        current={walletState?.total ?? 0}
        max={7500}
        slotsUsed={hubData?.activeSlots ?? 0}
        totalSlots={hubData?.maxSlots ?? 15}
      />
    </div>
  );
}

// ─── DriverShell — Main Component ─────────────────────────────────────────────
export const DriverShell: React.FC<DriverShellProps> = ({
  connectionStatus,
  batchCount,
  offlineCount,
  isTracking,
  hubData,
  isLocalMode,
  walletState,
  statusBar,
  readinessCard,
  onboardingModal,
  lockdownScreen,
  onSupport,
  onReportFalla,
  onReferir,
  onLogout,
  syncingNow,
  onSincronizar,
}) => {
  const [activeTab, setActiveTab] = useState<DriverTab>('home');

  return (
    <>
      {/* Header fijo con telemetría — StatusBar injected from parent */}
      {statusBar}

      {/* Contenido principal con padding-top para header fijo + padding-bottom para bottom nav */}
      <main
        className="mx-auto max-w-md px-4 pt-20 pb-28 min-h-screen"
        id="dashboard-main"
        style={{ background: '#0a0a0a' }}
      >
        {/* Tab transitions with AnimatePresence for smooth fade */}
        {activeTab === 'home' && (
          <HomeTab
            connectionStatus={connectionStatus}
            hubData={hubData}
            isLocalMode={isLocalMode}
            walletState={walletState}
            readinessCard={readinessCard}
          />
        )}

        {activeTab === 'routes' && (
          <RoutesTab
            connectionStatus={connectionStatus}
            batchCount={batchCount}
            offlineCount={offlineCount}
            isTracking={isTracking}
            onSync={onSincronizar}
            syncingNow={syncingNow}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletTab
            connectionStatus={connectionStatus}
            hubData={hubData}
            walletState={walletState}
            isLocalMode={isLocalMode}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            connectionStatus={connectionStatus}
            batchCount={batchCount}
            offlineCount={offlineCount}
            isTracking={isTracking}
            onSync={onSincronizar}
            onSupport={onSupport}
            onReportFalla={onReportFalla}
            onReferir={onReferir}
            onLogout={onLogout}
            syncingNow={syncingNow}
          />
        )}

        {/* Footer info (only on home tab) */}
        {activeTab === 'home' && (
          <footer className="pt-8 text-center space-y-2">
            <p className="text-neutral-700 text-[10px] font-bold uppercase tracking-widest">
              TAD DOOH Platform v12.0.0
            </p>
            <p className="text-neutral-800 text-[9px] font-mono">
              GPS: {isTracking ? 'ACTIVO' : 'INACTIVO'} · Batch: {batchCount}/10 · Red: {connectionStatus.toUpperCase()}
            </p>
            {process.env.NODE_ENV !== 'production' && (
              <button
                id="debug-trigger-402"
                onClick={() => {
                  // Import dynamically to avoid circular deps
                  import('../../store/usePaymentStore').then(({ usePaymentStore }) => {
                    usePaymentStore.getState().setLock(true, 'DEBUG: Suscripción vencida (402)');
                  });
                }}
                className="mt-2 text-neutral-800 text-[9px] uppercase font-bold border border-neutral-900 px-3 py-1 hover:text-red-900 transition-colors"
              >
                Debug: Forzar Bloqueo 402
              </button>
            )}
          </footer>
        )}
      </main>

      {/* Bottom Navigation Bar — z-30, fija */}
      <BottomNavigationBar activeTab={activeTab} onChange={setActiveTab} />

      {/* Pantalla de Lockdown 402 */}
      {lockdownScreen}

      {/* Onboarding Modal */}
      {onboardingModal}
    </>
  );
};

export default DriverShell;