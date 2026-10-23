// src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type NotifType = 'pendaftar' | 'rute' | 'portal' | 'user' | 'feedback';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  // Untuk navigasi ke AdminPendaftar dengan highlight user tertentu
  link?: string;
  // Data tambahan (misal familyId untuk highlight row)
  meta?: Record<string, any>;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotif: (notif: Omit<Notification, 'id' | 'time' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = 'admin_notifs_v1';

function loadFromStorage(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((n: any) => ({ ...n, time: new Date(n.time) }));
  } catch {
    return [];
  }
}

function saveToStorage(notifs: Notification[]) {
  try {
    // Simpan max 50 notifikasi
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
  } catch {
    // ignore
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadFromStorage);
  const isFirstRender = useRef(true);

  // Sinkron ke localStorage setiap kali notif berubah (skip first render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    saveToStorage(notifications);
  }, [notifications]);

  const addNotif = useCallback((notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      time: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotif, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used inside NotificationProvider');
  return ctx;
}
