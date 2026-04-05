import { useState, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { 
  CloudUpload, FileVideo, CheckCircle2, 
  AlertCircle, Trash2, Search, Play, 
  ExternalLink, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import api from '@/services/api';

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

  const handleUpload = async (e: any) => {
    const uploadedFiles = Array.from(e.target.files || []) as File[];
    if (uploadedFiles.length === 0) return;

    setUploading(true);
    
    // Direct-to-Supabase Logic (Conceptual Implementation for VPS Efficiency)
    // 1. Upload to Supabase Storage
    // 2. Register metadata in NestJS Backend
    
    for (const file of uploadedFiles) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `advertiser-uploads/${fileName}`;

        // Supabase Direct Upload (Bypass Backend RAM)
        const { data, error } = await supabase.storage
          .from('media')
          .upload(filePath, file);

        if (error) throw error;

        // Register Metadata in Backend (Using our unified API proxy)
        const response = await api.post('/campaigns/register-media', {
          fileName: file.name,
          storagePath: filePath,
          url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${filePath}`,
          fileSize: file.size,
          brandId: session?.user?.app_metadata?.entityId
        });

        if (response.data) {
           const newMedia = response.data.media;
           setMediaLibrary(prev => [{
             id: newMedia.id,
             filename: file.name,
             size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
             date: new Date().toISOString(),
             status: 'READY'
           }, ...prev]);
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="space-y-1">
           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Gestión de Activos</p>
           <h1 className="text-4xl font-black uppercase tracking-tighter">Mi <span className="text-[#fad400]">Librería</span></h1>
        </div>
      </div>

      {/* Upload Zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleUpload(e); }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "relative mb-12 border-2 border-dashed rounded-[3rem] p-12 text-center transition-all cursor-pointer group overflow-hidden",
          dragActive ? "border-[#fad400] bg-[#fad400]/5" : "border-white/5 hover:border-white/10 bg-zinc-900/20"
        )}
      >
        <div className="relative z-10 flex flex-col items-center gap-4">
           <div className={clsx(
             "w-20 h-20 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110",
             uploading ? "bg-[#fad400] text-black" : "bg-zinc-800 text-[#fad400]"
           )}>
             {uploading ? <Loader2 className="w-10 h-10 animate-spin" /> : <CloudUpload className="w-10 h-10" />}
           </div>
           <div>
              <p className="text-lg font-black uppercase tracking-tight">Sube nuevos videos</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                Arrastra archivos .mp4 aquí o haz clic para explorar
              </p>
           </div>
           <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] bg-zinc-900 px-4 py-2 rounded-lg border border-white/5">
              Máximo 50MB por archivo • Resolución 16:9 o 9:16
           </p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" accept="video/*" onChange={handleUpload} />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      </motion.div>

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
    </div>
  );
}
