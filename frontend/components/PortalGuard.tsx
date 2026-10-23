// src/components/PortalGuard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Clock, Bus, ArrowLeft, Phone } from "lucide-react";
import { usePortalStatus } from "../hooks/usePortalStatus";

// ================================================================
// TYPE DEFINITIONS
// ================================================================
type PortalType = "register" | "mudik" | "sesi";

interface PortalGuardProps {
  /** Jenis portal yang dijaga: "register" | "mudik" | "sesi" */
  type: PortalType;
  /** Konten yang ditampilkan jika portal terbuka */
  children: React.ReactNode;
}

// ================================================================
// LAYAR PORTAL DITUTUP
// ================================================================
function PortalTutupScreen({
  type,
  pesan,
}: {
  type: PortalType;
  pesan: string;
}) {
  const navigate = useNavigate();

  const config = {
    sesi: {
      icon: <Bus size={48} className="text-blue-300" />,
      judul: "Program Mudik Gratis Telah Berakhir",
      warna: "from-blue-900 via-blue-800 to-slate-900",
      badge: "PROGRAM SELESAI",
      badgeColor: "bg-blue-500/30 text-blue-200 border border-blue-400/30",
      btnLabel: "Kembali ke Beranda",
      btnAction: () => navigate("/"),
    },
    register: {
      icon: <Shield size={48} className="text-orange-300" />,
      judul: "Pendaftaran Akun Ditutup",
      warna: "from-slate-900 via-slate-800 to-orange-900",
      badge: "PORTAL DITUTUP",
      badgeColor: "bg-orange-500/30 text-orange-200 border border-orange-400/30",
      btnLabel: "Login dengan akun yang ada",
      btnAction: () => navigate("/login"),
    },
    mudik: {
      icon: <Clock size={48} className="text-red-300" />,
      judul: "Pendaftaran Mudik Ditutup",
      warna: "from-slate-900 via-red-950 to-slate-900",
      badge: "KUOTA HABIS / DITUTUP",
      badgeColor: "bg-red-500/30 text-red-200 border border-red-400/30",
      btnLabel: "Lihat Status Pendaftaran",
      btnAction: () => navigate("/dashboard"),
    },
  }[type];

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${config.warna} flex items-center justify-center p-4 font-sans`}
    >
      <div className="max-w-lg w-full text-center">
        {/* Decorative Ring */}
        <div className="relative mb-8 flex justify-center">
          <div className="absolute w-40 h-40 rounded-full bg-white/5 animate-ping" />
          <div className="absolute w-32 h-32 rounded-full bg-white/10" />
          <div className="relative z-10 w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
            {config.icon}
          </div>
        </div>

        {/* Badge */}
        <span
          className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5 ${config.badgeColor}`}
        >
          {config.badge}
        </span>

        {/* Judul */}
        <h1 className="text-3xl font-extrabold text-white mb-4 leading-tight">
          {config.judul}
        </h1>

        {/* Pesan dari Admin */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-8">
          <p className="text-white/80 text-sm leading-relaxed">{pesan}</p>
        </div>

        {/* Hotline */}
        <a
          href="https://wa.me/628116800000"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition mb-4 shadow-lg"
        >
          <Phone size={16} /> Hubungi Dishub Aceh via WhatsApp
        </a>

        {/* Tombol Aksi */}
        <div className="flex gap-3 justify-center mt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <button
            onClick={config.btnAction}
            className="px-6 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 transition shadow-lg"
          >
            {config.btnLabel}
          </button>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs mt-8">
          © 2026 Dinas Perhubungan Aceh — Mudik Gratis
        </p>
      </div>
    </div>
  );
}

// ================================================================
// LOADING SKELETON
// ================================================================
function PortalLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse" />
        <div className="h-3 w-32 rounded bg-slate-800 animate-pulse" />
        <div className="h-2 w-24 rounded bg-slate-800 animate-pulse" />
      </div>
    </div>
  );
}

// ================================================================
// MAIN EXPORT: PortalGuard
// ================================================================
/**
 * PortalGuard — bungkus halaman dengan guard portal.
 *
 * Usage:
 * ```tsx
 * <PortalGuard type="register">
 *   <Register />
 * </PortalGuard>
 *
 * <PortalGuard type="mudik">
 *   <DaftarMudik />
 * </PortalGuard>
 *
 * <PortalGuard type="sesi">
 *   <Dashboard />  // ← jika sesi berakhir, seluruh app ditutup
 * </PortalGuard>
 * ```
 */
export default function PortalGuard({ type, children }: PortalGuardProps) {
  const { status, loading } = usePortalStatus();

  // Tampilkan loading saat fetch pertama
  if (loading && !status) return <PortalLoadingSkeleton />;

  // Jika status null/error → tampilkan konten (fallback aman)
  if (!status) return <>{children}</>;

  // ── Cek sesi global (paling prioritas) ──────────────────────────
  if (!status.sesi_aktif && type !== "sesi") {
    return (
      <PortalTutupScreen type="sesi" pesan={status.pesan_sesi_berakhir} />
    );
  }

  // ── Cek portal spesifik ──────────────────────────────────────────
  if (type === "sesi" && !status.sesi_aktif) {
    return (
      <PortalTutupScreen type="sesi" pesan={status.pesan_sesi_berakhir} />
    );
  }

  if (type === "register" && !status.portal_register_open) {
    return (
      <PortalTutupScreen type="register" pesan={status.pesan_register_tutup} />
    );
  }

  if (type === "mudik" && !status.portal_mudik_open) {
    return (
      <PortalTutupScreen type="mudik" pesan={status.pesan_mudik_tutup} />
    );
  }

  // Portal terbuka → render konten normal
  return <>{children}</>;
}
