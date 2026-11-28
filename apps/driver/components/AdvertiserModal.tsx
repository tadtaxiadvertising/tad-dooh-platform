import type { AdvertiserRecord } from "@/types/admin-api";

import { getErrorMessage } from "@tad/services";
import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  Upload,
  CheckCircle2,
  UserCheck,
  MonitorSmartphone,
  CalendarRange,
  Minus,
  Plus,
  Radio,
} from "lucide-react";
import { createAdvertiser, updateAdvertiser, getDrivers } from "@tad/services";

const SCREEN_PRESETS = [1, 2, 3, 4, 5];
const CAMPAIGN_MONTH_OPTIONS = [1, 3, 6, 12];

interface AdvertiserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: AdvertiserRecord;
}

export const AdvertiserModal: React.FC<AdvertiserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    companyName: initialData?.companyName || "",
    contactName: initialData?.contactName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    whatsapp: initialData?.whatsapp || "",
    instagram: initialData?.instagram || "",
    facebook: initialData?.facebook || "",
    websiteUrl: initialData?.websiteUrl || "",
    pedidosYaUrl: initialData?.pedidosYaUrl || "",
    uberEatsUrl: initialData?.uberEatsUrl || "",
    category: initialData?.category || "General",
    productsData: initialData?.productsData || "[]",
    status: initialData?.status || "ACTIVE",
    referredBy: initialData?.referredBy || "",
  });

  const [screensCount, setScreensCount] = useState<number>(
    typeof initialData?.screensCount === "number" &&
      Number.isFinite(initialData.screensCount) &&
      initialData.screensCount > 0
      ? initialData.screensCount
      : 1,
  );
  const [campaignMonths, setCampaignMonths] = useState<number>(
    typeof initialData?.campaignMonths === "number" &&
      Number.isFinite(initialData.campaignMonths) &&
      initialData.campaignMonths > 0
      ? initialData.campaignMonths
      : 1,
  );

  const isCustomScreens = screensCount > SCREEN_PRESETS.length;

  const setScreensPreset = (value: number) => {
    setScreensCount(value);
  };

  const activateCustomScreens = () => {
    setScreensCount(Math.max(SCREEN_PRESETS.length + 1, screensCount));
  };

  const stepCustomScreens = (delta: number) => {
    setScreensCount((prev) =>
      Math.max(SCREEN_PRESETS.length + 1, prev + delta),
    );
  };

  const [drivers, setDrivers] = useState<
    { id: string; fullName: string; taxiPlate?: string; phone?: string }[]
  >([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const data = await getDrivers();
        setDrivers(data || []);
      } catch {
        console.error("Error fetching drivers for referral list");
      }
    };
    fetchDrivers();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
        whatsapp: "",
      instagram: "",
      facebook: "",
      websiteUrl: "",
      pedidosYaUrl: "",
      uberEatsUrl: "",
      category: "General",
      productsData: "[]",
      status: "ACTIVE",
      referredBy: "",
    });
    setScreensCount(1);
    setCampaignMonths(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData, screensCount, campaignMonths };
      if (initialData?.id) {
        await updateAdvertiser(initialData.id, payload);
      } else {
        await createAdvertiser({
          companyName: formData.companyName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
        });
      }

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess(false);
        if (!initialData) {
          resetForm();
        }
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err) || "Error al guardar el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#FFD400]" />
            {initialData ? "Editar Marca" : "Registro de Marca"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success / Form */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-6" />
              <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">
                Sync Completado
              </h3>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">
                Datos guardados exitosamente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-[10px] font-black">
                  {error}
                </div>
              )}

              {/* basic info */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                  01. Identidad
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="companyName"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Empresa
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="contactName"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Contacto
                    </label>
                    <input
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      required
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="phone"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Teléfono
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="category"
                    className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                  >
                    Categoría / Segmento
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="General">General / Otros</option>
                    <option value="Gastronomía">
                      Gastronomía & Restaurantes
                    </option>
                    <option value="Retail">Retail & Tiendas</option>
                    <option value="Servicios">Servicios & Salud</option>
                    <option value="Entretenimiento">
                      Entretenimiento & Eventos
                    </option>
                    <option value="Transporte">Transporte & Logística</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="referredBy"
                    className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"
                  >
                    <UserCheck className="w-3 h-3 text-emerald-500" /> Referido
                    por (TAD DRIVER)
                  </label>
                  <select
                    id="referredBy"
                    name="referredBy"
                    value={formData.referredBy}
                    onChange={handleChange}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">-- Sin Referido / Directo --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.taxiPlate || d.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Screens + Monthly Plan */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-6">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                  02. Flota de Pantallas
                </p>

                <div
                  role="radiogroup"
                  aria-label="Cantidad de pantallas"
                  className="grid grid-cols-6 gap-2"
                >
                  {SCREEN_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={!isCustomScreens && screensCount === n}
                      onClick={() => setScreensPreset(n)}
                      className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${
                        !isCustomScreens && screensCount === n
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40"
                      }`}
                    >
                      <MonitorSmartphone
                        className={`w-4 h-4 ${!isCustomScreens && screensCount === n ? "text-black" : "text-emerald-500"}`}
                      />
                      <span className="text-lg font-black leading-none">
                        {n}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isCustomScreens}
                    onClick={activateCustomScreens}
                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border transition-all ${
                      isCustomScreens
                        ? "bg-emerald-500 border-emerald-500 text-black"
                        : "bg-black border-white/10 text-zinc-300 hover:border-emerald-500/40"
                    }`}
                  >
                    <span className="text-sm font-black leading-none">6+</span>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest ${isCustomScreens ? "text-black" : "text-emerald-500"}`}
                    >
                      Más
                    </span>
                  </button>
                </div>

                {isCustomScreens && (
                  <div className="animate-in fade-in duration-300">
                    <label
                      htmlFor="screensCountInput"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2"
                    >
                      Cantidad exacta de pantallas
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => stepCustomScreens(-1)}
                        aria-label="Quitar pantalla"
                        className="p-3 rounded-xl bg-black border border-white/10 text-emerald-500 hover:border-emerald-500/40 transition-all"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        id="screensCountInput"
                        type="number"
                        min={SCREEN_PRESETS.length + 1}
                        max={999}
                        value={screensCount}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (Number.isFinite(v))
                            setScreensCount(
                              Math.max(
                                SCREEN_PRESETS.length + 1,
                                Math.min(999, v),
                              ),
                            );
                        }}
                        className="flex-1 text-center bg-black border border-white/10 rounded-xl px-4 py-3 text-2xl font-black text-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => stepCustomScreens(1)}
                        aria-label="Agregar pantalla"
                        className="p-3 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Duration plan — fixed monthly (red reserved exclusively for this block) */}
                <div className="rounded-3xl border border-red-500/40 bg-red-500/[0.06] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <CalendarRange className="w-4 h-4" /> Duración de Campaña
                    </p>
                    <span className="px-3 py-1 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                      Por Mes
                    </span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="Meses de campaña"
                    className="grid grid-cols-4 gap-2"
                  >
                    {CAMPAIGN_MONTH_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={campaignMonths === m}
                        onClick={() => setCampaignMonths(m)}
                        className={`py-3 rounded-2xl border text-sm font-black transition-all ${
                          campaignMonths === m
                            ? "bg-white border-white text-black"
                            : "bg-black border-white/10 text-zinc-300 hover:border-white/40"
                        }`}
                      >
                        {m} {m === 1 ? "Mes" : "Meses"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                      Reproducción fija: cada anuncio rota exactamente cada 30
                      segundos
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                  03. Canales QR
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="whatsapp"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      WhatsApp
                    </label>
                    <input
                      id="whatsapp"
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      placeholder="Ej: 18092201111"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="instagram"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Instagram
                    </label>
                    <input
                      id="instagram"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="@username"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="websiteUrl"
                    className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                  >
                    Sitio Web
                  </label>
                  <input
                    id="websiteUrl"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="pedidosYaUrl"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Pedidos Ya (URL)
                    </label>
                    <input
                      id="pedidosYaUrl"
                      name="pedidosYaUrl"
                      value={formData.pedidosYaUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="uberEatsUrl"
                      className="text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                    >
                      Uber Eats (URL)
                    </label>
                    <input
                      id="uberEatsUrl"
                      name="uberEatsUrl"
                      value={formData.uberEatsUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Products JSON */}
              <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                  04. Productos (JSON)
                </p>
                <textarea
                  id="productsData"
                  name="productsData"
                  value={formData.productsData}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:border-emerald-500 outline-none transition-all"
                  placeholder='[{"name": "X", "price": 0, "img": ""}]'
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FFD400] hover:bg-[#ffe45c] disabled:bg-[#FFD400]/50 text-black font-black uppercase py-5 rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  {loading ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />{" "}
                      {initialData ? "Actualizar Perfil" : "Guardar Datos"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
