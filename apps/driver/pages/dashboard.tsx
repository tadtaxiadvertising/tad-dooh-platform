import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface Referral {
  id: string;
  advertiserName: string;
  status: "PENDING" | "ACTIVE";
  createdAt: string;
  payoutAmount: number;
}
interface DriverMetrics {
  phone: string;
  fullName: string;
  vehiclePlate: string;
  subscriptionPaid: boolean;
  walletBalance: number;
  activeSlotsCount: number;
  referralCode: string;
  totalReferralsCount: number;
  activeReferralsCount: number;
}
type BankAccountType = "AHORROS" | "CORRIENTE";
interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
}

const MAX_SLOTS = 15;
const BANK_STORAGE_KEY = "tad_driver_bank_account";

export default function DriverDashboard(): React.JSX.Element {
  const [metrics, setMetrics] = useState<DriverMetrics | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    bankName: "",
    accountNumber: "",
    accountType: "AHORROS",
  });
  const [bankSaved, setBankSaved] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    void fetchDashboardData();
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(BANK_STORAGE_KEY);
      if (saved) {
        try {
          setBankInfo(JSON.parse(saved) as BankInfo);
          setBankSaved(true);
        } catch {
          window.localStorage.removeItem(BANK_STORAGE_KEY);
        }
      }
    }
  }, []);

  const fetchDashboardData = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(() => {
          setMetrics({
            phone: "829-555-0000",
            fullName: "Juan Pérez Martínez",
            vehiclePlate: "A123456",
            subscriptionPaid: true,
            walletBalance: 8000,
            activeSlotsCount: 15,
            referralCode: "TAD-JUAN-829",
            totalReferralsCount: 3,
            activeReferralsCount: 1,
          });
          setReferrals([
            {
              id: "1",
              advertiserName: "Claro Dominicana",
              status: "ACTIVE",
              createdAt: "2026-04-12",
              payoutAmount: 500,
            },
            {
              id: "2",
              advertiserName: "Pizzería El Primo",
              status: "PENDING",
              createdAt: "2026-04-20",
              payoutAmount: 0,
            },
            {
              id: "3",
              advertiserName: "Tienda MultiTech",
              status: "PENDING",
              createdAt: "2026-05-02",
              payoutAmount: 0,
            },
          ]);
          resolve();
        }, 800);
      });
    } catch {
      setErrorMsg(
        "Error de conexión con el Mobile Gateway. Cargando datos locales cached.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const slotsProgress = useMemo(
    () => Math.min(((metrics?.activeSlotsCount ?? 0) / MAX_SLOTS) * 100, 100),
    [metrics],
  );

  const handleSaveBank = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setIsSyncing(true);
    if (typeof window !== "undefined")
      window.localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(bankInfo));
    window.setTimeout(() => {
      setBankSaved(true);
      setIsSyncing(false);
    }, 1000);
  };

  const handleCopy = async (): Promise<void> => {
    if (!metrics?.referralCode) return;
    try {
      await navigator.clipboard.writeText(metrics.referralCode);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1400);
    } catch {
      setCopySuccess(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
        <p className="text-sm tracking-wider font-mono text-gray-400">
          SINTONIZANDO CON LA FLOTA TAD...
        </p>
      </div>
    );
  if (metrics && !metrics.subscriptionPaid)
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-950/40 border border-red-500/40 backdrop-blur-xl p-8 rounded-2xl text-center shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Suscripción Inactiva
          </h1>
          <p className="text-gray-300 text-sm mb-6">
            El dispositivo de tu vehículo requiere el pago de la cuota anual
            (RD$ 6,000) para reactivar la parrilla publicitaria.
          </p>
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-left font-mono text-xs text-gray-400 mb-6">
            Status: 402 Payment Required <br />
            Tablet Link: LOCKED <br />
            Flota: Santiago Pilot
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition duration-200"
          >
            Reverificar Estado de Pago
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-100 font-sans">
      <Head>
        <title>TAD Driver Portal - Telemetry &amp; Wallet v12</title>
      </Head>
      <header className="sticky top-0 z-50 bg-[#070a13]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-lg flex items-center justify-center font-black text-black text-lg">
            T
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              TAD DRIVER{" "}
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                v12.1.1
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              {metrics?.vehiclePlate} • Santiago Pilot
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Telemetry Active
          </div>
          <button
            onClick={() => window.alert("Cerrando sesión de forma segura...")}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        {errorMsg && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5" />
            <p>{errorMsg}</p>
          </div>
        )}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-white/5 p-6 rounded-2xl">
            <p className="text-xs font-mono text-gray-400">Mi Billetera</p>
            <h2 className="text-3xl font-black text-white">
              RD$ {metrics?.walletBalance.toLocaleString("es-DO")}
            </h2>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Corte financiero automatizado
            </p>
          </div>
          <div className="bg-slate-900/70 border border-white/5 p-6 rounded-2xl">
            <p className="text-xs font-mono text-gray-400">Slots Ocupados</p>
            <h2 className="text-3xl font-black text-white">
              {metrics?.activeSlotsCount}{" "}
              <span className="text-sm text-gray-500">/ 15</span>
            </h2>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-3">
              <div
                className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full"
                style={{ width: `${slotsProgress}%` }}
              />
            </div>
          </div>
          <div className="bg-slate-900/70 border border-white/5 p-6 rounded-2xl">
            <p className="text-xs font-mono text-gray-400">Referidos</p>
            <h2 className="text-3xl font-black text-white">
              {metrics?.totalReferralsCount}
            </h2>
            <p className="text-xs text-gray-400 mt-2">
              <span className="text-emerald-400 font-bold">
                {metrics?.activeReferralsCount} activos
              </span>
            </p>
          </div>
          <div className="bg-slate-900/70 border border-white/5 p-6 rounded-2xl">
            <p className="text-xs font-mono text-gray-400">Código Único</p>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-mono text-cyan-300">
                {metrics?.referralCode}
              </h2>
              <button
                onClick={() => void handleCopy()}
                className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {copySuccess
                ? "Copiado al portapapeles"
                : "Comparte y gana RD$500 por conductor."}
            </p>
          </div>
        </section>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="text-cyan-400 w-5 h-5" />
                Nodo de Captación
              </h3>
              <div className="grid md:grid-cols-3 gap-6 items-center mt-4">
                <div className="bg-white p-3 rounded-xl inline-block mx-auto">
                  <div className="w-36 h-36 bg-[#0a0f1d] flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-cyan-500/40">
                    <QrCode className="w-12 h-12 text-cyan-400 mb-1" />
                    <span className="text-[8px] font-mono text-gray-500">
                      {metrics?.referralCode}
                    </span>
                  </div>
                </div>
                <p className="md:col-span-2 text-xs text-gray-300">
                  Cada conductor referido activo genera RD$500 CPA para tu
                  billetera.
                </p>
              </div>
            </div>
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-gray-400 font-mono">
                    <th className="p-4">Conductor</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Bono</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="border-t border-white/5">
                      <td className="p-4 text-white">{ref.advertiserName}</td>
                      <td className="p-4 text-gray-400">{ref.createdAt}</td>
                      <td className="p-4">
                        <span
                          className={
                            ref.status === "ACTIVE"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }
                        >
                          {ref.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white">
                        {ref.payoutAmount > 0 ? `RD$ ${ref.payoutAmount}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-white/5 p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="text-emerald-400 w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  Configuración de Retiros
                </h3>
              </div>
              <form onSubmit={handleSaveBank} className="space-y-3">
                <select
                  value={bankInfo.bankName}
                  onChange={(e) =>
                    setBankInfo({ ...bankInfo, bankName: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs"
                  required
                >
                  <option value="" disabled>
                    Selecciona un banco
                  </option>
                  <option value="BANRESERVAS">Banco de Reservas</option>
                  <option value="POPULAR">Banco Popular Dominicano</option>
                  <option value="BHD">Banco BHD</option>
                  <option value="SCOTIABANK">Scotiabank</option>
                </select>
                <input
                  type="text"
                  value={bankInfo.accountNumber}
                  onChange={(e) =>
                    setBankInfo({ ...bankInfo, accountNumber: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  {(["AHORROS", "CORRIENTE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setBankInfo({ ...bankInfo, accountType: type })
                      }
                      className={
                        bankInfo.accountType === type
                          ? "py-2 text-xs rounded-xl border bg-cyan-500/10 border-cyan-500 text-cyan-400"
                          : "py-2 text-xs rounded-xl border border-white/10 text-gray-400"
                      }
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-cyan-600 text-black"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : bankSaved ? (
                    <span className="flex items-center justify-center gap-2 text-emerald-300">
                      <ShieldCheck className="w-4 h-4" />
                      Cuenta Sincronizada
                    </span>
                  ) : (
                    "Vincular y Guardar Cuenta"
                  )}
                </button>
              </form>
            </div>
            <div className="bg-slate-900/40 border border-white/5 p-4 rounded-xl text-[11px] font-mono space-y-2">
              <p className="text-gray-400">Auditoría de Hardware</p>
              <p className="flex justify-between">
                <span className="text-gray-500">FullyKiosk:</span>
                <span className="text-emerald-400">ONLINE</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Último GPS Ping:</span>
                <span className="text-gray-300">Hace 3 minutos</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
