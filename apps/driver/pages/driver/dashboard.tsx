// apps/driver/pages/driver/dashboard.tsx
import React, { useEffect } from 'react';
import Head from 'next/head';
import api, { supabase } from '@tad/services';
import { useBackgroundTelemetry } from '../../hooks/useBackgroundTelemetry';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useDriverHub } from '../../hooks/useDriverHub';
import { BankForm, getDriverBankPendingKey } from '../../components/BankForm';
import { ChevronRight, CreditCard, Landmark, Phone, ShieldCheck, X } from 'lucide-react';
import { DriverShell } from '../../components/dashboard/DriverShell';
import { calculateWalletTotal, type WalletState } from "../../components/dashboard/DriverWalletCard";

const DRIVER_AGREEMENT_VERSION = '2.0 (HaaS)';
const DRIVER_STARTER_KIT_FEE_RD = 6000;

const DRIVER_REFERRAL_STORAGE_KEY = 'tad_driver_referrals_v1';

function getReferralFinancialsFromStorage(): { referredAdvertisers: number; referredDrivers: number } {
  if (typeof window === 'undefined') return { referredAdvertisers: 0, referredDrivers: 0 };

  const raw = localStorage.getItem(DRIVER_REFERRAL_STORAGE_KEY);
  if (!raw) return { referredAdvertisers: 0, referredDrivers: 0 };

  try {
    const parsed = JSON.parse(raw) as { referredAdvertisers?: number; referredDrivers?: number };
    return {
      referredAdvertisers: Number.isFinite(parsed.referredAdvertisers) ? Math.max(0, parsed.referredAdvertisers ?? 0) : 0,
      referredDrivers: Number.isFinite(parsed.referredDrivers) ? Math.max(0, parsed.referredDrivers ?? 0) : 0,
    };
  } catch {
    return { referredAdvertisers: 0, referredDrivers: 0 };
  }
}


type DriverOnboardingStage = 'contract' | 'bank' | 'payment' | 'ready';

type DriverReadinessData = {
  agreementVersion: string | null;
  bankAccountConfigured: boolean;
  contractAccepted: boolean;
  driverId: string;
  onboardingStatus: string;
  subscriptionPaid: boolean;
};

const getDriverOnboardingStorageKey = (driverId: string) => `tad_driver_dashboard_onboarding_seen_v2_${driverId}`;

const getDriverOnboardingStage = (
  hubData: DriverReadinessData | null,
  bankPendingSync: boolean,
): DriverOnboardingStage => {
  if (!hubData?.contractAccepted) return 'contract';
  if (!hubData.bankAccountConfigured && !bankPendingSync) return 'bank';
  if (!hubData.subscriptionPaid) return 'payment';
  return 'ready';
};

function ReadinessItem({
  complete,
  detail,
  label,
}: {
  complete: boolean;
  detail: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
        <span
          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'
            }`}
        >
          {complete ? 'OK' : 'Pendiente'}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{detail}</p>
    </div>
  );
}

function DriverReadinessCard({
  bankPendingSync,
  hubData,
  onOpen,
}: {
  bankPendingSync: boolean;
  hubData: DriverReadinessData | null;
  onOpen: () => void;
}) {
  if (!hubData) return null;

  const contractReady = hubData.contractAccepted;
  const bankReady = hubData.bankAccountConfigured || bankPendingSync;
  const paymentReady = hubData.subscriptionPaid;
  const completedCount = [contractReady, bankReady, paymentReady].filter(Boolean).length;

  if (completedCount === 3) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-[#FFD400]/15 bg-[#14110a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FFD400]">Onboarding radial</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Tu unidad todavía no está 100% lista</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Completa contrato, cuenta bancaria y activación anual para operar sin fricción. La fórmula vigente sigue protegida:
            hasta 15 slots y RD$500 por campaña activa.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Avance</p>
          <p className="mt-1 text-3xl font-black text-white">{completedCount}/3</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <ReadinessItem
          label="Contrato y hardware V2"
          complete={contractReady}
          detail={
            contractReady
              ? `Aceptado${hubData.agreementVersion ? ` · ${hubData.agreementVersion}` : ''}`
              : 'Firma digital pendiente antes de pasar a la operación formal.'
          }
        />
        <ReadinessItem
          label="Cuenta bancaria dominicana"
          complete={bankReady}
          detail={
            hubData.bankAccountConfigured
              ? 'Cuenta registrada y confirmada por el backend.'
              : bankPendingSync
                ? 'Guardada localmente. Se sincronizará automáticamente cuando vuelva la red.'
                : 'Falta registrar banco, número de cuenta, tipo y cédula del titular.'
          }
        />
        <ReadinessItem
          label="Starter Kit anual"
          complete={paymentReady}
          detail={
            paymentReady
              ? 'Membresía anual operativa y sin bloqueo.'
              : `Pendiente de pago por RD$${DRIVER_STARTER_KIT_FEE_RD.toLocaleString('es-DO')} para evitar bloqueo 402.`
          }
        />
      </div>

      <button
        onClick={onOpen}
        className="mt-5 w-full rounded-2xl bg-[#FFD400] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#ffe45c]"
      >
        Continuar preparación
      </button>
    </section>
  );
}

function DriverOnboardingModal({
  bankPendingSync,
  busy,
  hubData,
  onAcceptAgreement,
  onBankSuccess,
  onClose,
}: {
  bankPendingSync: boolean;
  busy: boolean;
  hubData: DriverReadinessData | null;
  onAcceptAgreement: () => void;
  onBankSuccess: () => void;
  onClose: () => void;
}) {
  if (!hubData) return null;

  const stage = getDriverOnboardingStage(hubData, bankPendingSync);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_30px_120px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Driver Readiness</p>
            <h3 className="text-lg font-black text-white">Preparación operativa del conductor</h3>
          </div>
          {/* X solo disponible en pasos no obligatorios (payment / ready) */}
          {stage === 'payment' || stage === 'ready' ? (
            <button
              onClick={onClose}
              className="rounded-full bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar onboarding"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div
              className="rounded-full bg-white/[0.03] p-2 text-zinc-800 cursor-not-allowed"
              role="img"
              title="Debes completar este paso obligatorio antes de continuar"
              aria-label="Cierre bloqueado — paso obligatorio"
            >
              <X className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            {stage === 'contract' && (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD400]/20 bg-[#FFD400]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#FFD400]">
                  <ShieldCheck className="h-4 w-4" />
                  Contrato de servicio
                </div>
                <div>
                  <h4 className="text-3xl font-black tracking-tight text-white">Acepta el acuerdo V2 antes de salir a pista</h4>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                    Este paso deja formalizado el servicio, el uso del hardware y la continuidad del esquema de pagos.
                    La operación mantiene el límite de 15 slots y la lógica de RD$500 por campaña activa.
                  </p>
                </div>
                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Resumen contractual</p>
                  <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                    <li>Pago anual del Starter Kit: RD$6,000 con ITBIS integrado.</li>
                    <li>El kill-switch 402 se activa automáticamente si la membresía queda morosa.</li>
                    <li>La PWA sigue operando offline-first y sincroniza al volver la red.</li>
                  </ul>
                </div>
                <button
                  onClick={onAcceptAgreement}
                  disabled={busy}
                  className="inline-flex items-center gap-3 rounded-2xl bg-[#FFD400] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#ffe45c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{busy ? 'Registrando acuerdo...' : 'Aceptar contrato y continuar'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {stage === 'bank' && (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">
                  <Landmark className="h-4 w-4" />
                  Cuenta de pagos
                </div>
                <div>
                  <h4 className="text-3xl font-black tracking-tight text-white">Configura tu banco con modo offline-first</h4>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                    Si pierdes conectividad en ruta, los datos quedan guardados localmente y se reenvían por proxy seguro
                    al recuperar la red. Nunca pasan por una ruta pesada ni se pierde el formulario.
                  </p>
                </div>
                <BankForm driverId={hubData.driverId} onSuccess={onBankSuccess} />
              </div>
            )}

            {stage === 'payment' && (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                  <CreditCard className="h-4 w-4" />
                  Activación final
                </div>
                <div>
                  <h4 className="text-3xl font-black tracking-tight text-white">Solo falta activar la anualidad del Starter Kit</h4>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                    Contrato y cobro bancario ya están listos. El siguiente paso es regularizar el pago
                    anual de{' '}
                    <strong className="text-white">
                      RD${DRIVER_STARTER_KIT_FEE_RD.toLocaleString('es-DO')}
                    </strong>{' '}
                    <span className="text-zinc-500">(ITBIS 18% incluido)</span> para mantener la
                    unidad fuera del bloqueo 402.
                  </p>
                </div>
                <div className="rounded-3xl border border-[#FFD400]/15 bg-[#FFD400]/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Estado actual</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Onboarding</p>
                      <p className="mt-1 text-2xl font-black text-white">{hubData.onboardingStatus}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Slots máximos</p>
                      <p className="mt-1 text-2xl font-black text-white">15</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-3 rounded-2xl bg-[#FFD400] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#ffe45c]"
                >
                  Cerrar y seguir operando
                </button>
              </div>
            )}

            {stage === 'ready' && (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Unidad lista
                </div>
                <div>
                  <h4 className="text-3xl font-black tracking-tight text-white">Tu operación quedó preparada</h4>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                    Ya puedes seguir usando el dashboard con contrato, banco y anualidad completos.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-3 rounded-2xl bg-[#FFD400] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#ffe45c]"
                >
                  Abrir dashboard
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 bg-black/30 p-6 md:border-l md:border-t-0 md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Checklist de continuidad</p>
            <div className="mt-5 space-y-3">
              <ReadinessItem
                label="Contrato"
                complete={hubData.contractAccepted}
                detail={
                  hubData.contractAccepted
                    ? `Firmado${hubData.agreementVersion ? ` · ${hubData.agreementVersion}` : ''}`
                    : 'Falta firma electrónica'
                }
              />
              <ReadinessItem
                label="Banco"
                complete={hubData.bankAccountConfigured || bankPendingSync}
                detail={
                  hubData.bankAccountConfigured
                    ? 'Configurado en backend'
                    : bankPendingSync
                      ? 'Pendiente de sincronización'
                      : 'No configurado'
                }
              />
              <ReadinessItem
                label="Anualidad"
                complete={hubData.subscriptionPaid}
                detail={
                  hubData.subscriptionPaid
                    ? 'Operativa'
                    : `Pendiente RD$${DRIVER_STARTER_KIT_FEE_RD.toLocaleString('es-DO')}`
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  onLogout,
}: {
  connectionStatus: 'online' | 'offline' | 'syncing';
  batchCount: number;
  offlineCount: number;
  onLogout: () => void;
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

      <div className="flex items-center gap-2">
        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 hover:text-white hover:border-white/30 transition"
        >
          Salir
        </button>
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
      </div>
    </header>
  );
}


/** Botones de acciones con hit-targets masivos */

/** LockdownScreen — Paradoja 402 */
function LockdownScreen({ message }: { message: string | null }) {
  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/18495043872?text=${encodeURIComponent('Necesito regularizar mi pago de RD$6,000 para reactivar el servicio TAD.')}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCall = () => {
    window.location.href = 'tel:+18495043872';
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
    useBackgroundTelemetry();
  const { data: hubData, loading: hubLoading, isLocalMode, refresh: refreshHub } = useDriverHub();
  const { isLocked, message: lockMessage, setLock } = usePaymentStore();
  const [syncingNow, setSyncingNow] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [onboardingBusy, setOnboardingBusy] = React.useState(false);
  const [bankPendingSync, setBankPendingSync] = React.useState(false);
  const [walletState, setWalletState] = React.useState<WalletState | null>(null);

  // Iniciar tracking GPS al montar
  useEffect(() => {
    startTracking();
    return () => stopTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hubData?.driverId) return;

    const pendingKey = getDriverBankPendingKey(hubData.driverId);
    const onboardingKey = getDriverOnboardingStorageKey(hubData.driverId);
    const pendingSync = localStorage.getItem(pendingKey) === '1';
    const forceOnboarding = sessionStorage.getItem('tad_driver_force_onboarding') === '1';
    const hasSeenOnboarding = localStorage.getItem(onboardingKey) === '1';

    setBankPendingSync(pendingSync);

    // ── Guard mandatorio ──────────────────────────────────────────────────────
    // Re-abre el modal aunque el conductor ya lo haya "visto" si los pasos
    // obligatorios (contrato y banco) siguen incompletos. Evita el bypass
    // mediante el flag de localStorage.
    const isMandatoryIncomplete =
      !hubData.contractAccepted || (!hubData.bankAccountConfigured && !pendingSync);

    if (forceOnboarding || !hasSeenOnboarding || isMandatoryIncomplete) {
      setShowOnboarding(true);
    }
  }, [hubData?.driverId, hubData?.contractAccepted, hubData?.bankAccountConfigured]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hubData?.driverId) return;

    if (hubData.bankAccountConfigured) {
      localStorage.removeItem(getDriverBankPendingKey(hubData.driverId));
      setBankPendingSync(false);
    }
  }, [hubData?.bankAccountConfigured, hubData?.driverId]);

  // ─── Enforcer de Suscripción / Pago Anual 402 ──────────────────────────────
  useEffect(() => {
    if (!hubData) return;

    if (hubData.subscriptionPaid === false) {
      if (!showOnboarding) {
        setLock(true, 'Suscripción vencida. Pago de RD$6,000 requerido.');
      } else {
        setLock(false, null);
      }
    } else if (hubData.subscriptionPaid === true) {
      setLock(false, null);
    }
  }, [hubData?.subscriptionPaid, showOnboarding, setLock]);


  useEffect(() => {
    const referrals = getReferralFinancialsFromStorage();
    const ads = hubData?.activeSlots ?? 0;
    const nextWallet: WalletState = {
      ads,
      referredAdvertisers: referrals.referredAdvertisers,
      referredDrivers: referrals.referredDrivers,
      total: calculateWalletTotal(ads, referrals.referredAdvertisers, referrals.referredDrivers),
      isOffline: connectionStatus === 'offline',
    };

    setWalletState(nextWallet);
  }, [hubData?.activeSlots, connectionStatus]);

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const handleSupport = () => {
    window.open(
      `https://wa.me/18495043872?text=${encodeURIComponent('Necesito soporte técnico con la app TAD Driver.')}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleReportFalla = () => {
    window.open(
      `https://wa.me/18495043872?text=${encodeURIComponent('Quiero reportar una falla en el dispositivo TAD.')}`,
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

  const closeOnboarding = () => {
    // ── Bloqueo de pasos obligatorios ─────────────────────────────────────────
    // 'contract' y 'bank' son mandatorios: no se puede cerrar el modal hasta
    // completarlos. Protege contra conductores que hagan bypass desde el cliente.
    if (hubData) {
      const currentBankPending =
        typeof window !== 'undefined' && hubData.driverId
          ? localStorage.getItem(getDriverBankPendingKey(hubData.driverId)) === '1'
          : bankPendingSync;

      const currentStage = getDriverOnboardingStage(
        {
          agreementVersion: hubData.agreementVersion,
          bankAccountConfigured: hubData.bankAccountConfigured,
          contractAccepted: hubData.contractAccepted,
          driverId: hubData.driverId,
          onboardingStatus: hubData.onboardingStatus,
          subscriptionPaid: hubData.subscriptionPaid,
        },
        currentBankPending,
      );

      if (currentStage === 'contract' || currentStage === 'bank') {
        // Paso obligatorio — no permitir cierre
        return;
      }
    }

    if (typeof window !== 'undefined' && hubData?.driverId) {
      localStorage.setItem(getDriverOnboardingStorageKey(hubData.driverId), '1');
      sessionStorage.removeItem('tad_driver_force_onboarding');
    }

    setShowOnboarding(false);
  };

  const handleAcceptAgreement = async () => {
    if (!hubData?.driverId) return;

    setOnboardingBusy(true);
    try {
      await api.post(`/drivers/${hubData.driverId}/accept-agreement`, {
        version: DRIVER_AGREEMENT_VERSION,
      });
      await refreshHub();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo registrar la aceptación del contrato.';
      alert(Array.isArray(message) ? message[0] : message);
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleBankSaved = async () => {
    if (typeof window !== 'undefined' && hubData?.driverId) {
      setBankPendingSync(localStorage.getItem(getDriverBankPendingKey(hubData.driverId)) === '1');
    }

    await refreshHub();
  };

  const handleLogout = async () => {
    if (typeof window === 'undefined') return;
    // Clear ALL portal tokens
    localStorage.removeItem('tad_admin_token');
    localStorage.removeItem('tad_admin_user');
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_user');
    localStorage.removeItem('tad_driver_token');
    localStorage.removeItem('tad_driver_user');
    localStorage.removeItem('token');
    localStorage.removeItem('sb-access-token');
    sessionStorage.removeItem('tad_driver_user');
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    try {
      if (supabase) await supabase.auth.signOut();
    } catch { /* no Supabase session — safe to ignore */ }
    window.location.href = '/driver/login';
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

  return (
    <>
      <Head>
        <title>TAD Driver | Monitor Operativo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="description" content="Panel de control operativo para conductores TAD DOOH" />
      </Head>

      {/* DriverShell — maneja tabs internos + BottomNavigationBar */}
      <DriverShell
        connectionStatus={connectionStatus}
        batchCount={batchCount}
        offlineCount={offlineCount}
        isTracking={isTracking}
        hubData={hubData}
        isLocalMode={isLocalMode}
        walletState={walletState}
        onSupport={handleSupport}
        onReportFalla={handleReportFalla}
        onReferir={handleReferir}
        onLogout={handleLogout}
        syncingNow={syncingNow}
        onSincronizar={handleSincronizar}
        statusBar={
          <StatusBar
            connectionStatus={connectionStatus}
            batchCount={batchCount}
            offlineCount={offlineCount}
            onLogout={handleLogout}
          />
        }
        readinessCard={
          !hubLoading ? (
            <DriverReadinessCard
              bankPendingSync={bankPendingSync}
              hubData={
                hubData
                  ? {
                    agreementVersion: hubData.agreementVersion,
                    bankAccountConfigured: hubData.bankAccountConfigured,
                    contractAccepted: hubData.contractAccepted,
                    driverId: hubData.driverId,
                    onboardingStatus: hubData.onboardingStatus,
                    subscriptionPaid: hubData.subscriptionPaid,
                  }
                  : null
              }
              onOpen={() => setShowOnboarding(true)}
            />
          ) : undefined
        }
      />

      {/* ⚠️ Pantalla de Lockdown 402 — bloquea toda interacción, z-[100] */}
      {isLocked && <LockdownScreen message={lockMessage} />}

      {showOnboarding && !isLocked && (
        <DriverOnboardingModal
          bankPendingSync={bankPendingSync}
          busy={onboardingBusy}
          hubData={
            hubData
              ? {
                agreementVersion: hubData.agreementVersion,
                bankAccountConfigured: hubData.bankAccountConfigured,
                contractAccepted: hubData.contractAccepted,
                driverId: hubData.driverId,
                onboardingStatus: hubData.onboardingStatus,
                subscriptionPaid: hubData.subscriptionPaid,
              }
              : null
          }
          onAcceptAgreement={() => void handleAcceptAgreement()}
          onBankSuccess={() => void handleBankSaved()}
          onClose={closeOnboarding}
        />
      )}
    </>
  );
}
