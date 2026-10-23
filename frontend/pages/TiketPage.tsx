import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { UserAPI } from "../lib/api"
import { Download, Loader2, Bus, MapPin, Calendar, QrCode, AlertCircle, Lock } from "lucide-react"
import QRCodeLib from "qrcode"

type Pendaftaran = {
  pendaftaran_id: number
  kode_booking: string
  status_pendaftaran: string
  nama_peserta: string
  nik_peserta: string
  tujuan: string
  tanggal_keberangkatan: string
  nama_bus: string | null
  plat_nomor: string | null
  alamat_rumah?: string
  rute?: { asal: string; tujuan: string; tanggal_keberangkatan: string }
  kendaraan?: { nama_armada: string }
}

// ─── Status yang boleh download tiket ───────────────────────────────────────
function bolehDownload(status: string) {
  const s = (status || "").toUpperCase()
  return (
    s.includes("DITERIMA") ||
    s.includes("TERKONFIRMASI") ||
    s.includes("SIAP") ||
    s.includes("VERIFIKASI")
  )
}

// ─── Format tanggal Indonesia ────────────────────────────────────────────────
function formatTanggal(raw: string) {
  if (!raw) return "Jadwal Belum Rilis"
  try {
    const d = new Date(raw)
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  } catch {
    return raw
  }
}

// ─── QR Code inline sebagai data URL ────────────────────────────────────────
async function makeQR(text: string): Promise<string> {
  try {
    return await QRCodeLib.toDataURL(text, {
      width: 200,
      margin: 1,
      color: { dark: "#0A2A6E", light: "#FFFFFF" },
    })
  } catch {
    return ""
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  TIKET CARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════
function TiketCard({
  data,
  onDownload,
  downloading,
  tiketOpen,
  pesanTerkunci,
}: {
  data: Pendaftaran
  onDownload: () => void
  downloading: boolean
  tiketOpen: boolean
  pesanTerkunci: string
}) {
  const [qrUrl, setQrUrl] = useState("")
  const ruteAsal  = data.rute?.asal  ?? data.tujuan?.split("-")[0] ?? "—"
  const ruteTujuan= data.rute?.tujuan ?? data.tujuan?.split("-")[1] ?? "—"
  const armada    = data.kendaraan?.nama_armada ?? data.nama_bus ?? "—"
  const tanggal   = formatTanggal(data.rute?.tanggal_keberangkatan ?? data.tanggal_keberangkatan)
  const qrPayload = `${data.kode_booking}|${data.nama_peserta}|${data.nik_peserta}`

  useEffect(() => {
    makeQR(qrPayload).then(setQrUrl)
  }, [qrPayload])

  return (
    // ── Wrapper kartu ──────────────────────────────────────────────────────
    <div
      id={`tiket-${data.pendaftaran_id}`}
      className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: "linear-gradient(160deg, #0A0E1A 0%, #0D2045 100%)" }}
    >
      {/* ── Blob glow kiri ──────────────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #1A4B8C55 0%, transparent 70%)", transform: "translate(-30%, -30%)" }}
      />
      {/* ── Blob glow kanan bawah ───────────────────────────────────────── */}
      <div
        className="absolute bottom-0 right-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #0E3A6E55 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
      />

      {/* ── HEADER LOGO ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-2">
        {/* Logo kiri */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <img src="/logo-pancacita_dishub.png" alt="Dishub" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
          <div>
            <p className="text-white font-bold text-xs leading-none">DISHUB ACEH</p>
            <p className="text-blue-300 text-[10px]">Pemerintah Aceh</p>
          </div>
        </div>
        {/* Logo kanan */}
        <div className="flex items-center gap-2">
          <div>
            <p className="text-white font-bold text-xs leading-none text-right">Mudik Gratis</p>
            <p className="text-blue-300 text-[10px] text-right">Pemerintah Aceh</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <img src="/Seulamat Logo-04.png" alt="Seulamat" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
        </div>
      </div>

      {/* ── JUDUL ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 text-center py-4">
        <h1
          className="text-white font-black tracking-wider"
          style={{ fontSize: "clamp(2.5rem, 10vw, 4rem)", letterSpacing: "0.06em" }}
        >
          E-TIKET
        </h1>
        <p className="text-blue-200 font-semibold text-sm tracking-widest mt-0.5">
          MUDIK GRATIS
        </p>
        <p className="text-blue-200 font-semibold text-sm tracking-widest">
          PEMERINTAH ACEH 2026
        </p>
      </div>

      {/* ── KARTU PUTIH ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-4 mb-0 rounded-3xl bg-white overflow-hidden shadow-xl">
        {/* Kode booking */}
        <div className="text-center py-4 border-b border-slate-100">
          <p className="text-blue-600 font-bold text-base tracking-wide">
            {data.kode_booking || `MDK-${data.pendaftaran_id}`}
          </p>
        </div>

        {/* Data peserta + QR */}
        <div className="p-5 flex gap-4">
          <div className="flex-1 space-y-4">
            {/* Nama */}
            <div>
              <p className="text-blue-500 text-xs font-medium">Nama Penumpang</p>
              <p className="text-slate-900 font-bold text-base leading-tight">
                {data.nama_peserta.toUpperCase()}
              </p>
            </div>
            {/* NIK */}
            <div>
              <p className="text-blue-500 text-xs font-medium">NIK</p>
              <p className="text-slate-900 font-bold text-base font-mono tracking-wider leading-tight">
                {data.nik_peserta}
              </p>
            </div>
            {/* Alamat */}
            <div>
              <p className="text-blue-500 text-xs font-medium">Alamat Domisili</p>
              <p className="text-slate-900 font-bold text-sm leading-tight">
                {data.alamat_rumah ?? "—"}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex-shrink-0">
            <div className="w-28 h-28 rounded-xl overflow-hidden border-4 border-blue-600 shadow-md">
              {qrUrl
                ? <img src={qrUrl} alt="QR Code" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <QrCode size={40} className="text-slate-300" />
                  </div>
              }
            </div>
          </div>
        </div>

        {/* Strip keberangkatan */}
        <div className="mx-4 mb-4 bg-blue-600 rounded-xl py-3 text-center">
          <p className="text-white font-semibold text-sm">
            Keberangkatan : {tanggal}
          </p>
        </div>

        {/* Rute & Armada */}
        <div className="px-5 pb-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-blue-500 text-xs font-medium">Rute Perjalanan</p>
            <p className="text-slate-900 font-bold text-sm">
              {ruteAsal}-{ruteTujuan}
            </p>
          </div>
          <div>
            <p className="text-blue-500 text-xs font-medium">Armada Bus</p>
            <p className="text-slate-900 font-bold text-sm">{armada}</p>
          </div>
        </div>

        {/* Dashed separator */}
        <div className="relative mx-0 my-1">
          {/* Notch kiri */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-[#0A0E1A] to-[#0D2045]" />
          {/* Notch kanan */}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-[#0A0E1A] to-[#0D2045]" />
          <div className="mx-6 border-t-2 border-dashed border-slate-200" />
        </div>

        {/* Catatan */}
        <div className="p-5 text-center">
          <p className="text-slate-500 text-xs italic">*Harap datang 1 jam sebelum keberangkatan</p>
          <p className="text-slate-500 text-xs italic">*Tunjukkan QR Code ini kepada petugas</p>
          <p className="text-slate-400 text-xs mt-3">Layanan Pengaduan (WA) :</p>
          <p className="text-blue-600 font-bold text-sm">08217653093 / 08217653095</p>
        </div>
      </div>

      {/* ── GELOMBANG BAWAH ─────────────────────────────────────────────── */}
      <div className="relative z-10 mt-0 overflow-hidden" style={{ height: 80 }}>
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,40 C50,80 150,0 200,40 C250,80 350,0 400,40 L400,80 L0,80 Z"
            fill="#1A4B8C" opacity="0.5" />
          <path d="M0,55 C60,20 140,80 200,55 C260,20 340,80 400,55 L400,80 L0,80 Z"
            fill="#2563EB" opacity="0.6" />
        </svg>
      </div>

      {/* ── TOMBOL DOWNLOAD ─────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 pb-6">
        {tiketOpen ? (
          <button
            onClick={onDownload}
            disabled={downloading}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #2563EB, #1A4B8C)",
              color: "white",
              boxShadow: "0 8px 24px rgba(37,99,235,0.4)",
            }}
          >
            {downloading
              ? <><Loader2 size={16} className="animate-spin" /> Mengunduh...</>
              : <><Download size={16} /> Unduh Tiket PDF</>
            }
          </button>
        ) : (
          <div className="space-y-2">
            <button
              disabled
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #64748b, #475569)", color: "white" }}
            >
              <Lock size={16} /> Tiket Belum Tersedia
            </button>
            <p className="text-center text-blue-200 text-xs px-2 leading-relaxed">
              {pesanTerkunci}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  HALAMAN TIKET  (route: /tiket  atau  bisa dipanggil dari Dashboard)
// ════════════════════════════════════════════════════════════════════════════
export default function TiketPage() {
  const navigate = useNavigate()
  const [loading, setLoading]       = useState(true)
  const [listData, setListData]     = useState<Pendaftaran[]>([])
  const [downloading, setDownloading] = useState<number | null>(null)
  const [tiketOpen, setTiketOpen]   = useState(false)
  const [pesanTerkunci, setPesanTerkunci] = useState("Harap tunggu konfirmasi dari admin untuk mengunduh tiket.")

  useEffect(() => {
    const token  = localStorage.getItem("token")
    const userId = localStorage.getItem("userId")?.replace(/"/g, "")
    if (!token || !userId) { navigate("/login"); return }

    Promise.all([
      fetch("/api/portal/status").then(r => r.json()).catch(() => null),
      UserAPI.riwayat().catch(() => null),
    ]).then(([portalStatus, res]) => {
      if (portalStatus) {
        setTiketOpen(!!portalStatus.portal_tiket_open)
        if (portalStatus.pesan_tiket_tutup) setPesanTerkunci(portalStatus.pesan_tiket_tutup)
      }
      if (Array.isArray(res)) {
        const tikets = res.filter((d: Pendaftaran) => bolehDownload(d.status_pendaftaran))
        setListData(tikets)
      }
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleDownload = async (id: number, nama: string) => {
    setDownloading(id)
    try {
      await UserAPI.downloadTiket(id, nama)
    } catch (err: any) {
      alert("Gagal mengunduh tiket: " + (err?.message || "Terjadi kesalahan"))
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" /> Memuat tiket...
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: "linear-gradient(135deg, #0A0E1A 0%, #0D2045 100%)" }}
    >
      <div className="max-w-lg mx-auto">
        {/* Judul halaman */}
        <div className="text-center mb-8">
          <h1 className="text-white font-black text-3xl tracking-wide">Tiket Saya</h1>
          <p className="text-blue-300 text-sm mt-1">Mudik Gratis Pemerintah Aceh 2026</p>
        </div>

        {listData.length === 0 ? (
          <div className="bg-white/10 rounded-3xl p-10 text-center backdrop-blur-sm border border-white/10">
            <AlertCircle size={48} className="text-blue-300 mx-auto mb-4" />
            <p className="text-white font-semibold">Belum ada tiket tersedia</p>
            <p className="text-blue-300 text-sm mt-2">
              Tiket dapat diunduh setelah pendaftaran berstatus <strong>DITERIMA</strong>
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
            >
              Kembali ke Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Banner jika tiket masih terkunci */}
            {!tiketOpen && (
              <div className="flex items-start gap-3 bg-orange-500/20 border border-orange-400/40 rounded-2xl p-4 backdrop-blur-sm">
                <Lock size={20} className="text-orange-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-200 font-bold text-sm">Download Tiket Belum Tersedia</p>
                  <p className="text-orange-300/80 text-xs mt-1 leading-relaxed">{pesanTerkunci}</p>
                </div>
              </div>
            )}
            {listData.map((tiket) => (
              <TiketCard
                key={tiket.pendaftaran_id}
                data={tiket}
                onDownload={() => handleDownload(tiket.pendaftaran_id, tiket.nama_peserta)}
                downloading={downloading === tiket.pendaftaran_id}
                tiketOpen={tiketOpen}
                pesanTerkunci={pesanTerkunci}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-blue-300 text-sm hover:text-white transition"
          >
            ← Kembali ke Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}