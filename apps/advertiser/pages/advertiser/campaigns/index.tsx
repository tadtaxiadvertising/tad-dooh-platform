import { getErrorMessage } from "@tad/services";
import type { AdvertiserCampaign } from "../../../types/portal-api";
import { useEffect, useState } from "react";
import { useAuth } from "@tad/ui";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  FileVideo,
  Sparkles,
  Loader2,
  QrCode,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AdvertiserLayout } from "../../../components/layout/AdvertiserLayout";
import type { GetServerSideProps } from "next";
// Force dynamic rendering — prevents "No QueryClient set" SSR errors
export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});

export default function AdvertiserCampaigns() {
  const { session } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    mediaUrl: "",
    category: "General",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<AdvertiserCampaign[]>([]);
  const [search, setSearch] = useState("");

  // States for Video Generator
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedCampaignId] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [generatorData, setGeneratorData] = useState({
    logoUrl: "",
    brandColor: "#fad400",
    primaryText: "",
    secondaryText: "",
  });

  // States for QR Hub Editor
  const [showQrHub, setShowQrHub] = useState(false);
  const [qrCampaign, setQrCampaign] = useState<AdvertiserCampaign | null>(null);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrData, setQrData] = useState({
    whatsapp: "",
    instagram: "",
    facebook: "",
    websiteUrl: "",
    pedidosYaUrl: "",
    uberEatsUrl: "",
  });

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/proxy/campaigns`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          },
        );
        const data = await res.json();
        setCampaigns(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching campaigns:", e);
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) fetchCampaigns();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entityId = session?.user?.app_metadata?.entityId || session?.user?.id;
    if (!entityId || !session?.access_token) return;

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
            type: "CAMPAIGN_CREATE",
            title: `NUEVA CAMPAÑA: ${formData.name}`,
            description: formData.description,
            data: JSON.stringify({
              name: formData.name,
              startDate: formData.startDate,
              endDate: formData.endDate,
              mediaUrl: formData.mediaUrl,
              category: formData.category,
            }),
            status: "PENDING",
          }),
        },
      );

      if (res.ok) {
        alert(
          "✅ Solicitud enviada correctamente. El equipo de TAD revisará tu campaña antes de activarla.",
        );
        setShowModal(false);
        setFormData({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          mediaUrl: "",
          category: "General",
        });
      } else {
        throw new Error("No se pudo enviar la solicitud");
      }
    } catch (err: unknown) {
      alert("❌ Error: " + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !session?.access_token) return;

    setRendering(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/proxy/campaigns/${selectedCampaignId}/generate-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(generatorData),
        },
      );

      if (!res.ok) throw new Error("Fallo al generar el video");

      await res.json();
      alert(
        "✅ ¡Video generado con éxito! El sistema lo ha registrado en tu campaña.",
      );
      setShowGenerator(false);
      // Refresh campaigns to show new asset
      window.location.reload();
    } catch (err: unknown) {
      alert("❌ Error de Renderizado: " + getErrorMessage(err));
    } finally {
      setRendering(false);
    }
  };

  const openQrHub = (campaign: AdvertiserCampaign) => {
    setQrCampaign(campaign);
    setQrData({
      whatsapp: campaign.whatsapp || "",
      instagram: campaign.instagram || "",
      facebook: campaign.facebook || "",
      websiteUrl: campaign.websiteUrl || "",
      pedidosYaUrl: campaign.pedidosYaUrl || "",
      uberEatsUrl: campaign.uberEatsUrl || "",
    });
    setShowQrHub(true);
  };

  const handleSaveQrHub = async () => {
    if (!qrCampaign || !session?.access_token) return;
    setQrSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/proxy/campaigns/${qrCampaign.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(qrData),
        },
      );
      if (!res.ok) throw new Error("No se pudieron guardar los enlaces");
      // Update local state
      setCampaigns((prev) =>
        prev.map((c) => (c.id === qrCampaign.id ? { ...c, ...qrData } : c)),
      );
      setShowQrHub(false);
      setQrCampaign(null);
    } catch (err: unknown) {
      alert("Error: " + getErrorMessage(err));
    } finally {
      setQrSaving(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdvertiserLayout title="Mis Campañas" subtitle="Gestión de Pautas">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Mis <span className="text-[#fad400]">Campañas</span>
          </h1>
        </div>

        <motion.button
          onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3 px-8 py-4 bg-[#fad400] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_10px_30px_rgba(250,212,0,0.2)]"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </motion.button>
      </div>

      {/* Modal - New Campaign */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-white/5 rounded-[3rem] w-full max-w-2xl p-10 space-y-10 shadow-3xl relative my-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
            >
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-2">
                  Nueva{" "}
                  <span className="text-tad-yellow">Pauta Publicitaria</span>
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Configura los detalles de tu nuevo anuncio
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                        Nombre de la Campaña
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Ex: Ofertas Verano 2026"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-tad-yellow transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                        Categoría
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-tad-yellow h-[54px]"
                      >
                        <option value="General">General</option>
                        <option value="Retail">Retail</option>
                        <option value="Servicios">Servicios</option>
                        <option value="Turismo">Turismo</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                        Fecha Inicio
                      </label>
                      <input
                        required
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-tad-yellow text-zinc-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                        Fecha Fin
                      </label>
                      <input
                        required
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-tad-yellow text-zinc-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                      URL del Video / Arte (MP4/JPG)
                    </label>
                    <input
                      required
                      type="url"
                      value={formData.mediaUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, mediaUrl: e.target.value })
                      }
                      placeholder="https://su-servidor.com/anuncio.mp4"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-tad-yellow transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                      Notas / Briefing
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe el objetivo de tu pauta..."
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-tad-yellow transition-all min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-tad-yellow/10 disabled:opacity-30"
                  >
                    {submitting
                      ? "Enviando Nexus Hub..."
                      : "Solicitar Aprobación"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Video Generator */}
      <AnimatePresence>
        {showGenerator && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-[#fad400]/20 rounded-[3rem] w-full max-w-xl p-10 space-y-8 shadow-4xl relative shadow-[0_50px_100px_rgba(250,212,0,0.1)]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-[#fad400]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fad400]">
                      AI Creative Engine
                    </span>
                  </div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                    Auto <span className="text-white">Ads Generator</span>
                  </h2>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mt-2">
                    Crea un video profesional en segundos solo con tu logo
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleGenerateVideo}
                className="interface-stack space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 italic">
                      Enlace de tu Logo (PNG/SVG)
                    </label>
                    <input
                      required
                      type="url"
                      value={generatorData.logoUrl}
                      onChange={(e) =>
                        setGeneratorData({
                          ...generatorData,
                          logoUrl: e.target.value,
                        })
                      }
                      placeholder="https://tuweb.com/logo.png"
                      className="w-full bg-black/60 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 italic">
                        Color de Marca
                      </label>
                      <input
                        type="color"
                        value={generatorData.brandColor}
                        onChange={(e) =>
                          setGeneratorData({
                            ...generatorData,
                            brandColor: e.target.value,
                          })
                        }
                        className="w-full h-[54px] bg-black/60 border border-white/5 rounded-2xl px-2 py-2 outline-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 italic">
                        Previsualización
                      </label>
                      <div className="w-full h-[54px] rounded-2xl flex items-center justify-center border border-dashed border-zinc-800 text-[10px] font-bold text-zinc-600 uppercase">
                        10s Vertical HD
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 italic">
                      Texto Principal (Oferta/Hook)
                    </label>
                    <input
                      required
                      maxLength={35}
                      type="text"
                      value={generatorData.primaryText}
                      onChange={(e) =>
                        setGeneratorData({
                          ...generatorData,
                          primaryText: e.target.value,
                        })
                      }
                      placeholder="EJ: PIZZAS 2X1 HOY!"
                      className="w-full bg-black/60 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4 italic">
                      Subtexto (Llamada a la acción)
                    </label>
                    <input
                      required
                      maxLength={45}
                      type="text"
                      value={generatorData.secondaryText}
                      onChange={(e) =>
                        setGeneratorData({
                          ...generatorData,
                          secondaryText: e.target.value,
                        })
                      }
                      placeholder="EJ: ORDENA EN NUESTRA WEB"
                      className="w-full bg-black/60 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGenerator(false)}
                    className="flex-1 py-4 bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/10"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={rendering}
                    className="flex-[2] py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/20 disabled:opacity-50 relative overflow-hidden"
                  >
                    {rendering ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Renderizando MP4...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Generar Video Profesional
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#fad400] transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nombre de campaña..."
            className="w-full bg-zinc-900/30 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-[#fad400]/40 transition-all placeholder:text-zinc-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="px-6 py-4 bg-zinc-900/30 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-zinc-800/50 transition-colors">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Filtros
          </span>
        </button>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-2 border-[#fad400] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Sincronizando con el servidor...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCampaigns.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden hover:bg-zinc-800/40 transition-all"
              >
                {/* Status Badge Overlay */}
                <div className="absolute top-6 right-6">
                  <div
                    className={clsx(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2",
                      campaign.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-orange-500/10 text-orange-500 border border-orange-500/20",
                    )}
                  >
                    <div
                      className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        campaign.status === "ACTIVE"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-orange-500",
                      )}
                    />
                    {campaign.status}
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0">
                      <FileVideo className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div className="pr-16">
                      <h3 className="text-xl font-black uppercase tracking-tight line-clamp-1 group-hover:text-[#fad400] transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                        ID: {campaign.id.split("-")[0]}...
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.02]">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Inicio
                      </p>
                      <p className="text-[11px] font-bold">
                        {format(new Date(campaign.startDate), "dd MMM, yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/[0.02]">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Fin
                      </p>
                      <p className="text-[11px] font-bold">
                        {format(new Date(campaign.endDate), "dd MMM, yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* TAD-ADVERTISER: Remotion generator temporarily disabled as per plan */}
                    {/* 
                         <button 
                           onClick={() => {
                             setSelectedCampaignId(campaign.id);
                             setShowGenerator(true);
                           }}
                           className="p-3 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white rounded-xl transition-all group/gen"
                           title="Auto-Generador de Video"
                         >
                            <Wand2 className="w-4 h-4" />
                         </button>
                         */}
                    <button
                      onClick={() => openQrHub(campaign)}
                      className="p-3 bg-zinc-800/50 hover:bg-[#fad400] hover:text-black rounded-xl transition-all"
                      title="Editar QR Hub"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button className="p-3 bg-zinc-800/50 hover:bg-[#fad400] hover:text-black rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-3 bg-zinc-800/50 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredCampaigns.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-zinc-800 mx-auto" />
              <div>
                <p className="text-lg font-black uppercase tracking-tight">
                  No se encontraron campañas
                </p>
                <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">
                  Intenta con otro término de búsqueda
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Modal - QR Hub Editor */}
      {showQrHub && qrCampaign && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl overflow-y-auto">
          <div className="bg-zinc-900 border border-[#fad400]/10 rounded-[3rem] w-full max-w-lg p-10 space-y-8 shadow-3xl relative my-auto">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-5 h-5 text-[#fad400]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fad400]">
                  QR Hub
                </span>
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">
                Enlaces de <span className="text-[#fad400]">Conversión</span>
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Configura los enlaces que verá el pasajero al escanear el QR de:{" "}
                {qrCampaign.name}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                  WhatsApp de Ventas
                </label>
                <input
                  type="tel"
                  value={qrData.whatsapp}
                  onChange={(e) =>
                    setQrData({ ...qrData, whatsapp: e.target.value })
                  }
                  placeholder="Ej: 8091234567"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                  Instagram
                </label>
                <input
                  type="text"
                  value={qrData.instagram}
                  onChange={(e) =>
                    setQrData({ ...qrData, instagram: e.target.value })
                  }
                  placeholder="Ej: @tuempresa"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                  Facebook
                </label>
                <input
                  type="url"
                  value={qrData.facebook}
                  onChange={(e) =>
                    setQrData({ ...qrData, facebook: e.target.value })
                  }
                  placeholder="https://facebook.com/tuempresa"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                  Sitio Web
                </label>
                <input
                  type="url"
                  value={qrData.websiteUrl}
                  onChange={(e) =>
                    setQrData({ ...qrData, websiteUrl: e.target.value })
                  }
                  placeholder="https://tusitio.com"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                    PedidosYa
                  </label>
                  <input
                    type="url"
                    value={qrData.pedidosYaUrl}
                    onChange={(e) =>
                      setQrData({ ...qrData, pedidosYaUrl: e.target.value })
                    }
                    placeholder="https://pedidosya.com/..."
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-4">
                    Uber Eats
                  </label>
                  <input
                    type="url"
                    value={qrData.uberEatsUrl}
                    onChange={(e) =>
                      setQrData({ ...qrData, uberEatsUrl: e.target.value })
                    }
                    placeholder="https://ubereats.com/..."
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-zinc-800 outline-none focus:border-[#fad400] transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowQrHub(false);
                  setQrCampaign(null);
                }}
                className="flex-1 py-4 bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQrHub}
                disabled={qrSaving}
                className="flex-1 py-4 bg-[#fad400] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#fad400]/10 disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {qrSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {qrSaving ? "Guardando..." : "Guardar Enlaces"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdvertiserLayout>
  );
}
