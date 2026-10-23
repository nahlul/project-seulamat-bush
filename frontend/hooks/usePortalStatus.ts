// src/hooks/usePortalStatus.ts
import { useState, useEffect, useCallback } from "react";
import { API } from "../lib/api";

export interface PortalStatus {
  sesi_aktif: boolean;
  portal_register_open: boolean;
  portal_mudik_open: boolean;
  pesan_sesi_berakhir: string;
  pesan_register_tutup: string;
  pesan_mudik_tutup: string;
  updated_at: string | null;
  updated_by: string | null;
}

interface UsePortalStatusReturn {
  status: PortalStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Default aman: semua terbuka (fallback jika API error)
const DEFAULT_STATUS: PortalStatus = {
  sesi_aktif: true,
  portal_register_open: true,
  portal_mudik_open: true,
  pesan_sesi_berakhir: "Program Mudik Gratis telah selesai. Sampai jumpa tahun depan!",
  pesan_register_tutup: "Pendaftaran akun baru saat ini ditutup.",
  pesan_mudik_tutup: "Pendaftaran Mudik Gratis saat ini ditutup.",
  updated_at: null,
  updated_by: null,
};

// Cache di memory agar tidak fetch ulang setiap render
let _cache: PortalStatus | null = null;
let _cacheTime = 0;
const CACHE_TTL = 30_000; // 30 detik

export function usePortalStatus(): UsePortalStatusReturn {
  const [status, setStatus] = useState<PortalStatus | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (force = false) => {
    // Gunakan cache jika masih fresh
    if (!force && _cache && Date.now() - _cacheTime < CACHE_TTL) {
      setStatus(_cache);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/status`);
      if (!res.ok) throw new Error("Gagal ambil status portal");
      const data: PortalStatus = await res.json();
      _cache = data;
      _cacheTime = Date.now();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      console.warn("⚠️ Portal status fetch error, menggunakan default:", err.message);
      // Fallback ke default aman (semua terbuka) agar tidak block user
      setStatus(DEFAULT_STATUS);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    refetch: () => fetchStatus(true),
  };
}

// Utility: invalidate cache (dipakai setelah admin update portal)
export function invalidatePortalCache() {
  _cache = null;
  _cacheTime = 0;
}
