import { useState, useRef } from 'react';
import { useAuth } from '@tad/ui';
import { 
  CloudUpload, FileVideo, CheckCircle2, 
  AlertCircle, Trash2, Search, Play, 
  ExternalLink, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { supabase } from "@tad/services";
import api from "@tad/services";
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { VideoUpload } from '@/components/VideoUpload';

export default function AdvertiserMedia() {
  const { session } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // MOCK MEDIA FOR DEMO
  const [mediaLibrary, setMediaLibrary] = useState([
    { id: '1', filename: 'Promo_Primavera_30s.mp4', size: '12.4 MB', date: '2026-03-15', status: 'READY' },
    { id: '2', filename: 'Logo_Animado_Vert.mp4', size: '4.8 MB', date: '2026-03-12', status: 'READY' },
  ]);


  const onUploadComplete = (newMedia: any) => {
    setMediaLibrary(prev => [{
      id: newMedia.id,
      filename: newMedia.fileName,
      size: `${(newMedia.fileSize / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date().toISOString(),
      status: 'READY'
    }, ...prev]);
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
                    <button className="p-2 text-zinc-600 hover:text-rose-500 transition-colors">
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
