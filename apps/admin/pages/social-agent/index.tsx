import React from "react";
import Head from "next/head";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@tad/services";

interface SocialPostDraft {
  id: string;
  platform: string;
  copy: string;
  mediaUrl: string;
  status: string;
  scheduledFor: string;
  createdAt: string;
}

export default function SocialAgentPage() {
  const queryClient = useQueryClient();

  const { data: drafts, isLoading } = useQuery<SocialPostDraft[]>({
    queryKey: ["social-drafts"],
    queryFn: async () => {
      const response = await api.get("/social-agent/drafts");
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/social-agent/approve/${id}`);
    },
    onSuccess: () => {
      toast.success("Borrador aprobado y publicado");
      queryClient.invalidateQueries({ queryKey: ["social-drafts"] });
    },
    onError: () => {
      toast.error("Error al aprobar el borrador");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/social-agent/reject/${id}`);
    },
    onSuccess: () => {
      toast.success("Borrador rechazado");
      queryClient.invalidateQueries({ queryKey: ["social-drafts"] });
    },
    onError: () => {
      toast.error("Error al rechazar el borrador");
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      await api.post("/social-agent/trigger-cron");
    },
    onSuccess: () => {
      toast.info("Generación de contenido iniciada");
      setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["social-drafts"] }),
        5000,
      );
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <Head>
        <title>Social Agent | TAD Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Social Agent <span className="text-[#FFD400]">B2B</span>
            </h1>
            <p className="text-gray-400">
              Gestión autónoma de contenido para Meta (IG/FB)
            </p>
          </div>
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="bg-[#FFD400] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#e6c000] transition-colors disabled:opacity-50"
          >
            {triggerMutation.isPending ? "Generando..." : "Generar Borradores"}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD400]"></div>
          </div>
        ) : drafts?.length === 0 ? (
          <div className="text-center py-20 bg-[#141414] rounded-2xl border border-gray-800">
            <p className="text-gray-500 text-xl">
              No hay borradores pendientes
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {drafts?.map((draft) => (
              <div
                key={draft.id}
                className="bg-[#141414] rounded-2xl overflow-hidden border border-gray-800 flex flex-col"
              >
                <div className="relative aspect-square">
                  <img
                    src={draft.mediaUrl}
                    alt="Generated content"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-[#FFD400]/30 text-[#FFD400]">
                    {draft.platform}
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col">
                  <div className="mb-4 flex-grow">
                    <h3 className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                      Copy Sugerido
                    </h3>
                    <p className="text-gray-200 text-sm leading-relaxed italic">
                      "{draft.copy}"
                    </p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-800 flex gap-4">
                    <button
                      onClick={() => approveMutation.mutate(draft.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-[#FFD400] text-black py-2 rounded-lg text-sm font-bold hover:bg-[#e6c000] transition-colors disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(draft.id)}
                      disabled={rejectMutation.isPending}
                      className="flex-1 bg-transparent border border-red-500/50 text-red-500 py-2 rounded-lg text-sm font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
