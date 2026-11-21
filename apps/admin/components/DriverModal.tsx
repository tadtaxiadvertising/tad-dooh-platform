import React, { useState } from "react";
import { X, User, Phone, IdCard, Hash, AlertTriangle } from "lucide-react";
import { createDriver } from "@tad/services";
import { notifyChange } from "@tad/ui";
import { toast } from "sonner";

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DriverModal = React.memo(function DriverModal({
  isOpen,
  onClose,
  onSuccess,
}: DriverModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    cedula: "",
    taxiPlate: "",
    licensePlate: "",
    contractAccepted: false,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createDriver(formData);
      notifyChange("TAD_DRIVERS");
      toast.success("SOCIO REGISTRADO: Nuevo TAD DRIVER agregado a la red.");
      onSuccess();
      onClose();
      setFormData({
        fullName: "",
        phone: "",
        cedula: "",
        taxiPlate: "",
        licensePlate: "",
        contractAccepted: false,
      });
    } catch (err: unknown) {
      console.error("Error creating driver:", err);
      const errorMsg =
        err instanceof Error && "response" in err
          ? (err as { response: { data: { message: string | string[] } } })
              .response.data.message
          : err instanceof Error
            ? err.message
            : "Error al registrar el TAD DRIVER. Verifique que el teléfono o cédula no estén duplicados.";
      setError(
        Array.isArray(errorMsg)
          ? errorMsg.join(", ")
          : errorMsg || "Error desconocido",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/5 rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#fad400]/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fad400] flex items-center justify-center shadow-lg shadow-[#fad400]/20">
              <User className="text-black w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Gestión de Conductor
              </h2>
              <p className="text-[10px] text-[#fad400] font-bold uppercase tracking-widest">
                Nuevo TAD DRIVER
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                Nombre Completo *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  required
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 outline-none focus:border-[#fad400] transition-all text-sm"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                WhatsApp / Teléfono *
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  required
                  type="tel"
                  placeholder="Ej: 8091234567"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 outline-none focus:border-[#fad400] transition-all text-sm"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Cedula */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                Cédula
              </label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="001-0000000-0"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 outline-none focus:border-[#fad400] transition-all text-sm"
                  value={formData.cedula}
                  onChange={(e) =>
                    setFormData({ ...formData, cedula: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Taxi Plate */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2 px-1">
                Placa Vehículo
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Ej: A123456"
                  className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 outline-none focus:border-[#fad400] transition-all text-sm"
                  value={formData.taxiPlate}
                  onChange={(e) =>
                    setFormData({ ...formData, taxiPlate: e.target.value })
                  }
                />
              </div>
            </div>

            <p className="rounded-xl border border-[#fad400]/20 bg-[#fad400]/5 px-4 py-3 text-xs text-zinc-300">
              La tablet se asigna desde Administración después del registro,
              cuando el conductor esté habilitado para recibir un dispositivo.
            </p>

            {/* Contract Acceptance - required when creating drivers as non-admin */}
            <div className="flex items-center gap-3 pt-2">
              <label
                htmlFor="contractAccepted"
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  id="contractAccepted"
                  type="checkbox"
                  checked={formData.contractAccepted}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contractAccepted: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-white/20 bg-zinc-900 text-[#fad400] focus:ring-[#fad400]"
                />
                <span className="text-xs text-zinc-300 font-medium leading-tight">
                  El conductor acepta el contrato de servicio TAD
                </span>
              </label>
            </div>

            <p className="text-xs text-zinc-400">
              El pago se registra y valida por separado en el panel de
              Administración.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registrando..." : "Confirmar Registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default DriverModal;
