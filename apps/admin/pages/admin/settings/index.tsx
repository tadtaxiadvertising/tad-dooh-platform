import React, { useState, useEffect } from "react";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import {
  Settings,
  ShieldCheck,
  Database,
  Globe,
  Cpu,
  Wallet,
  Activity,
  Lock,
  Save,
  RefreshCw,
  HardDrive,
  Network,
  Zap,
  Info,
  Layers,
  Smartphone,
  CreditCard,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { AntigravityButton } from "@tad/ui";
import { getSystemSettings, updateSystemSettings } from "@tad/services";

type TabType = "general" | "financial" | "fleet" | "system";

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persistedKeys, setPersistedKeys] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Settings State
  const [config, setConfig] = useState({
    platformName: "TAD DOOH Platform",
    version: "4.5.1",
    buildId: "STABLE_2026_04_26",
    maintenanceMode: false,
    slotPrice: 500,
    referralFee: 500,
    subscriptionPrice: 6000,
    maxSlots: 15,
    syncInterval: 10,
    telemetryBatch: 50,
    offlineLimit: 48,
    remotionUrl: "https://tad-remotion.rewvid.easypanel.host",
    apiEndpoint: "https://tad-api.rewvid.easypanel.host/api/v1",
    whatsappGateway: "https://api.whatsapp.com/send",
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getSystemSettings();
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Respuesta inválida de configuración");
      }
      setPersistedKeys(new Set(Object.keys(data)));
      // Only values returned by the API are authoritative.
      setConfig((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setPersistedKeys(new Set());
      console.error("Error fetching settings:", err);
      toast.error("Error al cargar la configuración desde el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const handleSave = async () => {
    // Never submit UI placeholders or values missing from the database.
    const persisted = Object.fromEntries(
      Object.entries(config).filter(([key]) => persistedKeys.has(key)),
    );
    if (Object.keys(persisted).length === 0) {
      toast.error("No hay configuración persistida disponible para guardar");
      return;
    }
    setSaving(true);
    try {
      await updateSystemSettings(persisted);
      toast.success("Configuración persistida actualizada");
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>Configuración | TAD DOOH Platform</title>
      </Head>

      <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-3 opacity-60 mb-2">
              <Settings className="w-4 h-4 text-tad-yellow" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                Node Configuration
              </p>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
              Configuración del Sistema
              {config.maintenanceMode && (
                <span className="text-rose-500 text-xs not-italic font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 ml-2">
                  Modo Mantenimiento
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <AntigravityButton
              onAsyncClick={handleSave}
              disabled={saving || loading || persistedKeys.size === 0}
              className="px-8 py-3 bg-tad-yellow text-black font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:scale-105 transition-all shadow-[0_10px_30px_rgba(255,212,0,0.2)]"
              actionName="save_system_settings"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Sincronizando..." : "Guardar Cambios"}
            </AntigravityButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-2">
            {[
              { id: "general", label: "General", icon: Globe },
              { id: "financial", label: "Reglas Financieras", icon: Wallet },
              { id: "fleet", label: "Políticas de Flota", icon: Activity },
              { id: "system", label: "Sistema & API", icon: Cpu },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={clsx(
                  "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border",
                  activeTab === tab.id
                    ? "bg-tad-yellow border-tad-yellow text-black shadow-lg"
                    : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/10",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="mt-12 p-6 rounded-2xl bg-zinc-900/40 border border-white/5 text-center">
              <Lock className="w-8 h-8 text-zinc-700 mx-auto mb-4" />
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">
                El acceso a esta pestaña está restringido a administradores con
                nivel SYSTEM_ROOT.
              </p>
            </div>
          </aside>

          {/* Settings Content Area */}
          <main className="lg:col-span-3">
            <div className="stitched-card p-8 min-h-[500px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                  <RefreshCw className="w-12 h-12 text-tad-yellow animate-spin" />
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                    Cargando Configuración...
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  {activeTab === "general" && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-tad-yellow/10 border border-tad-yellow/20 flex items-center justify-center">
                          <Globe className="w-6 h-6 text-tad-yellow" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            Información General
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium">
                            Configuración base de la plataforma TAD
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                            Nombre de la Plataforma
                          </label>
                          <input
                            type="text"
                            value={config.platformName}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                platformName: e.target.value,
                              })
                            }
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-tad-yellow/50 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                            Versión del Sistema
                          </label>
                          <input
                            type="text"
                            disabled
                            value={config.version}
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-zinc-500 cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                            Build ID
                          </label>
                          <input
                            type="text"
                            disabled
                            value={config.buildId}
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-sm font-bold text-zinc-500 cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                            Zona Horaria
                          </label>
                          <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white">
                            Atlantic/Santo_Domingo (GMT-4)
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/5 my-8" />

                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-rose-500" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight">
                                Modo Mantenimiento
                              </p>
                              <p className="text-[10px] text-zinc-500 font-medium">
                                Bloquea el acceso a todos los usuarios excepto
                                administradores.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setConfig({
                                ...config,
                                maintenanceMode: !config.maintenanceMode,
                              })
                            }
                            className={clsx(
                              "w-12 h-6 rounded-full p-1 transition-all duration-300",
                              config.maintenanceMode
                                ? "bg-rose-500"
                                : "bg-zinc-800",
                            )}
                          >
                            <div
                              className={clsx(
                                "w-4 h-4 bg-white rounded-full transition-all duration-300",
                                config.maintenanceMode
                                  ? "translate-x-6"
                                  : "translate-x-0",
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "financial" && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            Reglas Financieras
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium">
                            Control de compensaciones y tarifas base
                          </p>
                        </div>
                      </div>

                      {!["slotPrice", "referralFee", "subscriptionPrice"].every(
                        (key) => persistedKeys.has(key),
                      ) && (
                        <p
                          role="status"
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
                        >
                          Algunos importes aún no están configurados en la base
                          de datos. Se muestran sin valor y no pueden
                          modificarse hasta aprobar el contrato financiero.
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-4 h-4 text-tad-yellow" />
                              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                                Compensación por Slot
                              </h3>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-500 font-bold">
                                RD$
                              </span>
                              <input
                                type="number"
                                value={
                                  persistedKeys.has("slotPrice")
                                    ? config.slotPrice
                                    : ""
                                }
                                disabled={!persistedKeys.has("slotPrice")}
                                placeholder="Sin configurar"
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    slotPrice: Number(e.target.value),
                                  })
                                }
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-black text-tad-yellow outline-none"
                              />
                            </div>
                            <p className="text-[10px] text-zinc-600 font-medium italic">
                              Pago mensual por cada slot publicitario activo en
                              la tablet.
                            </p>
                          </div>

                          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                              <Zap className="w-4 h-4 text-emerald-500" />
                              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                                Bono por Referido
                              </h3>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-500 font-bold">
                                RD$
                              </span>
                              <input
                                type="number"
                                value={
                                  persistedKeys.has("referralFee")
                                    ? config.referralFee
                                    : ""
                                }
                                disabled={!persistedKeys.has("referralFee")}
                                placeholder="Sin configurar"
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    referralFee: Number(e.target.value),
                                  })
                                }
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-black text-emerald-500 outline-none"
                              />
                            </div>
                            <p className="text-[10px] text-zinc-600 font-medium italic">
                              Comisión única por cada anunciante referido que
                              inicie campaña.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="w-4 h-4 text-blue-500" />
                              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                                Suscripción Base
                              </h3>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-500 font-bold">
                                RD$
                              </span>
                              <input
                                type="number"
                                value={
                                  persistedKeys.has("subscriptionPrice")
                                    ? config.subscriptionPrice
                                    : ""
                                }
                                disabled={
                                  !persistedKeys.has("subscriptionPrice")
                                }
                                placeholder="Sin configurar"
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    subscriptionPrice: Number(e.target.value),
                                  })
                                }
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-lg font-black text-blue-500 outline-none"
                              />
                            </div>
                            <p className="text-[10px] text-zinc-600 font-medium italic">
                              Costo operativo mensual cobrado a los conductores
                              por hardware y conectividad.
                            </p>
                          </div>

                          <div className="bg-tad-yellow/5 border border-tad-yellow/20 rounded-2xl p-6">
                            <div className="flex gap-4">
                              <Info className="w-5 h-5 text-tad-yellow shrink-0" />
                              <p className="text-[11px] text-zinc-300 font-medium leading-relaxed">
                                Los cambios en las reglas financieras se
                                aplicarán al inicio del próximo ciclo de
                                facturación (Día 1 de cada mes). Las
                                transacciones en curso no serán afectadas.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "fleet" && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-tad-yellow/10 border border-tad-yellow/20 flex items-center justify-center">
                          <Smartphone className="w-6 h-6 text-tad-yellow" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            Políticas de Flota
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium">
                            Gestión de inventario y comportamiento de
                            dispositivos
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              Máximo de Slots por Tablet
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="1"
                                max="30"
                                value={config.maxSlots}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    maxSlots: Number(e.target.value),
                                  })
                                }
                                className="flex-1 accent-tad-yellow"
                              />
                              <span className="w-12 text-center text-lg font-black text-white bg-white/5 rounded-xl p-2 border border-white/10">
                                {config.maxSlots}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              Intervalo de Sincronización (min)
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="1"
                                max="60"
                                value={config.syncInterval}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    syncInterval: Number(e.target.value),
                                  })
                                }
                                className="flex-1 accent-tad-yellow"
                              />
                              <span className="w-12 text-center text-lg font-black text-white bg-white/5 rounded-xl p-2 border border-white/10">
                                {config.syncInterval}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              Límite Offline (horas)
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="1"
                                max="168"
                                value={config.offlineLimit}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    offlineLimit: Number(e.target.value),
                                  })
                                }
                                className="flex-1 accent-tad-yellow"
                              />
                              <span className="w-12 text-center text-lg font-black text-white bg-white/5 rounded-xl p-2 border border-white/10">
                                {config.offlineLimit}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              Batch de Telemetría (objetos)
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="10"
                                max="200"
                                value={config.telemetryBatch}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    telemetryBatch: Number(e.target.value),
                                  })
                                }
                                className="flex-1 accent-tad-yellow"
                              />
                              <span className="w-12 text-center text-lg font-black text-white bg-white/5 rounded-xl p-2 border border-white/10">
                                {config.telemetryBatch}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 p-6 bg-black/40 border border-white/5 rounded-2xl flex items-center gap-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 shrink-0">
                          <Network className="w-8 h-8 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest mb-1">
                            Impacto en Rendimiento
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium max-w-lg">
                            Ajustar los intervalos de sincronización y batches
                            de telemetría afecta directamente el consumo de
                            datos y la duración de la batería de las tablets.
                            Valores recomendados: 10m / 50 batch.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "system" && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Cpu className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            Sistema & API
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium">
                            Configuración técnica de infraestuctura
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between ml-1">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              API Endpoint (Main Gateway)
                            </label>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                              Online / Connected
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={config.apiEndpoint}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  apiEndpoint: e.target.value,
                                })
                              }
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-400 outline-none focus:border-blue-500/50 transition-all"
                            />
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                              <RefreshCw className="w-4 h-4 text-zinc-700" />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              Remotion Rendering Engine
                            </label>
                            <input
                              type="text"
                              value={config.remotionUrl}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  remotionUrl: e.target.value,
                                })
                              }
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-400 outline-none focus:border-blue-500/50 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                              WhatsApp API Gateway
                            </label>
                            <input
                              type="text"
                              value={config.whatsappGateway}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  whatsappGateway: e.target.value,
                                })
                              }
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-400 outline-none focus:border-blue-500/50 transition-all"
                            />
                          </div>
                        </div>

                        <div className="h-px bg-white/5 my-8" />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col items-center text-center">
                            <Database className="w-6 h-6 text-zinc-600 mb-3" />
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                              Database Cluster
                            </p>
                            <p className="text-xs font-bold text-white uppercase tracking-tighter">
                              PostgreSQL 15
                            </p>
                          </div>
                          <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col items-center text-center">
                            <HardDrive className="w-6 h-6 text-zinc-600 mb-3" />
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                              Asset Storage
                            </p>
                            <p className="text-xs font-bold text-white uppercase tracking-tighter">
                              Supabase S3 Bucket
                            </p>
                          </div>
                          <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col items-center text-center">
                            <Layers className="w-6 h-6 text-zinc-600 mb-3" />
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                              Realtime Core
                            </p>
                            <p className="text-xs font-bold text-white uppercase tracking-tighter">
                              Supabase Broadcast
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <style jsx global>{`
        .stitched-card {
          background: rgba(9, 9, 11, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 2.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
        .stitched-card::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: 2.5rem;
          background: linear-gradient(
            to bottom right,
            rgba(255, 212, 0, 0.1),
            transparent,
            rgba(255, 255, 255, 0.02)
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
