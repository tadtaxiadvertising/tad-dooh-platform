import { getErrorMessage } from "@tad/services";
import React, { useEffect, useState } from "react";
import { useAuth } from "@tad/ui";
import { AdvertiserLayout } from "@/components/layout/AdvertiserLayout";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
} from "lucide-react";
import clsx from "clsx";
import type { GetServerSideProps } from "next";
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

type PortalRequest = {
  id: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  title: string;
  description?: string;
  data?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  APPROVED: {
    label: "Aprobada",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

export default function RequestsPage() {
  const { session } = useAuth();
  const entityId = session?.user?.app_metadata?.entityId || session?.user?.id;
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("GENERAL");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!entityId || !session?.access_token) return;
    setLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/proxy/portal-requests/advertiser/${entityId}`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    )
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar solicitudes");
        return r.json();
      })
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Error al cargar solicitudes");
        setLoading(false);
      });
  }, [entityId, session?.access_token]);

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !entityId || !session?.access_token) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/proxy/portal-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            advertiserId: entityId,
            type: newType,
            title: newTitle,
            description: newDescription,
            status: "PENDING",
          }),
        },
      );
      if (!res.ok) throw new Error("No se pudo enviar la solicitud");
      setShowNewModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewType("GENERAL");
      // Reload list
      const listRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/proxy/portal-requests/advertiser/${entityId}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (listRes.ok) setRequests(await listRes.json());
    } catch (err: unknown) {
      alert("Error: " + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdvertiserLayout
      title="Solicitudes"
      subtitle="Historial y respuestas del admin"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#fad400]" />
              Historial de <span className="text-[#fad400]">Solicitudes</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">
              Estado y respuestas del equipo TAD
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10"
          >
            <Send className="w-3.5 h-3.5" />
            Nueva Solicitud
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-[#fad400] border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Cargando solicitudes...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-zinc-900/50 border border-white/5 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              Sin solicitudes
            </h3>
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mt-2">
              Crea tu primera solicitud para ver el historial aquí
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              const Icon = cfg.icon;
              const isExpanded = expandedId === req.id;
              const hasNotes =
                req.adminNotes && req.adminNotes.trim().length > 0;

              return (
                <div
                  key={req.id}
                  className={clsx(
                    "rounded-2xl border transition-all overflow-hidden",
                    "bg-zinc-900/30 backdrop-blur-xl",
                    cfg.border,
                  )}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-zinc-800/40 transition-colors"
                  >
                    <div
                      className={clsx(
                        "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                        cfg.bg,
                      )}
                    >
                      <Icon className={clsx("w-5 h-5", cfg.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate">
                          {req.title}
                        </h3>
                        <span
                          className={clsx(
                            "shrink-0 text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full",
                            cfg.bg,
                            cfg.color,
                            "border",
                            cfg.border,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                        {req.type} ·{" "}
                        {new Date(req.createdAt).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {hasNotes && (
                      <div className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-[#fad400] uppercase tracking-widest">
                        <MessageSquare className="w-3 h-3" />
                        <span className="hidden sm:inline">Respuesta</span>
                      </div>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/5">
                      {req.description && (
                        <div className="mt-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                            Descripción
                          </p>
                          <p className="text-sm text-zinc-400">
                            {req.description}
                          </p>
                        </div>
                      )}

                      {hasNotes && (
                        <div className="mt-4 p-4 bg-[#fad400]/5 border border-[#fad400]/10 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#fad400] mb-1.5 flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" />
                            Respuesta del Admin
                          </p>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                            {req.adminNotes}
                          </p>
                        </div>
                      )}

                      {!hasNotes && req.status === "PENDING" && (
                        <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-xs text-zinc-500 font-bold">
                            Esperando respuesta del admin...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* New Request Modal */}
        {showNewModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl overflow-y-auto">
            <div className="bg-zinc-900 border border-white/5 rounded-[3rem] w-full max-w-lg p-10 space-y-8 shadow-3xl relative my-auto">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-2">
                  Nueva <span className="text-[#fad400]">Solicitud</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Describe tu solicitud para el equipo TAD
                </p>
              </div>

              <form onSubmit={handleNewRequest} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                    Tipo
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#fad400] h-[54px]"
                  >
                    <option value="GENERAL">General</option>
                    <option value="CAMPAIGN_CREATE">Crear Campaña</option>
                    <option value="CONTENT_UPDATE">Actualizar Contenido</option>
                    <option value="PAYOUT">Solicitud de Pago</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                    Asunto
                  </label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: Necesito actualizar mi logo"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                    Detalle
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe lo que necesitas..."
                    rows={4}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-4 bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newTitle.trim()}
                    className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10 disabled:opacity-30"
                  >
                    {submitting ? "Enviando..." : "Enviar Solicitud"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdvertiserLayout>
  );
}
