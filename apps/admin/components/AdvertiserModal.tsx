import type { AdvertiserRecord } from "@/types/admin-api";
import { getErrorMessage } from "@/lib/error-message";
import { useState, useEffect } from "react";
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Instagram,
  MessageCircle,
  Shield,
} from "lucide-react";
import clsx from "clsx";
import { createAdvertiser, updateAdvertiser } from "@tad/services";
import { AntigravityButton } from "@tad/ui";

interface AdvertiserModalProps {
  isOpen: boolean;
  initialData: AdvertiserRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdvertiserModal: React.FC<AdvertiserModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!initialData?.id;
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    whatsapp: "",
    websiteUrl: "",
    instagram: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        companyName: initialData.companyName || "",
        contactName: initialData.contactName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        whatsapp: initialData.whatsapp || "",
        websiteUrl: initialData.websiteUrl || "",
        instagram: initialData.instagram || "",
        status: (initialData.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
      });
    } else {
      setForm({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        whatsapp: "",
        websiteUrl: "",
        instagram: "",
        status: "ACTIVE",
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      setError("El nombre de la compañía es obligatorio.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await updateAdvertiser(initialData.id, form);
      } else {
        await createAdvertiser({
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Error al guardar.");
    }
  };

  const inputClass = clsx(
    "w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold tracking-wider outline-none transition-all placeholder:text-zinc-700",
    "focus:border-tad-yellow/30",
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative bg-[#0b0d12] border border-white/10 rounded-[32px] p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_40px_100px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-500">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-tad-yellow/5 blur-[50px] -mr-16 -mt-16 pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start mb-8 relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-tad-yellow/10 rounded-xl border border-tad-yellow/20 text-tad-yellow">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">
                {isEditing ? "Editar Cuenta" : "Nueva Cuenta"}
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Socio Estratégico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500 text-xs font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-5 mb-10">
          {/* Company Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3" /> Compañía *
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              placeholder="Nombre de la empresa"
              className={inputClass}
            />
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Contacto
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => handleChange("contactName", e.target.value)}
              placeholder="Persona de contacto"
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-3 h-3" /> Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="correo@empresa.com"
              className={inputClass}
            />
          </div>

          {/* Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Phone className="w-3 h-3" /> Teléfono
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+1 809 000 0000"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                placeholder="+1 809 000 0000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Website & Instagram */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" /> Website
              </label>
              <input
                type="text"
                value={form.websiteUrl}
                onChange={(e) => handleChange("websiteUrl", e.target.value)}
                placeholder="https://empresa.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Instagram className="w-3 h-3" /> Instagram
              </label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="@empresa"
                className={inputClass}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Estado
            </label>
            <div className="flex gap-3">
              {(["ACTIVE", "INACTIVE"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChange("status", s)}
                  className={clsx(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    form.status === s
                      ? s === "ACTIVE"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
                      : "bg-white/5 border-white/5 text-zinc-600 hover:text-zinc-400",
                  )}
                >
                  {s === "ACTIVE" ? "Activo" : "Inactivo"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white/5 border border-white/10 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
          >
            Cancelar
          </button>
          <AntigravityButton
            actionName={isEditing ? "update_advertiser" : "create_advertiser"}
            onAsyncClick={handleSubmit}
            className="flex-1 py-4"
          >
            {isEditing ? "Guardar Cambios" : "Crear Cuenta"}
          </AntigravityButton>
        </div>
      </div>
    </div>
  );
};
