"use client";

import { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Phone,
  Shield,
  Eye,
  EyeOff,
  BadgeCheck,
  FileText,
  Building,
  UserCheck,
  ChevronDown,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import clsx from "clsx";

interface RegistrationStepProps {
  onNext: () => void;
  onPrev: () => void;
  onRegister: (data: RegistrationData) => Promise<void>;
  isLoading: boolean;
  error: string;
  formData: RegistrationData;
  onFormChange: (field: string, value: string | boolean | object) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}

interface RegistrationData {
  fullName: string;
  phone: string;
  cedula: string;
  taxiPlate: string;
  password: string;
  agreements: {
    contract: boolean;
    hardware_liability: boolean;
    representative: boolean;
    membership: boolean;
  };
}

interface LegalDocument {
  id: keyof RegistrationData["agreements"];
  icon: React.ElementType;
  title: string;
  description: string;
  fullText: string;
  required: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
}

const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "representative",
    icon: UserCheck,
    title: "Representante Legal",
    description:
      "Confirmo ser el representante autorizado del vehículo y/o flota registrada.",
    fullText: `DECLARACIÓN DE REPRESENTANTE LEGAL

Al marcar esta casilla, declaro bajo juramento que:

1. Soy el titular de la cédula de identidad y electoral registrada.
2. Tengo la autorización legal para registrar el vehículo con placa indicada en la flota TAD.
3. La información proporcionada es veraz, completa y actualizada.
4. Me comprometo a notificar cualquier cambio en la titularidad del vehículo o en mi representación legal.
5. Entiendo que cualquier falsedad en esta declaración dará lugar a la terminación inmediata del contrato y a las acciones legales correspondientes.

Esta declaración tiene carácter de declaración jurada ante las autoridades competentes de la República Dominicana.`,
    required: true,
    color: "text-[#FDCB01]",
    bgColor: "bg-[#FDCB01]/10",
    borderColor: "border-[#FDCB01]/30",
  },
  {
    id: "contract",
    icon: FileText,
    title: "Contrato de Servicio",
    description:
      "Acepto los términos y condiciones del servicio de publicidad digital en pantalla vehicular.",
    fullText: `CONTRATO DE SERVICIO TAD - PUBLICIDAD DIGITAL VEHICULAR

ENTRE: TAD TECHNOLOGIES (en adelante "TAD") y el CONDUCTOR SOCIO.

CLÁUSULAS PRINCIPALES:

1. OBJETO: Instalación y operación de pantalla publicitaria digital en el vehículo del socio conductor.

2. DURACIÓN: Vigencia anual renovable automáticamente salvo notificación con 30 días de antelación.

3. OBLIGACIONES DEL SOCIO:
   - Mantener la pantalla encendida y operativa durante las horas de servicio.
   - Permitir la rotación de anuncios según la programación de TAD (cada 30 segundos).
   - Cuidar el equipo contra daños, robo o manipulación no autorizada.
   - Reportar fallos técnicos en máximo 24 horas.

4. OBLIGACIONES DE TAD:
   - Proveer hardware (tablet, soporte, cableado) y seguro contra robo/averías.
   - Gestionar la venta de espacios publicitarios y rotación de contenidos.
   - Pagar RD$500 mensuales por cada anuncio activo (máx. 15 simultáneos).
   - Proveer soporte técnico remoto y presencial.

5. PAGOS: Liquidación mensual los primeros 5 días hábiles del mes siguiente.

6. TERMINACIÓN: Cualquiera de las partes puede terminar con 30 días de aviso. Incumplimiento grave permite terminación inmediata.

7. JURISDICCIÓN: Tribunales de Santo Domingo, República Dominicana.`,
    required: true,
    color: "text-[#22C55E]",
    bgColor: "bg-[#22C55E]/10",
    borderColor: "border-[#22C55E]/30",
  },
  {
    id: "hardware_liability",
    icon: Shield,
    title: "Responsabilidad de Hardware",
    description:
      "Acepto cuidar el equipo (tablet, soporte, cableado) y la membresía anual de RD$6,000.",
    fullText: `ACUERDO DE RESPONSABILIDAD DE HARDWARE Y MEMBRESÍA (HaaS)

HARDWARE AS A SERVICE - STARTER KIT

EQUIPO INCLUIDO:
- Tablet Android 10.1" HD (modelo TAD-certificado)
- Soporte vehicular reforzado anti-vibración
- Cableado de alimentación y datos certificado
- Instalación profesional incluida

NO APLICA SEGURO INTEGRAL: la nueva membresía cubre el canal y el soporte;
reporta cualquier incidencia en < 24 h vía app Driver.

RESPONSABILIDADES DEL SOCIO:
1. Custodia diligente: El equipo debe permanecer en el vehículo durante horas de operación.
2. Uso autorizado: Solo para visualización de contenidos TAD. Prohibido uso personal.
3. Reporte inmediato: Cualquier incidencia (robo, daño, fallo) en < 24 horas vía app.
4. No manipulación: Prohibido desmontar, rootear, o modificar software/hardware.
5. Devolución: Al terminar contrato, devolver equipo en buen estado (desgaste normal exceptuado).

COSTOS POR INCUMPLIMIENTO:
- Pérdida/robo sin reporte: RD$15,000 (valor reposición + admin)
- Daño por manipulación: RD$8,000
- No devolución: RD$12,000 + cargos legales

La membresía de RD$6,000/año se factura al activar la pantalla y se renueva anualmente.`,
    required: true,
    color: "text-[#FF8C00]",
    bgColor: "bg-[#FF8C00]/10",
    borderColor: "border-[#FF8C00]/30",
  },
  {
    id: "membership",
    icon: CreditCard,
    title: "Membresía, Canal y Soporte",
    description:
      "Confirmo entender la inversión de activación: RD$6,000/año por Membresía, Canal y Soporte.",
    fullText: `DETALLE DE INVERSIÓN DE ACTIVACIÓN - MEMBRESÍA FLOTA TAD

CONCEPTO: Membresía, Canal y Soporte (HaaS)
MONTO: RD$6,000.00 (Seis Mil Pesos Dominicanos) / AÑO
VIGENCIA: 12 meses desde activación de pantalla
RENOVACIÓN: Automática salvo cancelación 30 días antes

QUÉ INCLUYE TU INVERSIÓN:

📱 STARTER KIT HARDWARE (Valor comercial: RD$25,000+)
   • Tablet TAD 10.1" HD IPS 1000 nits (anti-reflejo solar)
   • Soporte magnético reforzado + brazo articulado
   • Cableado blindado 12V/5V con protector de picos
   • Instalación certificada por técnico TAD (incluida)

📡 CANAL DE DISTRIBUCIÓN
   • Acceso a horarios y espacios publicitarios programados por TAD
   • Rotación de anuncios según la programación TAD (cada 30 segundos)
   • Posicionamiento en rutas prioritarias de Santo Domingo Metro

🔧 SOPORTE Y MANTENIMIENTO
   • Actualizaciones OTA automáticas de software
   • Diagnóstico remoto 24/7 desde app Driver
   • Visita técnica preventiva semestral
   • Línea directa WhatsApp Business soporte

💰 RETORNO DE INVERSIÓN ESTIMADO:
   • 1 anuncio activo: RD$500/mes → RD$6,000/año = 100% ROI año 1
   • 3 anuncios activos: RD$1,500/mes → RD$18,000/año = 300% ROI año 1
   • 5 anuncios activos: RD$2,500/mes → RD$30,000/año = 500% ROI año 1

FORMA DE PAGO:
• Cargo automático a tarjeta registrada
• Opción: Transferencia bancaria / Efectivo en oficinas TAD
• Factura fiscal emitida (NCF B01 - Gastos deducibles)

* El pago de la membresía cubre el canal de distribución y el soporte técnico.
* Sin membresía activa, la pantalla no muestra anuncios y no genera ingresos.`,
    required: true,
    color: "text-[#E51636]",
    bgColor: "bg-[#E51636]/10",
    borderColor: "border-[#E51636]/30",
  },
];

export default function RegistrationStep({
  onNext,
  onPrev,
  onRegister,
  isLoading,
  error,
  formData,
  onFormChange,
  showPassword,
  setShowPassword,
}: RegistrationStepProps) {
  const [expandedDoc, setExpandedDoc] = useState<
    keyof RegistrationData["agreements"] | null
  >(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !formData.fullName ||
      !formData.phone ||
      !formData.cedula ||
      !formData.taxiPlate ||
      !formData.password
    ) {
      return;
    }

    const allAgreed = Object.values(formData.agreements).every((v) => v);
    if (!allAgreed) {
      return;
    }

    if (formData.password.length < 6) {
      return;
    }

    await onRegister(formData);
  };

  const allAgreed = Object.values(formData.agreements).every((v) => v);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <motion.div
        className="text-center pt-4 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-[22px] font-black text-white uppercase tracking-tight leading-tight mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Completa tu Registro
        </motion.h1>
        <motion.p
          className="text-[10px] text-gray-500 font-bold uppercase tracking-wider"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Asegura tu membresía de RD$6,000 / año
        </motion.p>
      </motion.div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col" noValidate>
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="space-y-4 flex-1 overflow-y-auto pr-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Personal Info Fields */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="group">
              <label
                htmlFor="ob-name"
                className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-[#FDCB01] transition-colors"
              >
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center text-gray-700 group-focus-within:text-[#FDCB01] transition-colors pointer-events-none">
                  <Car className="w-4 h-4" />
                </div>
                <input
                  id="ob-name"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => onFormChange("fullName", e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-[#FDCB01]/30 transition-all"
                />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="ob-phone"
                className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-[#FDCB01] transition-colors"
              >
                Teléfono Celular
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center text-gray-700 group-focus-within:text-[#FDCB01] transition-colors pointer-events-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="ob-phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => onFormChange("phone", e.target.value)}
                  placeholder="829-555-0001"
                  className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-[#FDCB01]/30 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="group">
                <label
                  htmlFor="ob-ced"
                  className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-[#FDCB01] transition-colors"
                >
                  Cédula
                </label>
                <input
                  id="ob-ced"
                  type="text"
                  value={formData.cedula}
                  onChange={(e) => onFormChange("cedula", e.target.value)}
                  placeholder="001-0000000-0"
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-[#FDCB01]/30 transition-all"
                />
              </div>
              <div className="group">
                <label
                  htmlFor="ob-plate"
                  className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-[#FDCB01] transition-colors"
                >
                  Placa del Taxi
                </label>
                <input
                  id="ob-plate"
                  type="text"
                  value={formData.taxiPlate}
                  onChange={(e) => onFormChange("taxiPlate", e.target.value)}
                  placeholder="T-101"
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-[#FDCB01]/30 transition-all"
                />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="ob-pass"
                className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-[#FDCB01] transition-colors"
              >
                Contraseña (mín. 6 caracteres)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center text-gray-700 group-focus-within:text-[#FDCB01] transition-colors pointer-events-none">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  id="ob-pass"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => onFormChange("password", e.target.value)}
                  placeholder={showPassword ? "MiClave123" : "••••••••"}
                  className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-12 py-4 text-white text-sm font-bold placeholder:text-gray-700 focus:outline-none focus:border-[#FDCB01]/30 transition-all"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-[#FDCB01] transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Legal Documents as Interactive Glass Cards */}
          <motion.div
            className="space-y-3 pt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <motion.h3
              className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Documentos Legales{" "}
              <span className="text-[#FDCB00]">(Obligatorios)</span>
            </motion.h3>

            <AnimatePresence mode="wait">
              {LEGAL_DOCUMENTS.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{
                    delay: index * 0.08,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <LegalDocumentCard
                    doc={doc}
                    checked={formData.agreements[doc.id]}
                    onChange={(checked) =>
                      onFormChange("agreements", { [doc.id]: checked })
                    }
                    isExpanded={expandedDoc === doc.id}
                    onToggleExpand={() =>
                      setExpandedDoc(expandedDoc === doc.id ? null : doc.id)
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Submit */}
        <motion.div
          className="pt-5 mt-auto border-t border-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.button
            type="submit"
            disabled={isLoading || !allAgreed}
            className={clsx(
              "w-full font-black uppercase tracking-[0.15em] text-sm py-5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50",
              allAgreed
                ? "bg-[#FDCB01] hover:bg-white text-black shadow-[0_10px_40px_rgba(253,203,1,0.15)] active:scale-[0.97]"
                : "bg-white/5 text-gray-600 cursor-not-allowed",
            )}
            whileHover={
              allAgreed
                ? { scale: 1.02, boxShadow: "0 15px 50px rgba(253,203,1,0.25)" }
                : {}
            }
            whileTap={allAgreed ? { scale: 0.98 } : {}}
          >
            {isLoading ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>CREANDO CUENTA...</span>
              </>
            ) : (
              <>
                <BadgeCheck className="w-5 h-5" />
                <span>UNIRME A LA RED Y SOLICITAR PANTALLA</span>
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            onClick={onPrev}
            className="w-full mt-3 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider hover:text-[#FDCB01] transition-colors py-2 flex items-center justify-center gap-2"
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </motion.button>
        </motion.div>
      </form>
    </div>
  );
}

function LegalDocumentCard({
  doc,
  checked,
  onChange,
  isExpanded,
  onToggleExpand,
}: {
  doc: LegalDocument;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = doc.icon;

  return (
    <motion.div
      className={`relative stitched-card p-4 overflow-hidden ${checked ? "ring-1" : ""} ${doc.borderColor}`}
      whileHover={{
        y: -2,
        boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(253,203,1,0.08)",
      }}
      style={
        checked
          ? {
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(253,203,1,0.1), inset 0 1px 1px rgba(255,255,255,0.1)",
            }
          : {}
      }
    >
      <div className="flex items-start gap-3">
        {/* Checkbox/Toggle */}
        <motion.div className="flex-shrink-0 mt-0.5" whileTap={{ scale: 0.9 }}>
          <label className="cursor-pointer block">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <motion.div
              className="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 peer-checked:bg-[#FDCB01] peer-checked:border-[#FDCB01] peer-checked:text-black peer-focus-visible:ring-2 peer-focus-visible:ring-[#FDCB01]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black"
              animate={{
                borderColor: checked ? "#FDCB01" : "rgba(255,255,255,0.1)",
                backgroundColor: checked ? "#FDCB01" : "transparent",
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ scale: checked ? [1, 1.2, 1] : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <CheckCircle2 className="w-4 h-4 text-black" />
              </motion.div>
            </motion.div>
          </label>
        </motion.div>

        {/* Document Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.bgColor} ${doc.borderColor} ${doc.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight">
                  {doc.title}
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  {doc.description}
                </p>
              </div>
            </div>

            {/* Expand Button */}
            <motion.button
              type="button"
              onClick={onToggleExpand}
              className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-gray-300 hover:text-[#FDCB01] border border-white/10"
              whileTap={{ scale: 0.9 }}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              style={{ zIndex: 10 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Expanded Full Text */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                key="expanded"
                className="mt-4 pt-4 border-t border-white/10"
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="bg-black/40 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                  <pre className="text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {doc.fullText}
                  </pre>
                </div>
                <motion.div
                  className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="text-[#22C55E]">
                    He leído y comprendo este documento
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Required Badge */}
      {doc.required && (
        <motion.div
          className="absolute top-3 right-3"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded">
            REQUERIDO
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// Need to import useState
import { useState } from "react";
