// apps/driver/pages/driver/wallet.tsx
/**
 * /driver/wallet — Página de Billetera
 *
 * Mantiene su ruta independiente para deep-linking, pero reutiliza
 * el componente WalletTab compartido para consistencia visual.
 * La navegación principal del driver será vía los tabs internos del Dashboard.
 */
import { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import api from "@tad/services";
import { WalletTab } from "../../components/dashboard/WalletTab";
import {
  calculateWalletTotal,
  type WalletState,
} from "../../components/dashboard/DriverWalletCard";
import type { DriverHubData } from "../../hooks/useDriverHub";

// Force dynamic rendering
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

function normalizeWalletHubData(input: unknown): DriverHubData {
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  return {
    driverId: String(raw?.driverId || ""),
    driverName: String(raw?.driverName || "Conductor"),
    balance: Number(raw?.balance) || 0,
    projectedEarnings: Number(raw?.projectedEarnings) || 0,
    activeAds: Number(raw?.activeAds) || 0,
    activeSlots: Math.min(15, Number(raw?.activeSlots || raw?.activeAds || 0)),
    maxSlots: 15,
    subscriptionPaid: Boolean(raw?.subscriptionPaid),
    subscriptionStatus: String(raw?.subscriptionStatus || "UNKNOWN"),
    deviceId: raw?.deviceId ? String(raw.deviceId) : null,
    gpsPoints: Number(raw?.gpsPoints) || 0,
    adsPlayed: Number(raw?.adsPlayed) || 0,
    contractAccepted: Boolean(raw?.contractAccepted),
    agreementVersion: raw?.agreementVersion
      ? String(raw.agreementVersion)
      : null,
    onboardingStatus: String(raw?.onboardingStatus || "UNKNOWN"),
    bankAccountConfigured: Boolean(raw?.bankAccountConfigured),
  };
}

export default function DriverWalletPage() {
  const [rawHubData, setRawHubData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const hubRes = await api.get("/drivers/me/hub");
        setRawHubData(hubRes.data);
      } catch (error) {
        console.error("Failed to load wallet data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="border-t-2 border-[#FFD400] w-10 h-10 rounded-full animate-spin" />
      </div>
    );
  }

  // Normalize hub data to match DriverHubData interface
  const hubData = rawHubData ? normalizeWalletHubData(rawHubData) : null;

  // Build wallet state from hub data
  const walletState: WalletState = {
    ads: hubData?.activeSlots ?? 0,
    referredDrivers: 0,
    total: calculateWalletTotal(hubData?.activeSlots ?? 0, 0),
    isOffline: false,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-3xl border-b border-white/5 p-4 flex items-center gap-4">
        <Link
          href="/driver/dashboard"
          className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/5 px-4 py-2.5 text-sm font-black uppercase tracking-[0.1em] text-zinc-300 transition hover:bg-white/10 active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">
            Finanzas
          </p>
          <h1 className="text-lg font-black uppercase tracking-tighter">
            Mi Billetera
          </h1>
        </div>
      </header>

      {/* Content with padding for fixed elements */}
      <main className="mx-auto max-w-md px-4 pt-4 pb-32">
        <WalletTab
          hubData={hubData}
          connectionStatus={
            typeof navigator !== "undefined" && navigator.onLine
              ? "online"
              : "offline"
          }
          walletState={walletState}
          isLocalMode={false}
        />
      </main>
    </div>
  );
}
