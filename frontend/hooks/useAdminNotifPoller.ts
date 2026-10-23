// src/hooks/useAdminNotifPoller.ts
// Hook ini melakukan polling ke backend untuk mendeteksi pendaftar baru
// yang masuk atau sudah memperbaiki datanya, dan feedback baru. Berjalan di background.

import { useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';
import { AdminAPI, FeedbackAPI } from '../lib/api';

const POLL_INTERVAL = 30_000; // 30 detik
const STORAGE_KEY_SEEN = 'admin_seen_pendaftar_ids_v1';
const STORAGE_KEY_FEEDBACK = 'admin_seen_feedback_ids_v1';

function getSeenIds(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveSeenIds(key: string, ids: Set<number>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids].slice(-500)));
  } catch {}
}

export function useAdminNotifPoller() {
  const { addNotif } = useNotification();
  const seenPendaftarRef = useRef<Set<number>>(getSeenIds(STORAGE_KEY_SEEN));
  const seenFeedbackRef = useRef<Set<number>>(getSeenIds(STORAGE_KEY_FEEDBACK));
  const isFirstRun = useRef(true);
  const isFirstFeedbackRun = useRef(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const pollPendaftar = async () => {
      try {
        const data = await AdminAPI.getPendaftar();
        if (!Array.isArray(data)) return;

        const menunggu = data.filter(d => d.status === 'MENUNGGU VERIFIKASI');
        const uniqueFamilies = new Map<number, typeof menunggu[0]>();
        menunggu.forEach(d => {
          const fid = d.id_keluarga || d.id;
          if (!uniqueFamilies.has(fid)) uniqueFamilies.set(fid, d);
        });

        if (isFirstRun.current) {
          uniqueFamilies.forEach((_, fid) => seenPendaftarRef.current.add(fid));
          saveSeenIds(STORAGE_KEY_SEEN, seenPendaftarRef.current);
          isFirstRun.current = false;
          return;
        }

        uniqueFamilies.forEach((head, fid) => {
          if (!seenPendaftarRef.current.has(fid)) {
            const nama = head.nama_kepala_keluarga || head.nama_peserta;
            addNotif({
              type: 'pendaftar',
              title: '🔔 Pendaftar Baru / Data Diperbaiki',
              message: `Keluarga "${nama}" (${head.rute_tujuan}) menunggu verifikasi.`,
              link: `/admin/verifikasi`,
              meta: { familyId: fid },
            });
            seenPendaftarRef.current.add(fid);
          }
        });
        saveSeenIds(STORAGE_KEY_SEEN, seenPendaftarRef.current);
      } catch {
        // Silent fail
      }
    };

    const pollFeedback = async () => {
      try {
        const data = await FeedbackAPI.getAdmin();
        if (!Array.isArray(data)) return;

        if (isFirstFeedbackRun.current) {
          data.forEach((f: any) => seenFeedbackRef.current.add(f.id));
          saveSeenIds(STORAGE_KEY_FEEDBACK, seenFeedbackRef.current);
          isFirstFeedbackRun.current = false;
          return;
        }

        data.forEach((f: any) => {
          if (!seenFeedbackRef.current.has(f.id)) {
            const nama = f.nama_pengirim || 'Anonim';
            const stars = '⭐'.repeat(Math.min(f.rating, 5));
            addNotif({
              type: 'feedback',
              title: `💬 Feedback Baru ${stars}`,
              message: `${nama} mengirim ulasan: "${(f.komentar || '').slice(0, 60)}${f.komentar?.length > 60 ? '...' : ''}"`,
              link: '/admin/feedback',
            });
            seenFeedbackRef.current.add(f.id);
          }
        });
        saveSeenIds(STORAGE_KEY_FEEDBACK, seenFeedbackRef.current);
      } catch {
        // Silent fail
      }
    };

    const poll = () => {
      pollPendaftar();
      pollFeedback();
    };

    const initialTimeout = setTimeout(poll, 2000);
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [addNotif]);
}
