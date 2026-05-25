import { useEffect, useState } from 'react';
import { FileVideo, CheckCircle2, Trash2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteMedia, getMedia } from "@tad/services";
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { VideoUpload } from '@/components/VideoUpload';

export default function AdvertiserMedia() {
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);

  const loadMedia = async () => {
    try {
      const data = await getMedia();
      const normalized = Array.isArray(data) ? data.map((item: any) => ({
        id: item.id,
        filename: item.originalFilename || item.filename || 'video.mp4',
        size: `${((Number(item.size || 0)) / (1024 * 1024)).toFixed(1)} MB`,
        date: item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : '-',
        status: item.status || 'READY'
      })) : [];
      setMediaLibrary(normalized);
    } catch (error) {
      console.error('Error cargando media:', error);
      setMediaLibrary([]);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const onUploadComplete = () => {
    loadMedia();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMedia(id);
      await loadMedia();
    } catch (error) {
      console.error('Error eliminando media:', error);
    }
  };

  return (
    <AdvertiserLayout title="Librería de Media" subtitle="Gestión de Activos">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Gestión de Activos</p>
           <h1 className="text-4xl font-black uppercase tracking-tighter">Mi <span className="text-[#fad400]">Librería</span></h1>
        </div>
      </div>

      {/* Advanced Video Transcoder & Upload Zone */}
      <div className="mb-12">
        <VideoUpload onUploadComplete={onUploadComplete} />
      </div>

      {/* Media Library Grid */}
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Archivos Recientes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {mediaLibrary.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 hover:bg-zinc-800/40 transition-all group"
            >
              <div className="aspect-video bg-black/60 rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden group-hover:border-[#fad400]/20 border border-transparent transition-all">
                 <FileVideo className="w-10 h-10 text-zinc-800 group-hover:text-[#fad400]/40 transition-colors" />
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/40">
                    <button className="w-12 h-12 rounded-full bg-[#fad400] text-black flex items-center justify-center translate-y-4 group-hover:translate-y-0 transition-transform">
                       <Play className="w-5 h-5 fill-current" />
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <div>
                    <h4 className="text-xs font-black uppercase tracking-tight line-clamp-1 group-hover:text-[#fad400] transition-colors">{item.filename}</h4>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{item.size} • {item.date}</p>
                 </div>

                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Ready for Playback</span>
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors">
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AdvertiserLayout>
  );
}
