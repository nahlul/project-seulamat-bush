// src/components/PortalStatusBadge.tsx
// Badge kecil yang ditampilkan di Home page untuk info status portal publik
import React from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { usePortalStatus } from "../hooks/usePortalStatus";

export default function PortalStatusBadge() {
  const { status, loading } = usePortalStatus();

  if (loading || !status) return null;

  // Jika sesi berakhir
  if (!status.sesi_aktif) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/60 border border-red-500/40 text-red-200 text-xs font-bold backdrop-blur-sm">
        <XCircle size={13} />
        Program Mudik Gratis Telah Berakhir
      </div>
    );
  }

  // Jika portal mudik ditutup
  if (!status.portal_mudik_open) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-900/60 border border-orange-500/40 text-orange-200 text-xs font-bold backdrop-blur-sm">
        <Clock size={13} />
        Pendaftaran Mudik Ditutup
      </div>
    );
  }

  // Jika portal register ditutup tapi mudik masih buka (edge case)
  if (!status.portal_register_open) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-900/60 border border-yellow-500/40 text-yellow-200 text-xs font-bold backdrop-blur-sm">
        <Clock size={13} />
        Pendaftaran Akun Baru Ditutup
      </div>
    );
  }

  // Normal — portal terbuka
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-900/60 border border-green-500/40 text-green-200 text-xs font-bold backdrop-blur-sm">
      <CheckCircle size={13} />
      Pendaftaran Mudik Gratis Dibuka
    </div>
  );
}
