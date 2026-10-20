"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import { Bell, Check, X, Trash2, Volume2, VolumeX } from "lucide-react";
import type {
  NotificationItem,
  NotificationPriority,
} from "../../lib/notificationEngine";

// ─── Priority Styles ──────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<
  NotificationPriority,
  { bg: string; border: string; text: string; iconColor: string }
> = {
  CRITICAL: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
    iconColor: "#ef4444",
  },
  OPERATIONAL: {
    bg: "bg-[#FFD400]/10",
    border: "border-[#FFD400]/20",
    text: "text-[#FFD400]",
    iconColor: "#FFD400",
  },
  INFO: {
    bg: "bg-white/5",
    border: "border-white/10",
    text: "text-zinc-400",
    iconColor: "#71717a",
  },
};

const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  CRITICAL: "URGENTE",
  OPERATIONAL: "Operativo",
  INFO: "Info",
};

function formatTimeAgo(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "ahora";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function NotificationCard({
  item,
  onAck,
  onDismiss,
}: {
  item: NotificationItem;
  onAck: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const style = PRIORITY_STYLES[item.priority];
  const isUnread = !item.dismissedAt && !item.acknowledged;

  return (
    <div
      className={`group rounded-2xl border ${style.border} ${style.bg} p-4 transition-all ${
        isUnread ? "ring-1 ring-white/5" : "opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-black uppercase tracking-[0.15em] ${style.text}`}
            >
              {PRIORITY_LABELS[item.priority]}
            </span>
            <span className="text-[9px] font-mono text-zinc-600">
              {formatTimeAgo(item.receivedAt)}
            </span>
            {isUnread && (
              <span className="relative inline-flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                  style={{ backgroundColor: style.iconColor }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ backgroundColor: style.iconColor }}
                />
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-bold text-white truncate">
            {item.title}
          </p>
          {item.description && (
            <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.priority === "CRITICAL" && isUnread && (
            <button
              onClick={() => onAck(item.id)}
              className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-400 transition hover:bg-emerald-500/20"
              aria-label="Confirmar notificación"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => onDismiss(item.id)}
            className="rounded-full bg-white/5 p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Descartar notificación"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NotificationCenter ────────────────────────────────────────────────────────

export function NotificationCenter() {
  const {
    items,
    unreadCount,
    dismiss,
    acknowledge,
    dismissAll,
    pushPermissionGranted,
    requestPush,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const unreadItems = items.filter((i) => !i.dismissedAt && !i.acknowledged);
  const dismissedItems = items.filter((i) => i.dismissedAt || i.acknowledged);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-10 h-10 rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10 hover:border-white/20"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
      >
        <Bell className="h-5 w-5 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#FFD400] text-black text-[9px] font-black px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-14 w-[360px] max-h-[70vh] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] z-50 animate-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-label="Centro de notificaciones"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Notificaciones
              </p>
              {unreadCount > 0 && (
                <p className="text-xs text-zinc-300 mt-0.5">
                  {unreadCount} sin leer
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Push Permission Toggle */}
              {!pushPermissionGranted && (
                <button
                  onClick={() => void requestPush()}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] font-bold text-zinc-400 hover:text-white hover:border-white/20 transition"
                  aria-label="Activar notificaciones push"
                >
                  <VolumeX className="h-3 w-3" />
                  Push
                </button>
              )}
              {pushPermissionGranted && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-bold text-emerald-400">
                  <Volume2 className="h-3 w-3" />
                  Push ON
                </span>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={() => void dismissAll()}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] font-bold text-zinc-400 hover:text-white hover:border-white/20 transition"
                  aria-label="Descartar todas"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[55vh] p-4 space-y-3">
            {items.length === 0 && (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Sin notificaciones</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Las alertas operativas aparecerán aquí
                </p>
              </div>
            )}

            {/* Unread Section */}
            {unreadItems.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-2">
                  Sin leer
                </p>
                <div className="space-y-2">
                  {unreadItems.slice(0, 20).map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      onAck={(id) => void acknowledge(id)}
                      onDismiss={(id) => void dismiss(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Read Section */}
            {dismissedItems.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600 mb-2">
                  Anteriores
                </p>
                <div className="space-y-2">
                  {dismissedItems.slice(0, 10).map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      onAck={(id) => void acknowledge(id)}
                      onDismiss={(id) => void dismiss(id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
