// src/pages/AdminPortalControl.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, UserPlus, Bus, Power, Save, ArrowLeft,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Info,
  ToggleLeft, ToggleRight, Edit3, Timer, Calendar, Ticket,
} from "lucide-react";
import { API, PortalAPI } from "../lib/api";
import { invalidatePortalCache } from "../hooks/usePortalStatus";
import { useNotification } from "../context/NotificationContext";

// ================================================================
// TYPES
// ================================================================
interface PortalStatus {
  sesi_aktif: boolean;
  portal_register_open: boolean;
  portal_login_open: boolean;
  portal_mudik_open: boolean;
  portal_tiket_open: boolean;
  pesan_sesi_berakhir: string;
  pesan_register_tutup: string;
  pesan_login_tutup: string;
  pesan_mudik_tutup: string;
  pesan_tiket_tutup: string;
  pesan_home: string;
  pesan_dashboard: string;
  countdown_aktif: boolean;
  countdown_target: string | null;
  countdown_label: string;
  updated_at: string | null;
  updated_by: string | null;
}

// ================================================================
// SUB-COMPONENT: Portal Card
// ================================================================
function PortalCard({
  icon,
  judul,
  deskripsi,
  isOpen,
  pesan,
  onToggle,
  onPesanSave,
  warna,
  loading,
}: {
  icon: React.ReactNode;
  judul: string;
  deskripsi: string;
  isOpen: boolean;
  pesan: string;
  onToggle: () => void;
  onPesanSave: (pesan: string) => void;
  warna: string;
  loading: boolean;
}) {
  const [editPesan, setEditPesan] = useState(false);
  const [pesanDraft, setPesanDraft] = useState(pesan);

  // Sync draft ketika pesan berubah dari parent
  useEffect(() => {
    setPesanDraft(pesan);
  }, [pesan]);

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
        isOpen
          ? "border-green-200 shadow-green-50"
          : "border-red-200 shadow-red-50"
      }`}
    >
      {/* Header */}
      <div className={`p-5 rounded-t-2xl ${warna}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">{icon}</div>
            <div>
              <h3 className="font-bold text-white text-base">{judul}</h3>
              <p className="text-white/70 text-xs mt-0.5">{deskripsi}</p>
            </div>
          </div>
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isOpen ? "bg-green-400/30 text-green-100 border border-green-300/40" : "bg-red-400/30 text-red-100 border border-red-300/40"}`}>
            {isOpen ? "● BUKA" : "● TUTUP"}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border">
          <span className="text-sm font-medium text-slate-700">
            Status Portal
          </span>
          <button
            onClick={onToggle}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition disabled:opacity-60 ${
              isOpen
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
            }`}
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : isOpen ? (
              <><ToggleRight size={16} /> Tutup Portal</>
            ) : (
              <><ToggleLeft size={16} /> Buka Portal</>
            )}
          </button>
        </div>

        {/* Pesan */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Pesan yang Ditampilkan saat Ditutup
            </label>
            {!editPesan && (
              <button
                onClick={() => setEditPesan(true)}
                className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
              >
                <Edit3 size={11} /> Ubah
              </button>
            )}
          </div>

          {editPesan ? (
            <div className="space-y-2">
              <textarea
                value={pesanDraft}
                onChange={(e) => setPesanDraft(e.target.value)}
                rows={3}
                className="w-full p-3 text-sm border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onPesanSave(pesanDraft);
                    setEditPesan(false);
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1"
                >
                  <Save size={12} /> Simpan Pesan
                </button>
                <button
                  onClick={() => {
                    setPesanDraft(pesan);
                    setEditPesan(false);
                  }}
                  className="py-2 px-4 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 italic leading-relaxed">
              "{pesan}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// SUB-COMPONENT: Countdown Panel
// ================================================================
function CountdownPanel({
  aktif,
  target,
  label,
  onSave,
  loading,
}: {
  aktif: boolean;
  target: string | null;
  label: string;
  onSave: (aktif: boolean, target: string, label: string) => Promise<void>;
  loading: boolean;
}) {
  const [aktifDraft, setAktifDraft] = useState(aktif);
  const [targetDraft, setTargetDraft] = useState(target || "");
  const [labelDraft, setLabelDraft] = useState(label || "PENDAFTARAN AKAN DIBUKA SEGERA");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync saat prop berubah
  useEffect(() => {
    setAktifDraft(aktif);
    setTargetDraft(target || "");
    setLabelDraft(label || "PENDAFTARAN AKAN DIBUKA SEGERA");
  }, [aktif, target, label]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(aktifDraft, targetDraft, labelDraft);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Format datetime-local value
  const toDatetimeLocal = (iso: string) => {
    if (!iso) return "";
    // ISO-8601 "2026-03-03T09:30:00" → datetime-local format
    return iso.substring(0, 16);
  };

  const fromDatetimeLocal = (val: string) => {
    // datetime-local "2026-03-03T09:30" → "2026-03-03T09:30:00"
    return val ? val + ":00" : "";
  };

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
        aktifDraft ? "border-amber-300 shadow-amber-50" : "border-slate-200"
      } p-6 mt-0`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Timer size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Countdown Pembukaan</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Tampilkan hitung mundur di Hero Home — sembunyikan tombol Daftar & Login
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${aktifDraft ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
          {aktifDraft ? "● AKTIF" : "○ NONAKTIF"}
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border mb-4">
        <div>
          <span className="text-sm font-medium text-slate-700">Aktifkan Countdown</span>
          <p className="text-xs text-slate-400 mt-0.5">Saat aktif: tombol Register & Login di hero disembunyikan</p>
        </div>
        <button
          onClick={() => setAktifDraft(!aktifDraft)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition ${
            aktifDraft
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
          }`}
        >
          {aktifDraft ? <><ToggleRight size={16} /> Nonaktifkan</> : <><ToggleLeft size={16} /> Aktifkan</>}
        </button>
      </div>

      {/* Target Waktu */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            <Calendar size={11} className="inline mr-1" />
            Tanggal & Waktu Target
          </label>
          <input
            type="datetime-local"
            value={toDatetimeLocal(targetDraft)}
            onChange={(e) => setTargetDraft(fromDatetimeLocal(e.target.value))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <p className="text-xs text-slate-400 mt-1">Contoh: 3 Maret 2026 pukul 09:30 WIB</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Label Teks di Atas Countdown
          </label>
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="PENDAFTARAN DIBUKA 3 MAR · 09.30 WIB"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* Preview */}
      {targetDraft && (
        <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">Preview:</p>
          <p className="text-amber-300 text-xs font-bold">● {labelDraft}</p>
          <p className="text-slate-300 text-xs mt-1">
            Target: {new Date(targetDraft).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || loading}
        className={`mt-4 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition w-full justify-center ${
          saved ? "bg-green-500 text-white" : "bg-amber-500 text-white hover:bg-amber-600"
        } disabled:opacity-60`}
      >
        {saving ? (
          <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</>
        ) : saved ? (
          <><CheckCircle size={14} /> Tersimpan!</>
        ) : (
          <><Save size={14} /> Simpan Pengaturan Countdown</>
        )}
      </button>
    </div>
  );
}

// ================================================================
// MAIN PAGE: AdminPortalControl
// ================================================================
export default function AdminPortalControl() {
  const navigate = useNavigate();
  const { addNotif } = useNotification();
  const [status, setStatus] = useState<PortalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const getToken = () => localStorage.getItem("token") || "";
  const getAdminNama = () =>
    localStorage.getItem("nama")?.replace(/"/g, "") || "Admin";

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/status`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      showToast("Gagal memuat status portal", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Toggle Individual ─────────────────────────────────────────
  const toggle = async (
    endpoint: string,
    currentVal: boolean,
    key: string
  ) => {
    const label = currentVal ? "TUTUP" : "BUKA";
    if (!confirm(`Yakin ${label} portal ini?`)) return;

    setLoadingKey(key);
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          open: !currentVal,
          admin: getAdminNama(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(json.pesan, true);
      invalidatePortalCache();
      // ── Notifikasi ──
      const portalLabel: Record<string, string> = { register: 'Pendaftaran', login: 'Login', mudik: 'Mudik', sesi: 'Sesi', tiket: 'Tiket' };
      const aksi = !currentVal ? 'DIBUKA' : 'DITUTUP';
      addNotif({ type: 'portal', title: `🔐 Portal ${portalLabel[endpoint] || endpoint} ${aksi}`, message: `Portal ${portalLabel[endpoint] || endpoint} telah ${aksi} oleh admin.`, link: '/admin/portal' });
      await loadStatus();
    } catch (e: any) {
      showToast("❌ " + e.message, false);
    } finally {
      setLoadingKey(null);
    }
  };

  // ── Update Pesan ──────────────────────────────────────────────
  const updatePesan = async (endpoint: string, pesan: string, key: string) => {
    setLoadingKey(key + "_pesan");
    try {
      const body: any = { admin: getAdminNama() };
      if (endpoint === "register") body.pesan = pesan;
      else if (endpoint === "login") body.pesan = pesan;
      else if (endpoint === "mudik") body.pesan = pesan;
      else if (endpoint === "sesi") body.pesan = pesan;
      else if (endpoint === "tiket") body.pesan = pesan;

      // Determine current open value
      const currentOpen =
        endpoint === "register"
          ? status?.portal_register_open
          : endpoint === "login"
          ? status?.portal_login_open
          : endpoint === "mudik"
          ? status?.portal_mudik_open
          : endpoint === "tiket"
          ? status?.portal_tiket_open
          : status?.sesi_aktif;

      body.open = currentOpen;

      const res = await fetch(`${API.BASE_URL}/api/portal/${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast("Pesan berhasil disimpan ✅", true);
      invalidatePortalCache();
      await loadStatus();
    } catch (e: any) {
      showToast("❌ " + e.message, false);
    } finally {
      setLoadingKey(null);
    }
  };

  // ── TUTUP SEMUA (Emergency) ───────────────────────────────────
  const tutupSemua = async () => {
    if (
      !confirm(
        "⚠️ PERINGATAN: Ini akan MENUTUP semua portal (register, mudik, dan sesi).\n\nSeluruh sistem akan menampilkan halaman 'Program Berakhir'.\n\nLanjutkan?"
      )
    )
      return;

    setLoadingKey("semua");
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/semua`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          sesi_aktif: false,
          portal_register_open: false,
          portal_mudik_open: false,
          admin: getAdminNama(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast("✅ Semua portal berhasil ditutup", true);
      invalidatePortalCache();
      await loadStatus();
    } catch (e: any) {
      showToast("❌ " + e.message, false);
    } finally {
      setLoadingKey(null);
    }
  };

  // ── Simpan Countdown ─────────────────────────────────────────
  const saveCountdown = async (aktif: boolean, target: string, label: string) => {
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/semua`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          countdown_aktif: aktif,
          countdown_target: target || null,
          countdown_label: label,
          sesi_aktif: status?.sesi_aktif,
          portal_register_open: status?.portal_register_open,
          portal_mudik_open: status?.portal_mudik_open,
          admin: getAdminNama(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(aktif ? "✅ Countdown diaktifkan" : "✅ Countdown dinonaktifkan", true);
      invalidatePortalCache();
      await loadStatus();
    } catch (e: any) {
      showToast("❌ " + e.message, false);
      throw e;
    }
  };

  const bukaSemuaPortal = async () => {
    if (!confirm("Buka kembali semua portal?")) return;
    setLoadingKey("semua");
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/semua`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          sesi_aktif: true,
          portal_register_open: true,
          portal_mudik_open: true,
          admin: getAdminNama(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast("✅ Semua portal dibuka kembali", true);
      invalidatePortalCache();
      await loadStatus();
    } catch (e: any) {
      showToast("❌ " + e.message, false);
    } finally {
      setLoadingKey(null);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw size={28} className="animate-spin text-blue-600" />
          <span className="font-bold">Memuat konfigurasi portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            toast.ok
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.ok ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* Kembali */}
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2 transition mb-6"
        >
          <ArrowLeft size={18} /> Kembali ke Dashboard
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <Shield size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Kontrol Portal</h1>
                <p className="text-blue-200 text-sm mt-0.5">
                  Buka / Tutup akses pendaftaran akun, mudik, dan sesi program.
                </p>
              </div>
            </div>
            {/* Terakhir diubah */}
            {status?.updated_at && (
              <div className="text-right text-xs text-blue-300">
                <p>Terakhir diubah</p>
                <p className="font-bold text-white">
                  {new Date(status.updated_at).toLocaleString("id-ID")}
                </p>
                <p>oleh {status.updated_by || "-"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Cara Kerja:</strong>
            <ul className="mt-1.5 space-y-1 list-disc pl-4 text-blue-700">
              <li><strong>Sesi Program</strong> — Mematikan seluruh sistem. Semua halaman user menampilkan layar "Program Berakhir".</li>
              <li><strong>Portal Register</strong> — Menutup pendaftaran akun baru. User yang sudah punya akun tetap bisa login.</li>
              <li><strong>Portal Login</strong> — Menutup akses login peserta. Admin login tetap bisa diakses.</li>
              <li><strong>Portal Mudik</strong> — Menutup pengiriman form pendaftaran mudik. User yang sudah daftar tidak terpengaruh.</li>
            </ul>
          </div>
        </div>

        {/* Empat Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* SESI PROGRAM */}
          <PortalCard
            icon={<Power size={22} className="text-white" />}
            judul="Sesi Mudik Gratis"
            deskripsi="Aktifkan/matikan seluruh program"
            isOpen={status?.sesi_aktif ?? true}
            pesan={status?.pesan_sesi_berakhir ?? ""}
            warna={status?.sesi_aktif ? "bg-gradient-to-br from-blue-700 to-blue-900" : "bg-gradient-to-br from-slate-700 to-slate-900"}
            loading={loadingKey === "sesi"}
            onToggle={() => toggle("sesi", status?.sesi_aktif ?? true, "sesi")}
            onPesanSave={(p) => updatePesan("sesi", p, "sesi")}
          />

          {/* PORTAL REGISTER */}
          <PortalCard
            icon={<UserPlus size={22} className="text-white" />}
            judul="Portal Register Akun"
            deskripsi="Buka/tutup pendaftaran akun baru"
            isOpen={status?.portal_register_open ?? true}
            pesan={status?.pesan_register_tutup ?? ""}
            warna={status?.portal_register_open ? "bg-gradient-to-br from-orange-500 to-orange-700" : "bg-gradient-to-br from-slate-600 to-slate-800"}
            loading={loadingKey === "register"}
            onToggle={() => toggle("register", status?.portal_register_open ?? true, "register")}
            onPesanSave={(p) => updatePesan("register", p, "register")}
          />

          {/* PORTAL LOGIN */}
          <PortalCard
            icon={<Shield size={22} className="text-white" />}
            judul="Portal Login Peserta"
            deskripsi="Buka/tutup akses login user"
            isOpen={status?.portal_login_open ?? true}
            pesan={status?.pesan_login_tutup ?? ""}
            warna={status?.portal_login_open ? "bg-gradient-to-br from-indigo-500 to-indigo-700" : "bg-gradient-to-br from-slate-600 to-slate-800"}
            loading={loadingKey === "login"}
            onToggle={() => toggle("login", status?.portal_login_open ?? true, "login")}
            onPesanSave={(p) => updatePesan("login", p, "login")}
          />

          {/* PORTAL MUDIK */}
          <PortalCard
            icon={<Bus size={22} className="text-white" />}
            judul="Portal Daftar Mudik"
            deskripsi="Buka/tutup pengiriman form mudik"
            isOpen={status?.portal_mudik_open ?? true}
            pesan={status?.pesan_mudik_tutup ?? ""}
            warna={status?.portal_mudik_open ? "bg-gradient-to-br from-green-600 to-green-800" : "bg-gradient-to-br from-slate-600 to-slate-800"}
            loading={loadingKey === "mudik"}
            onToggle={() => toggle("mudik", status?.portal_mudik_open ?? true, "mudik")}
            onPesanSave={(p) => updatePesan("mudik", p, "mudik")}
          />
        </div>

        {/* ─── Portal Download Tiket ─── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-5 bg-purple-500 rounded-full" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Kontrol Download Tiket</h2>
          </div>
          <div className={`bg-white rounded-2xl border-2 shadow-sm transition-all overflow-hidden ${
            status?.portal_tiket_open ? "border-purple-300 shadow-purple-50" : "border-orange-200 shadow-orange-50"
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              status?.portal_tiket_open
                ? "bg-gradient-to-r from-purple-600 to-indigo-700"
                : "bg-gradient-to-r from-orange-500 to-red-600"
            }`}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Ticket size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Portal Download Tiket</h3>
                  <p className="text-white/70 text-xs mt-0.5">
                    {status?.portal_tiket_open ? "Peserta dapat mengunduh tiket mereka sekarang" : "Tombol unduh tiket terkunci untuk semua peserta"}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                status?.portal_tiket_open
                  ? "bg-green-400/30 text-green-100 border border-green-300/40"
                  : "bg-red-400/30 text-red-100 border border-red-300/40"
              }`}>
                {status?.portal_tiket_open ? "● TERBUKA" : "● TERKUNCI"}
              </div>
            </div>

            <div className="p-6">
              {/* Status info */}
              <div className={`flex items-center gap-4 p-4 rounded-xl mb-5 border ${
                status?.portal_tiket_open ? "bg-purple-50 border-purple-200" : "bg-orange-50 border-orange-200"
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  status?.portal_tiket_open ? "bg-purple-100" : "bg-orange-100"
                }`}>
                  {status?.portal_tiket_open
                    ? <CheckCircle size={24} className="text-purple-600" />
                    : <XCircle size={24} className="text-orange-600" />
                  }
                </div>
                <div>
                  <p className={`font-bold text-sm ${status?.portal_tiket_open ? "text-purple-800" : "text-orange-800"}`}>
                    {status?.portal_tiket_open ? "Tiket siap diunduh oleh peserta" : "Tombol unduh tiket masih terkunci"}
                  </p>
                  <p className={`text-xs mt-0.5 ${status?.portal_tiket_open ? "text-purple-600" : "text-orange-600"}`}>
                    {status?.portal_tiket_open
                      ? "Peserta yang sudah TERKONFIRMASI dan memiliki bus dapat mengunduh tiket mereka."
                      : "Aktifkan portal ini setelah semua konfirmasi & plotting bus selesai."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Toggle button */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border">
                  <div>
                    <span className="text-sm font-bold text-slate-700">Status Download Tiket</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {status?.portal_tiket_open ? "Klik untuk mengunci kembali" : "Klik untuk membuka akses download"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle("tiket", status?.portal_tiket_open ?? false, "tiket")}
                    disabled={!!loadingKey}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-60 ${
                      status?.portal_tiket_open
                        ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    {loadingKey === "tiket"
                      ? <RefreshCw size={14} className="animate-spin" />
                      : status?.portal_tiket_open
                      ? <><ToggleRight size={16} /> Kunci Tiket</>
                      : <><ToggleLeft size={16} /> Buka Tiket</>
                    }
                  </button>
                </div>

                {/* Pesan terkunci */}
                <TiketPesanEditor
                  pesan={status?.pesan_tiket_tutup ?? ""}
                  loading={loadingKey === "tiket_pesan"}
                  onSave={(p) => updatePesan("tiket", p, "tiket")}
                />
              </div>
            </div>
          </div>
        </div>
        <CountdownPanel
          aktif={status?.countdown_aktif ?? false}
          target={status?.countdown_target ?? null}
          label={status?.countdown_label ?? "PENDAFTARAN AKAN DIBUKA SEGERA"}
          onSave={saveCountdown}
          loading={!!loadingKey}
        />

        {/* ─── Pesan Informasi Publik ─── */}
        <PesanInfoPublik
          pesanHome={status?.pesan_home ?? ""}
          pesanDashboard={status?.pesan_dashboard ?? ""}
          onSave={async (home, dashboard) => {
            try {
              await PortalAPI.updateSemua({
                sesi_aktif: status?.sesi_aktif ?? true,
                portal_register_open: status?.portal_register_open ?? true,
                portal_mudik_open: status?.portal_mudik_open ?? true,
                pesan_home: home,
                pesan_dashboard: dashboard,
              } as any)
              await loadStatus()
            } catch (e: any) { alert("Gagal simpan: " + e.message) }
          }}
        />

        {/* Aksi Cepat */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Aksi Cepat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tutup Semua */}
            <button
              onClick={tutupSemua}
              disabled={!!loadingKey}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 font-bold hover:bg-red-100 transition disabled:opacity-60"
            >
              {loadingKey === "semua" ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <XCircle size={20} />
              )}
              <div className="text-left">
                <p className="font-bold">Tutup Semua Portal</p>
                <p className="text-xs font-normal text-red-500 mt-0.5">
                  Termasuk sesi program (halaman berakhir)
                </p>
              </div>
            </button>

            {/* Buka Semua */}
            <button
              onClick={bukaSemuaPortal}
              disabled={!!loadingKey}
              className="flex items-center justify-center gap-3 p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-700 font-bold hover:bg-green-100 transition disabled:opacity-60"
            >
              <CheckCircle size={20} />
              <div className="text-left">
                <p className="font-bold">Buka Semua Portal</p>
                <p className="text-xs font-normal text-green-600 mt-0.5">
                  Reset ke kondisi normal aktif
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Komponen Editor Pesan Tiket Terkunci ─────────────────────────────────────
function TiketPesanEditor({
  pesan, loading, onSave
}: { pesan: string; loading: boolean; onSave: (p: string) => void }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(pesan)

  useEffect(() => { setDraft(pesan) }, [pesan])

  return (
    <div className="bg-slate-50 p-4 rounded-xl border">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Pesan saat Tiket Terkunci
        </label>
        {!edit && (
          <button onClick={() => setEdit(true)} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
            <Edit3 size={11} /> Ubah
          </button>
        )}
      </div>
      {edit ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            className="w-full p-3 text-sm border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onSave(draft); setEdit(false) }}
              disabled={loading}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition flex items-center justify-center gap-1 disabled:opacity-60"
            >
              <Save size={12} /> Simpan
            </button>
            <button
              onClick={() => { setDraft(pesan); setEdit(false) }}
              className="py-2 px-4 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-200 italic leading-relaxed">
          "{pesan}"
        </p>
      )}
    </div>
  )
}

// ── Komponen Pesan Info Publik (Home & Dashboard) ────────────────────
function PesanInfoPublik({
  pesanHome, pesanDashboard, onSave
}: { pesanHome: string; pesanDashboard: string; onSave: (home: string, dashboard: string) => void }) {
  const [home, setHome] = useState(pesanHome)
  const [dashboard, setDashboard] = useState(pesanDashboard)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync jika prop berubah
  useState(() => { setHome(pesanHome); setDashboard(pesanDashboard) })

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(home, dashboard)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-0">
      <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
        <span className="w-2 h-5 bg-blue-500 rounded-full" />
        Pesan Informasi Publik
      </h3>
      <p className="text-slate-400 text-sm mb-5">Pesan yang ditampilkan di halaman Home dan Dashboard pengguna saat portal ditutup atau program berakhir.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            📢 Pesan Banner di Home (Opsional)
          </label>
          <textarea value={home} onChange={e => setHome(e.target.value)} rows={2} placeholder="Contoh: Pendaftaran Mudik Gratis 2027 akan dibuka pada bulan Januari. Pantau terus!"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          <p className="text-xs text-slate-400 mt-1">Kosongkan jika tidak ingin menampilkan banner.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            💬 Pesan Modal di Dashboard User (Saat Sesi Berakhir)
          </label>
          <textarea value={dashboard} onChange={e => setDashboard(e.target.value)} rows={2} placeholder="Contoh: Program Mudik Gratis Aceh 2026 telah selesai. Terima kasih telah berpartisipasi!"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition ${saved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"} disabled:opacity-60`}>
          {saving ? "Menyimpan..." : saved ? "✓ Tersimpan!" : "Simpan Pesan"}
        </button>
      </div>
    </div>
  )
}