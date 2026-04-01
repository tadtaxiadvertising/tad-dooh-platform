import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import useSWR from 'swr';
import { api } from '../services/api';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  category: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [], mutate } = useSWR<Notification[]>('/notifications');
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Relying entirely on SWR polling for notifications
    // Realtime disabled to prevent WebSocket connection errors in production
    return () => {};
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative group focus:outline-none" 
        title="Centro de Alertas del Sistema"
      >
        <div className={clsx(
          "p-3 rounded-xl border transition-all duration-500 flex items-center justify-center",
          isOpen ? "bg-tad-yellow text-black border-tad-yellow" : "bg-zinc-900/40 border-white-[0.03] text-zinc-500 hover:text-tad-yellow group-hover:border-tad-yellow/30"
        )}>
           <Bell className={clsx("w-4.5 h-4.5", unreadCount > 0 && "animate-pulse-soft")} />
           {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-black rounded-full border-2 border-[#0a0a0b] flex items-center justify-center animate-bounce-slow shadow-[0_0_10px_#e11d48]">
               {unreadCount > 9 ? '+9' : unreadCount}
             </span>
           )}
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-4 w-[380px] bg-zinc-900/95 border border-white-[0.05] backdrop-blur-3xl rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="p-4 border-b border-white-[0.05] flex items-center justify-between bg-zinc-950/50">
               <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Panel de Notificaciones</h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5 tracking-tight">Registro Maestro de Eventos</p>
               </div>
               <button 
                 onClick={markAllRead}
                 className="text-[9px] font-black text-tad-yellow uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
               >
                 Limpiar Todo
               </button>
            </div>

            <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                   <CheckCircle2 className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
                   <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Sin alertas pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-white-[0.03]">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.read && markAsRead(n.id)}
                      className={clsx(
                        "p-4 hover:bg-white/[0.02] transition-colors cursor-pointer group flex gap-4 items-start",
                        !n.read ? "bg-tad-yellow/[0.02]" : "opacity-60"
                      )}
                    >
                       <div className={clsx(
                         "p-2 rounded-lg shrink-0",
                         n.type === 'CRITICAL' ? "bg-rose-500/10 text-rose-500" :
                         n.type === 'WARNING' ? "bg-tad-yellow/10 text-tad-yellow" :
                         "bg-blue-500/10 text-blue-400"
                       )}>
                          {n.type === 'CRITICAL' ? <ShieldAlert className="w-4 h-4" /> :
                           n.type === 'WARNING' ? <AlertTriangle className="w-4 h-4" /> :
                           <Info className="w-4 h-4" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                             <p className="text-[10px] font-black text-zinc-300 uppercase truncate pr-4">{n.title}</p>
                             <span className="text-[8px] font-bold text-zinc-600 whitespace-nowrap">
                               {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es }).toUpperCase()}
                             </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed font-medium mb-2">{n.message}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-600 uppercase tracking-widest">
                               {n.category}
                             </span>
                             {!n.read && (
                               <div className="w-1.5 h-1.5 bg-tad-yellow rounded-full shadow-[0_0_5px_#fad400]" />
                             )}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-950/80 border-t border-white-[0.05] text-center">
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
               >
                 Cerrar Panel
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
