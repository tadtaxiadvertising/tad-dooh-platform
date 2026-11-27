"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  FileText,
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  ChevronDown,
  Shield,
  UserCheck,
  Database,
} from "lucide-react";
import clsx from "clsx";

export interface CommitmentForm {
  rnc: string;
  repName: string;
  companyName: string;
  email: string;
  phone: string;
  password: string;
}

export interface CommitmentAgreements {
  representative: boolean;
  terms: boolean;
  content_policy: boolean;
  data_processing: boolean;
}

interface CommitmentStepProps {
  form: CommitmentForm;
  onFormChange: (patch: Partial<CommitmentForm>) => void;
  agreements: CommitmentAgreements;
  onAgreementsChange: (patch: Partial<CommitmentAgreements>) => void;
  campaignSummary: {
    screens: number;
    months: number;
    budget: number;
    city?: string;
  };
  onSubmit: () => void;
  onPrev: () => void;
  isLoading: boolean;
  error: string;
}

interface LegalDocument {
  id: keyof CommitmentAgreements;
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
    title: "Representante Autorizado",
    description:
      "Confirmo ser el representante legal autorizado del negocio para contratar servicios publicitarios.",
    fullText: `DECLARACIÓN DE REPRESENTANTE AUTORIZADO

Al marcar esta casilla, declaro bajo juramento que:

1. Soy el representante legal debidamente autorizado de la empresa registrada (RNC proporcionado).
2. Tengo facultades suficientes para obligar contractualmente a la empresa en materia de publicidad y marketing.
3. La información corporativa proporcionada (RNC, nombre comercial, datos de contacto) es veraz y actualizada.
4. Me comprometo a notificar a TAD cualquier cambio en la representación legal o estructura societaria.
5. Entiendo que la falsedad en esta declaración faculta a TAD para resolver el contrato inmediatamente y reclamar daños y perjuicios.

Esta declaración tiene carácter de declaración jurada con efectos legales ante las autoridades competentes de la República Dominicana.`,
    required: true,
    color: "text-[#FDCB01]",
    bgColor: "bg-[#FDCB01]/10",
    borderColor: "border-[#FDCB01]/30",
  },
  {
    id: "terms",
    icon: FileText,
    title: "Términos de Servicio",
    description:
      "Acepto los términos y condiciones del servicio de publicidad DOOH de TAD.",
    fullText: `TÉRMINOS DE SERVICIO TAD - PUBLICIDAD DOOH

ENTRE: TAD TECHNOLOGIES S.R.L. (en adelante "TAD") y EL ANUNCIANTE.

1. OBJETO: Contratación de espacios publicitarios en la red de pantallas digitales vehiculares TAD (Digital Out-of-Home).

2. ENTREGA DE CONTENIDOS:
   - El Anunciante provee creativos en formatos aprobados (MP4, WebM, JPG, PNG).
   - TAD realiza control de calidad técnico (resolución, duración, codecs).
   - Plazo de activación: 48h hábiles tras aprobación de creativos.

3. PROGRAMACIÓN Y FRECUENCIA:
   - Rotación cada 30 segundos (configurable por campaña).
   - Exposición garantizada en rutas y horarios contratados.
   - Reportes de impresiones disponibles en panel del anunciante.

4. FACTURACIÓN Y PAGO:
   - Facturación mensual anticipada o según acuerdo comercial.
   - Vencimiento: 15 días hábiles desde emisión de factura.
   - Mora: Interés 1.5% mensual + gastos de cobranza.

5. PROPIEDAD INTELECTUAL:
   - El Anunciante garantiza derechos sobre creativos.
   - Licencia no exclusiva a TAD para exhibición en red DOOH.
   - TAD no adquiere propiedad de marcas ni creativos.

6. RESPONSABILIDAD:
   - TAD garantiza uptime 95% de la red de pantallas.
   - Fuerza mayor exime responsabilidad (desastres, huelgas, regulaciones).
   - Límite de responsabilidad: monto facturado del período afectado.

7. CONFIDENCIALIDAD: Datos de campaña y métricas son confidenciales.

8. JURISDICCIÓN: Tribunales de Santo Domingo, República Dominicana.`,
    required: true,
    color: "text-[#22C55E]",
    bgColor: "bg-[#22C55E]/10",
    borderColor: "border-[#22C55E]/30",
  },
  {
    id: "content_policy",
    icon: Shield,
    title: "Política de Contenido Publicitario",
    description:
      "Acepto la política de contenido: no político, no adulto, no engañoso, cumplimiento legal.",
    fullText: `POLÍTICA DE CONTENIDO PUBLICITARIO TAD

PRINCIPIOS FUNDAMENTALES:
TAD opera una red de pantallas en espacios públicos de acceso general. Todo contenido debe ser apto para todo público y cumplir la legislación dominicana.

CONTENIDO PROHIBIDO (Bloqueo automático + penalización):
❌ Contenido político-partidario, electoral o de propaganda gubernamental
❌ Contenido para adultos, sexualmente sugerente o pornográfico
❌ Publicidad engañosa, falsa o que induzca a error (Ley 358-05)
❌ Promoción de sustancias controladas, tabaco, alcohol a menores
❌ Contenido que incite a violencia, discriminación u odio
❌ Juegos de azar sin licencia oficial (Ley 494-06)
❌ Servicios financieros no regulados por Superintendencia de Bancos
❌ Contenido que viole propiedad intelectual o marcas registradas

CONTENIDO RESTRINGIDO (Requiere aprobación previa):
⚠️ Medicamentos y productos de salud (requiere aval MISPAS)
⚠️ Servicios financieros regulados (requiere aval Superintendencia)
⚠️ Alimentos y bebidas (cumplir NORDOM 53)
⚠️ Concursos y promociones (bases legales registradas)

ESTÁNDARES TÉCNICOS Y ÉTICOS:
✅ Verdad comprobable en claims y beneficios
✅ Respeto a dignidad humana y diversidad
✅ Identificación clara del anunciante (marca visible)
✅ Cumplimiento normas técnicas TAD (safe area, duration, codecs)

PROCESO DE REVISIÓN:
1. Envío de creativos → 2. Revisión automática (IA) → 3. Revisión humana (equipo TAD) → 4. Aprobación/Rechazo con feedback

SANCIONES POR INCUMPLIMIENTO:
- Retiro inmediato de pantalla sin reembolso
- Multa contractual: 50% del valor campaña restante
- Inclusión en lista de anunciantes restringidos (12 meses)
- Reporte a PROCONSUMIDOR si aplica

El Anunciante indemniza a TAD por reclamaciones terceros por contenido ilegal.`,
    required: true,
    color: "text-[#FF8C00]",
    bgColor: "bg-[#FF8C00]/10",
    borderColor: "border-[#FF8C00]/30",
  },
  {
    id: "data_processing",
    icon: Database,
    title: "Tratamiento de Datos",
    description:
      "Autorizo el tratamiento de mis datos personales y corporativos según Ley 172-13 y RGPD.",
    fullText: `AUTORIZACIÓN DE TRATAMIENTO DE DATOS PERSONALES Y CORPORATIVOS

BASE LEGAL: Ley 172-13 (Protección de Datos Personales RD) y Reglamento General de Protección de Datos (RGPD UE 2016/679) por aplicación extraterritorial.

RESPONSABLE DEL TRATAMIENTO:
TAD TECHNOLOGIES S.R.L., RNC: 1-31-XXXXX-X, Av. Winston Churchill, Santo Domingo.
DPO: dpo@tad.do | Tel: +1-809-XXX-XXXX

DATOS RECOPILADOS:
• Datos identificación: RNC, razón social, nombre comercial
• Datos representante: Nombre, cédula, correo, teléfono
• Datos facturación: Dirección fiscal, régimen tributario
• Datos campaña: Métricas, impresiones, ubicaciones, creativos
• Datos navegación: IP, dispositivo, logs de acceso al panel

FINALIDADES:
1. Ejecución contractual: Gestión de campaña, facturación, reportes
2. Obligación legal: Cumplimiento DGII, PROCONSUMIDOR, INDOTEL
3. Interés legítimo: Mejora de servicio, prevención fraude, analíticas agregadas
4. Consentimiento: Comunicaciones comerciales (opcional, revocable)

DESTINATARIOS:
- Procesadores de pago (Stripe, bancos locales) - solo datos facturación
- Proveedores cloud (AWS, Supabase) - bajo cláusulas contractuales tipo
- Autoridades competentes - solo por mandato legal

DERECHOS DEL TITULAR (ARCO+P):
✅ Acceso - Rectificación - Cancelación - Oposición
✅ Portabilidad - Limitación - Olvido - No decisiones automatizadas
Ejercicio: dpo@tad.do | Plazo: 15 días hábiles

CONSERVACIÓN:
- Datos contractuales: 10 años (Código de Comercio Art. 32)
- Datos fiscales: 10 años (Código Tributario Art. 68)
- Datos navegación: 24 meses (interés legítimo)
- Datos marketing: Hasta revocación consentimiento

MEDIDAS DE SEGURIDAD:
🔒 Cifrado AES-256 en reposo, TLS 1.3 en tránsito
🔒 Acceso por roles (RBAC) + MFA obligatorio staff
🔒 Auditorías seguridad anuales (ISO 27001 aligned)
🔒 Plan respuesta incidentes 72h (RGPD Art. 33)

TRANSFERENCIAS INTERNACIONALES:
Servidores en EE.UU. (AWS us-east-1) - Cláusulas Contractuales Tipo UE vigentes.

REVOCACIÓN: En cualquier momento sin efectos retroactivos sobre legalidad previa.

Al aceptar, confirmas haber leído, comprendido y autorizado libremente este tratamiento.`,
    required: true,
    color: "text-[#E51636]",
    bgColor: "bg-[#E51636]/10",
    borderColor: "border-[#E51636]/30",
  },
];

const inputClass =
  "w-full min-h-[48px] bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-[#FDCB01]/70 transition-colors";

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <label
        htmlFor={id}
        className="block text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1 text-[#AAAAAA] group-focus-within:text-[#FDCB01] transition-colors"
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center text-white/25 group-focus-within:text-[#FDCB01] transition-colors pointer-events-none">
          <Icon className="w-4 h-4" />
        </div>
        {children}
      </div>
    </motion.div>
  );
}

export default function CommitmentStep({
  form,
  onFormChange,
  agreements,
  onAgreementsChange,
  campaignSummary,
  onSubmit,
  onPrev,
  isLoading,
  error,
}: CommitmentStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<
    keyof CommitmentAgreements | null
  >(null);

  const allAgreed = Object.values(agreements).every((v) => v);

  return (
    <motion.div
      className="flex flex-col flex-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="text-center pt-5 pb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-[26px] sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.05] mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Asegura tu campaña
        </motion.h1>
        <motion.p
          className="text-xs text-[#AAAAAA] font-bold uppercase tracking-wider"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Tu plan simulado:{" "}
          <span className="text-[#22C55E]">
            {campaignSummary.city && `${campaignSummary.city} · `}
            {campaignSummary.screens} pantallas · {campaignSummary.months} mes
            {campaignSummary.months > 1 ? "es" : ""} · RD$
            {campaignSummary.budget.toLocaleString()}
          </span>
        </motion.p>
      </motion.div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
        className="bg-[#121212]/80 border border-white/10 rounded-xl p-5 sm:p-8 space-y-4 flex-1 flex flex-col overflow-y-auto"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-center gap-2 text-red-400"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-[11px] font-bold">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Field id="ob-rnc" label="RNC / Cédula del negocio" icon={FileText}>
            <input
              id="ob-rnc"
              type="text"
              value={form.rnc}
              onChange={(e) => onFormChange({ rnc: e.target.value })}
              placeholder="1-31-00000-1"
              autoComplete="off"
              className={`${inputClass} pl-11`}
            />
          </Field>

          <Field id="ob-rep" label="Representante autorizado" icon={User}>
            <input
              id="ob-rep"
              type="text"
              value={form.repName}
              onChange={(e) => onFormChange({ repName: e.target.value })}
              placeholder="Nombre completo"
              autoComplete="name"
              className={`${inputClass} pl-11`}
            />
          </Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Field
            id="ob-company"
            label="Nombre del negocio / Marca"
            icon={Building2}
          >
            <input
              id="ob-company"
              type="text"
              value={form.companyName}
              onChange={(e) => onFormChange({ companyName: e.target.value })}
              placeholder="Tu marca"
              autoComplete="organization"
              className={`${inputClass} pl-11`}
            />
          </Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Field id="ob-email" label="Correo corporativo" icon={Mail}>
            <input
              id="ob-email"
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ email: e.target.value })}
              placeholder="contacto@tuempresa.com"
              autoComplete="email"
              className={`${inputClass} pl-11`}
            />
          </Field>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Field id="ob-phone" label="Teléfono de contacto" icon={Phone}>
            <input
              id="ob-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => onFormChange({ phone: e.target.value })}
              placeholder="809-555-0000"
              autoComplete="tel"
              className={`${inputClass} pl-11`}
            />
          </Field>

          <motion.div className="group relative">
            <Field id="ob-pass" label="Contraseña" icon={Lock}>
              <input
                id="ob-pass"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => onFormChange({ password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className={`${inputClass} pl-11 pr-11`}
              />
            </Field>
            <motion.button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-3.5 bottom-[13px] text-white/30 hover:text-[#FDCB01] transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Legal Documents as Interactive Glass Cards */}
        <motion.div
          className="pt-2 space-y-3 border-t border-white/[0.06] mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
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
                  checked={agreements[doc.id]}
                  onChange={onAgreementsChange}
                  isExpanded={expandedDoc === doc.id}
                  onToggleExpand={() =>
                    setExpandedDoc(expandedDoc === doc.id ? null : doc.id)
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-3 pt-2 mt-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.button
            type="button"
            onClick={onPrev}
            disabled={isLoading}
            className="order-2 sm:order-1 w-full min-h-[48px] py-3 bg-white/[0.04] border border-white/10 text-[#AAAAAA] hover:text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            whileHover={{
              scale: 1.02,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            Ajustar simulación
          </motion.button>
          <motion.button
            type="submit"
            disabled={isLoading || !allAgreed}
            className={clsx(
              "order-1 sm:order-2 w-full min-h-[52px] font-black uppercase tracking-[0.12em] text-sm py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50",
              allAgreed
                ? "bg-[#FDCB01] hover:bg-white text-black shadow-[0_0_44px_rgba(253,203,1,0.28)]"
                : "bg-white/5 text-gray-600 cursor-not-allowed",
            )}
            whileHover={
              allAgreed
                ? { scale: 1.02, boxShadow: "0 10px 50px rgba(253,203,1,0.4)" }
                : {}
            }
            whileTap={allAgreed ? { scale: 0.98 } : {}}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Asegurando...</span>
              </>
            ) : (
              <>
                <BadgeCheck className="w-5 h-5" />
                <span>Asegurar mi campaña</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
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
  onChange: (patch: Partial<CommitmentAgreements>) => void;
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
        <motion.div className="flex-shrink-0 mt-0.5" whileTap={{ scale: 0.9 }}>
          <label className="cursor-pointer block">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) =>
                onChange({
                  [doc.id]: e.target.checked,
                } as Partial<CommitmentAgreements>)
              }
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
