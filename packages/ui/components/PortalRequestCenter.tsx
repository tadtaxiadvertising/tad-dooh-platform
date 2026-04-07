import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus,
  AlertCircle,
  X
} from 'lucide-react';
import api from '@tad/services';
import clsx from 'clsx';

interface PortalRequestCenterProps {
  portalType: 'ADVERTISER' | 'DRIVER';
  userId: string;
}

export function PortalRequestCenter({ portalType, userId }: PortalRequestCenterProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New request form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('GENERAL');

  useEffect(() => {
    loadRequests();
  }, [userId, portalType]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const endpoint = portalType === 'ADVERTISER' 
        ? `/portal-requests/advertiser/${userId}` 
        : `/portal-requests/driver/${userId}`;
      const response = await api.get(endpoint);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        title,
        description,
        type,
        portalType,
      };

      if (portalType === 'ADVERTISER') {
        payload.advertiserId = userId;
      } else {
        payload.driverId = userId;
      }

      await api.post('/portal-requests', payload);
      
      // Reset form and reload
      setTitle('');
      setDescription('');
      setShowModal(false);
      loadRequests();
    } catch (error: any) {
      alert('Error enviando solicitud: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
           <MessageSquare className="w-5 h-5 text-[#fad400]" />
           <h3 className="text-sm font-black uppercase tracking-widest">Centro de Solicitudes</h3>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="p-2 bg-[#fad400] text-black rounded-xl hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center animate-pulse">
           <Clock className="w-6 h-6 text-zinc-700 mx-auto mb-2 animate-spin" />
           <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.slice(0, 3).map((req) => (
            <div 
              key={req.id}
              className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                 <div className={clsx(
                   "w-10 h-10 rounded-xl flex items-center justify-center border",
                   req.status === 'PENDING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                   req.status === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                   "bg-zinc-800 border-white/10 text-zinc-500"
                 )}>
                   {req.status === 'PENDING' ? <Clock className="w-5 h-5" /> : 
                    req.status === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : 
                    <XCircle className="w-5 h-5" />}
                 </div>
                 <div>
                    <p className="text-[11px] font-black uppercase tracking-tight">{req.title}</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                       {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                 </div>
              </div>
              <div className={clsx(
                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                req.status === 'PENDING' ? "bg-amber-500/20 text-amber-500" :
                req.status === 'APPROVED' ? "bg-emerald-500/20 text-emerald-500" :
                "bg-zinc-800 text-zinc-500"
              )}>
                {req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="py-10 text-center border border-dashed border-white/5 rounded-2xl">
               <AlertCircle className="w-6 h-6 text-zinc-800 mx-auto mb-2" />
               <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">No tienes solicitudes activas</p>
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[#0a0a0b] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Nueva Solicitud</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">Asunto</label>
                   <input 
                     required
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                     placeholder="Ej: Problema con la tablet, Liquidación..."
                     className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-[#fad400]/50"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">Detalles</label>
                   <textarea 
                     required
                     value={description}
                     onChange={e => setDescription(e.target.value)}
                     rows={4}
                     placeholder="Describe tu solicitud con el mayor detalle posible..."
                     className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-[#fad400]/50 resize-none"
                   />
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-[#fad400] text-black py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                   {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                   Enviar Solicitud
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
