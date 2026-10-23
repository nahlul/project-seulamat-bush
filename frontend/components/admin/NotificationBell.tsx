// src/components/admin/NotificationBell.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X, Users, Route, ShieldCheck, User, MessageSquare } from 'lucide-react';
import { useNotification, Notification, NotifType } from '../../context/NotificationContext';

// ─── Icon & warna per tipe ──────────────────────────────────────
const typeConfig: Record<NotifType, { icon: React.ReactNode; color: string; bg: string }> = {
  pendaftar: {
    icon: <Users size={14} />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  rute: {
    icon: <Route size={14} />,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
  },
  portal: {
    icon: <ShieldCheck size={14} />,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  user: {
    icon: <User size={14} />,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
  },
  feedback: {
    icon: <MessageSquare size={14} />,
    color: 'text-pink-600',
    bg: 'bg-pink-100',
  },
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

// ─── Toast Popup (muncul di pojok kanan bawah) ──────────────────
interface ToastItem {
  notif: Notification;
  visible: boolean;
}

export function NotificationToast({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  const cfg = typeConfig[notif.type];
  const navigate = useNavigate();

  const handleClick = () => {
    if (notif.link) navigate(notif.link);
    onClose();
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-3 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 w-80 cursor-pointer hover:bg-slate-50 transition group animate-in slide-in-from-right-4 duration-300"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0 mt-0.5`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">{notif.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
        {notif.link && (
          <p className={`text-xs font-semibold mt-1.5 ${cfg.color}`}>Klik untuk lihat →</p>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        className="text-slate-300 hover:text-slate-500 transition shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toast Manager (render stack toast di kanan bawah) ──────────
export function NotificationToastManager() {
  const { notifications } = useNotification();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prevLen = useRef(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (notifications.length > prevLen.current) {
      const newest = notifications[0];
      if (!newest.read) {
        setToasts(prev => [{ notif: newest, visible: true }, ...prev].slice(0, 3));
        // Auto-tutup setelah 5 detik
        const t = setTimeout(() => {
          setToasts(prev => prev.filter(t => t.notif.id !== newest.id));
        }, 5000);
        timers.current[newest.id] = t;
      }
    }
    prevLen.current = notifications.length;
  }, [notifications]);

  const dismiss = (id: string) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.filter(t => t.notif.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <NotificationToast key={t.notif.id} notif={t.notif} onClose={() => dismiss(t.notif.id)} />
      ))}
    </div>
  );
}

// ─── Notification Bell + Dropdown ───────────────────────────────
export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotification();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'semua' | 'belum'>('belum');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Tutup panel saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayed = activeTab === 'belum'
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotifClick = (notif: Notification) => {
    markRead(notif.id);
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2.5 rounded-xl transition ${
          open
            ? 'bg-white/30 text-white'
            : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
        title="Notifikasi"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[999] overflow-hidden"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-white" />
              <h3 className="font-extrabold text-white text-sm">Notifikasi Admin</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Tandai semua sudah dibaca"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Hapus semua notifikasi"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {(['belum', 'semua'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-bold transition ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'belum' ? `Belum Dibaca (${unreadCount})` : `Semua (${notifications.length})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {displayed.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-slate-300">
                <Bell size={32} className="mb-3 opacity-30" />
                <p className="text-sm font-medium text-slate-400">
                  {activeTab === 'belum' ? 'Tidak ada notifikasi baru' : 'Belum ada notifikasi'}
                </p>
              </div>
            ) : (
              displayed.map(notif => {
                const cfg = typeConfig[notif.type];
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition group ${
                      !notif.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs font-bold ${notif.read ? 'text-slate-600' : 'text-slate-800'} truncate`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-300 mt-1">{timeAgo(notif.time)}</p>
                    </div>

                    {/* Mark read on hover */}
                    {!notif.read && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead(notif.id); }}
                        title="Tandai sudah dibaca"
                        className="p-1 rounded text-slate-200 hover:text-green-500 hover:bg-green-50 transition opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                      >
                        <Check size={13} />
                      </button>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 text-center">
                Notifikasi disimpan di browser ini • Maks. 50 entri
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
