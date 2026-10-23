import { useNavigate } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserAPI, PortalAPI, FeedbackAPI } from "../lib/api"
import Footer from "../components/Footer"
import {
  Download, Bus, Calendar, ChevronDown, LogOut, Info,
  HelpCircle, User, UserCog, MapPin, Clock, AlertCircle,
  Ticket, Loader2, FileText, CheckCircle2, AlertTriangle,
  ShieldAlert, Edit, Plus, Sparkles, Lock, MessageCircle, Phone,
  Star, Send, XCircle
} from "lucide-react"

// ── Desktop hero images (landscape, 16:9)
import heroD1 from "../assets/BG-banner-dashboard-dekstop-(1).jpg"
import heroD2 from "../assets/BG-banner-dashboard-dekstop-(2).jpg"
import heroD3 from "../assets/BG-banner-dashboard-dekstop-(3).jpg"
import heroD4 from "../assets/BG-banner-dashboard-dekstop-(4).jpg"
// ── Phone hero images (portrait, lebih tinggi)
import heroP1 from "../assets/BG-banner-dashboard-phone-(1).jpg"
import heroP2 from "../assets/BG-banner-dashboard-phone-(2).jpg"
import heroP3 from "../assets/BG-banner-dashboard-phone-(3).jpg"
import heroP4 from "../assets/BG-banner-dashboard-phone-(4).jpg"

import logoseulamat from "../assets/Seulamat Logo-04.png"
import logoDishub   from "../assets/logo-pancacita_dishub.png"

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
  alasan_tolak?: string
  link_konfirmasi_dikirim?: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [listData, setListData] = useState<Pendaftaran[]>([])
  const [openMenu, setOpenMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const heroDesktop = [heroD1, heroD2, heroD3, heroD4]
  const heroPhone   = [heroP1, heroP2, heroP3, heroP4]
  const [heroIndex, setHeroIndex] = useState(0)
  const [fade, setFade] = useState(true)

  // Portal & Feedback state
  const [portalStatus, setPortalStatus] = useState<any>(null)
  const [portalLoaded, setPortalLoaded] = useState(false)
  const [showSesiModal, setShowSesiModal] = useState(false)

  // ── Feedback state ────────────────────────────────────────────────
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackKomentar, setFeedbackKomentar] = useState("")
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackStep, setFeedbackStep] = useState<"form" | "success">("form")
  const [sudahKirimFeedback, setSudahKirimFeedback] = useState(false)
  const [ulasanAktif, setUlasanAktif] = useState(false) // dikontrol admin

  const namaAkun = (localStorage.getItem("nama") || "User").replace(/"/g, "")
  const token = localStorage.getItem("token")
  const userId = (localStorage.getItem("userId") || "").replace(/"/g, "")

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setHeroIndex((prev) => (prev + 1) % heroDesktop.length)
        setFade(true)
      }, 700)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!token || !userId) { setLoading(false); return }

    // ── Cek localStorage dulu sebagai fallback cepat ──────────────────
    const localKey = `feedback_sent_${userId}`
    const sudahLocal = localStorage.getItem(localKey) === "1"
    if (sudahLocal) setSudahKirimFeedback(true)

    // ── Load portal status ────────────────────────────────────────────
    PortalAPI.getStatus()
      .then(s => {
        if (!s) return
        setPortalStatus(s)
        if (!s.sesi_aktif) setShowSesiModal(true)
        // Set ulasanAktif — dikontrol admin via toggle di AdminFeedback
        const aktif = s.ulasan_open === true || s.ulasan_open === "true"
        setUlasanAktif(aktif)
      })
      .catch(() => {})
      .finally(() => setPortalLoaded(true))

    // ── Load riwayat pendaftaran ──────────────────────────────────────
    UserAPI.riwayat()
      .then(res => { if (Array.isArray(res)) setListData(res) })
      .catch(() => {})
      .finally(() => setLoading(false))

    // ── Cek sudah kirim feedback (backend, fallback localStorage) ─────
    FeedbackAPI.sudahKirim()
      .then(res => {
        const sudah = res?.sudah_kirim === true
        setSudahKirimFeedback(sudah)
        if (sudah) localStorage.setItem(localKey, "1")
        else localStorage.removeItem(localKey)
      })
      .catch(() => {
        // Endpoint belum ada / error — tetap pakai hasil localStorage
        setSudahKirimFeedback(sudahLocal)
      })
  }, [token, userId])

  // ✅ FIX 2: listAktif EXCLUDE dibatalkan (untuk kuota)
  // DIBATALKAN tidak dihitung dalam kuota → user bisa tambah penumpang baru
  const listAktif = listData.filter(
    (p) => p.status_pendaftaran !== "DITOLAK" && p.status_pendaftaran !== "DIBATALKAN"
  )
  const maxKuota = 6
  const terpakai = listAktif.length  // hanya hitung yang aktif (bukan dibatalkan)
  const sisa = maxKuota - terpakai
  const sudahAdaLinkKonfirmasi = listAktif.some(p => p.link_konfirmasi_dikirim)
  // 🔒 Lock tambah penumpang jika ada anggota dengan status DITERIMA H-3
  const adaDiterimaH3 = listAktif.some(p => p.status_pendaftaran === "DITERIMA H-3")
  // 🔒 Lock tambah penumpang jika ada anggota DITOLAK (sedang masa perbaikan 1 jam)
  const adaDitolak = listData.some(p => p.status_pendaftaran === "DITOLAK")
  // ℹ️ semuaBatal: semua non-dibatalkan sudah tidak ada (hanya untuk display info)
  const semuaBatal = listData.length > 0 && listAktif.length === 0
  // 🔒 Lock tambah penumpang jika ada anggota TERKONFIRMASI atau SIAP BERANGKAT
  const adaTerkonfirmasi = listAktif.some(p =>
    p.status_pendaftaran === "TERKONFIRMASI" ||
    p.status_pendaftaran === "TERVERIFIKASI/ SIAP BERANGKAT"
  )
  // ✅ FIX 2: semuaBatal TIDAK menghalangi bolehNambah
  // Kalau semua dibatalkan → sisa = maxKuota (6), user boleh daftar ulang
  const bolehNambah = sisa > 0 && (!portalStatus || portalStatus.sesi_aktif !== false) && !sudahAdaLinkKonfirmasi && !adaDiterimaH3 && !adaTerkonfirmasi && !adaDitolak

  const ruteTerkunci = listAktif.length > 0 ? listAktif[0].tujuan : null

  const handleDownload = async (id: number, nama: string) => {
    try {
      await UserAPI.downloadTiket(id, nama)
    } catch (err: any) {
      let msg = err.message
      if (msg.includes("{")) { try { msg = JSON.parse(msg).error } catch {} }
      alert("⚠️ Gagal: " + msg)
    }
  }

  // ── Auto-popup: muncul otomatis kalau ulasan aktif & belum pernah kirim ──
  useEffect(() => {
    if (ulasanAktif && !sudahKirimFeedback && !loading) {
      const t = setTimeout(() => {
        setFeedbackStep("form")
        setShowFeedbackModal(true)
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [ulasanAktif, sudahKirimFeedback, loading])

  const handleEdit = (id: number) => navigate(`/daftar-mudik?edit=${id}`)

  const handleKirimFeedback = async () => {
    if (feedbackRating === 0) { alert("Pilih bintang terlebih dahulu"); return }
    setFeedbackLoading(true)
    try {
      await FeedbackAPI.kirim({ rating: feedbackRating, komentar: feedbackKomentar, nama_pengirim: namaAkun })
      setSudahKirimFeedback(true)
      // Simpan ke localStorage sebagai fallback
      const localKey = `feedback_sent_${userId}`
      localStorage.setItem(localKey, "1")
      setFeedbackStep("success")
    } catch (err: any) {
      alert("Gagal kirim feedback: " + err.message)
    } finally { setFeedbackLoading(false) }
  }

  const handleTutupFeedback = () => {
    setShowFeedbackModal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <Bus className="absolute inset-0 m-auto text-blue-600" size={20} />
          </div>
          <p className="text-slate-500 font-semibold text-sm">Memuat data mudik...</p>
        </div>
      </div>
    )
  }

  const pctUsed = (terpakai / maxKuota) * 100

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>

      {/* ══════════ HERO HEADER ══════════ */}
      <section className="relative h-[260px] sm:h-[340px] lg:h-[400px] flex-shrink-0 overflow-hidden">

        <img
          src={heroDesktop[heroIndex]}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-[1800ms] hidden sm:block ${fade ? "opacity-100 scale-[1.03]" : "opacity-0 scale-100"}`}
          alt="Hero Desktop"
        />
        <img
          src={heroPhone[heroIndex]}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-[1800ms] sm:hidden ${fade ? "opacity-100 scale-[1.03]" : "opacity-0 scale-100"}`}
          alt="Hero Phone"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/92 via-[#0f2a5e]/75 to-[#0a1628]/20 sm:to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50/60 to-transparent sm:hidden" />
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 8% 50%, rgba(96,165,250,0.5) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(245,158,11,0.3) 0%, transparent 50%)"
        }} />
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "50px 50px"
        }} />

        {/* TOPBAR */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5" style={{ zIndex: 9999, overflow: "visible" }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-lg"
          >
            <img src={logoseulamat} alt="Seulamat" className="h-7 sm:h-9 w-auto brightness-200 drop-shadow" />
            <div className="w-px h-5 sm:h-6 bg-white/25" />
            <img src={logoDishub} alt="Dishub Aceh" className="h-6 sm:h-8 w-auto drop-shadow opacity-90" />
          </motion.div>

          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
            style={{ zIndex: 99999 }}
          >
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-2 sm:gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-2 text-white hover:bg-white/20 transition"
            >
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-white/60 leading-none">Halo,</p>
                <p className="font-bold text-sm leading-tight">{namaAkun}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center font-extrabold text-sm shadow-lg">
                {namaAkun.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={14} className={`transition duration-300 text-white/70 ${openMenu ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {openMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                  style={{ zIndex: 99999 }}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-extrabold">
                        {namaAkun.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{namaAkun}</p>
                        <p className="text-blue-200 text-xs">Peserta Mudik Gratis</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <MenuItem icon={<UserCog size={17} />} label="Edit Profil & Password" onClick={() => { navigate("/edit-profile"); setOpenMenu(false) }} />
                    <div className="h-px bg-slate-100 my-1" />
                    <MenuItem icon={<Info size={17} />} label="Tentang Program" onClick={() => { navigate("/program"); setOpenMenu(false) }} />
                    <MenuItem icon={<HelpCircle size={17} />} label="Pusat Bantuan" onClick={() => { navigate("/bantuan"); setOpenMenu(false) }} />
                    <div className="h-px bg-slate-100 my-1" />
                    <MenuItem icon={<LogOut size={17} />} label="Keluar" danger onClick={() => { localStorage.clear(); navigate("/login") }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 h-full flex flex-col justify-end pb-6 sm:pb-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-2 sm:mb-3">
              <Sparkles size={10} /> Mudik Gratis 2026
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-1 sm:mb-1.5 drop-shadow-md leading-tight">
              Seulamat Bak Jalan,{" "}
              <span className="text-yellow-300">Bahgia Di Gampoeng.</span>
            </h1>
            <p className="text-blue-200 text-xs sm:text-sm max-w-md leading-relaxed hidden sm:block">
              Pantau status pendaftaran dan tiket perjalanan mudik Anda di sini.
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 flex gap-1.5 z-20">
          {heroDesktop.map((_, i) => (
            <button key={i} onClick={() => setHeroIndex(i)}
              className={`rounded-full transition-all duration-300 ${i === heroIndex ? "w-5 sm:w-6 h-2 bg-white" : "w-2 h-2 bg-white/30"}`}
            />
          ))}
        </div>
      </section>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <section className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 w-full -mt-4 sm:-mt-6 relative z-20 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── SIDEBAR ── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Kuota Card — mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 lg:hidden"
            >
              <KuotaCard
                terpakai={terpakai}
                sisa={sisa}
                maxKuota={maxKuota}
                pctUsed={pctUsed}
                bolehNambah={bolehNambah}
                sudahAdaLinkKonfirmasi={sudahAdaLinkKonfirmasi}
                adaDiterimaH3={adaDiterimaH3}
                adaTerkonfirmasi={adaTerkonfirmasi}
                adaDitolak={adaDitolak}
                semuaBatal={semuaBatal}
                onTambah={() => {
                  if (!portalStatus || portalStatus.sesi_aktif !== false) navigate("/daftar-mudik")
                  else setShowSesiModal(true)
                }}
              />
            </motion.div>

            {/* RUTE TERKUNCI — mobile */}
            {ruteTerkunci && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="lg:hidden bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 opacity-10"><Lock size={80} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Lock size={15} />
                    </div>
                    <h3 className="font-bold text-sm">Rute Akun Terkunci</h3>
                  </div>
                  <p className="text-blue-100 text-xs leading-relaxed mb-3">
                    Rute dipilih oleh pemilik akun dan <strong className="text-white">tidak dapat diubah</strong>. Seluruh anggota keluarga menggunakan rute yang sama.
                  </p>
                  <div className="bg-white/15 border border-white/25 rounded-xl px-4 py-3 flex items-center gap-3">
                    <MapPin size={16} className="text-yellow-300 shrink-0" />
                    <div>
                      <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Rute Terpilih</p>
                      <p className="font-extrabold text-white text-sm">Banda Aceh → {ruteTerkunci}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
              <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Info size={15} className="text-blue-600" />
                </div>
                Panduan Pendaftaran
              </h3>

              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText size={12} /> Dokumen Dibutuhkan
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-2">
                    {["KTP/KK (Dewasa)", "KK / KIA (Anak)", "No. WhatsApp Aktif"].map((d, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Lock size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 mb-1">1 Akun = 1 Rute</p>
                      <p className="text-xs text-amber-600 leading-relaxed">
                        Rute dipilih saat pendaftaran pertama dan berlaku permanen untuk seluruh anggota keluarga. Pilih dengan cermat!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Alur Pendaftaran
                  </h4>
                  <ol className="space-y-3">
                    {[
                      "Isi data & upload dokumen",
                      "Tunggu verifikasi admin",
                      "Status berubah jadi Diterima",
                      "Menunggu konfirmasi ulang oleh Admin",
                      "Download tiket & berangkat!",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>

            {/* Warning Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 opacity-10">
                <ShieldAlert size={100} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                  <h3 className="font-bold text-base">Peringatan Tegas!</h3>
                </div>
                <div className="space-y-3 text-sm text-red-100 leading-relaxed">
                  <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                    <p className="font-bold text-white mb-1">📋 Data tidak sesuai</p>
                    <p>Data palsu atau foto buram akan langsung <strong>DITOLAK</strong> tanpa pemberitahuan.</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                    <p className="font-bold text-white mb-1">🚫 Pembatalan tanpa konfirmasi.</p>
                    <p>NIK Anda akan di-<strong>BLACKLIST</strong> dari program mudik gratis Pemerintah Aceh.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* HOTLINE WA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <Phone size={14} className="text-green-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Butuh Bantuan?</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Tim panitia siap membantu Anda seputar pendaftaran, verifikasi, atau kendala lainnya.
              </p>
              <a
                href="https://wa.me/628217653095?text=Halo%20Admin%20Maman%2C%20saya%20ingin%20menanyakan%20perihal%20status%20pendaftaran%20Mudik%20Gratis%20Aceh%20saya."
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-green-200"
              >
                <MessageCircle size={16} />
                Chat Admin via WhatsApp
              </a>
              <p className="text-[10px] text-slate-400 text-center mt-2.5">
                Senin – Jumat · 08.00 – 16.00 WIB
              </p>
            </motion.div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Kuota Card — desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="hidden lg:block"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <KuotaCard
                  terpakai={terpakai}
                  sisa={sisa}
                  maxKuota={maxKuota}
                  pctUsed={pctUsed}
                  bolehNambah={bolehNambah}
                  sudahAdaLinkKonfirmasi={sudahAdaLinkKonfirmasi}
                  adaDiterimaH3={adaDiterimaH3}
                  adaTerkonfirmasi={adaTerkonfirmasi}
                  adaDitolak={adaDitolak}
                  semuaBatal={semuaBatal}
                  onTambah={() => {
                    if (!portalStatus || portalStatus.sesi_aktif !== false) navigate("/daftar-mudik")
                    else setShowSesiModal(true)
                  }}
                />
              </div>
            </motion.div>

            {/* RUTE TERKUNCI BANNER — desktop */}
            {ruteTerkunci && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden lg:flex items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Rute Akun Terkunci</p>
                  <p className="font-extrabold text-indigo-800 truncate">Banda Aceh → {ruteTerkunci}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Seluruh anggota keluarga menggunakan rute yang sama. Tidak dapat diubah.</p>
                </div>
                <div className="shrink-0 bg-indigo-100 border border-indigo-200 text-indigo-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                  🔒 Terkunci
                </div>
              </motion.div>
            )}

            {/* Tiket List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                  Daftar & Status Tiket
                </h3>
                {listData.length > 0 && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-semibold">
                    {listData.length} penumpang
                  </span>
                )}
              </div>

              {listData.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <Bus size={36} className="text-blue-300" />
                  </div>
                  <p className="text-slate-700 font-bold text-lg mb-1">Belum ada pendaftaran</p>
                  <p className="text-slate-400 text-sm mb-3">Daftarkan diri atau anggota keluarga Anda sekarang.</p>
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 inline-block mb-5 font-medium">
                    ⚠️ Rute yang dipilih saat pendaftaran pertama berlaku untuk seluruh keluarga dan tidak bisa diubah
                  </p>
                  <button
                    onClick={() => navigate("/daftar-mudik")}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
                  >
                    <Plus size={16} /> Daftar Sekarang
                  </button>
                </motion.div>
              ) : !portalLoaded ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listData.map((p) => (
                    <div key={p.pendaftaran_id} className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listData.map((p, i) => (
                    <motion.div
                      key={p.pendaftaran_id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <CardPenumpang
                        data={p}
                        onDownload={() => handleDownload(p.pendaftaran_id, p.nama_peserta)}
                        onEdit={() => handleEdit(p.pendaftaran_id)}
                        tiketOpen={!!portalStatus?.portal_tiket_open}
                        pesanTerkunci={portalStatus?.pesan_tiket_tutup || "Harap tunggu konfirmasi dari admin untuk mengunduh tiket."}
                        linkReady={sudahAdaLinkKonfirmasi}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* FEEDBACK INLINE BANNER */}
            {ulasanAktif && !sudahKirimFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 shadow-lg text-white flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Star size={24} className="text-white" fill="white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-base leading-tight">Bagikan Pengalamanmu!</p>
                  <p className="text-amber-100 text-xs mt-0.5 leading-relaxed">Bantu kami tingkatkan layanan dengan ulasan singkatmu.</p>
                </div>
                <button
                  onClick={() => { setFeedbackStep("form"); setShowFeedbackModal(true) }}
                  className="shrink-0 bg-white text-amber-600 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-50 transition shadow-md"
                >
                  Beri Ulasan
                </button>
              </motion.div>
            )}

            {sudahKirimFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3"
              >
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <p className="text-sm text-emerald-700 font-semibold">Terima kasih! Ulasan kamu sudah kami terima. 🙏</p>
              </motion.div>
            )}

          </div>
        </div>
      </section>

      {/* MODAL SESI BERAKHIR */}
      <AnimatePresence>
        {showSesiModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-3">Program Telah Berakhir</h2>
              <p className="text-slate-500 text-sm text-center leading-relaxed mb-4">
                {portalStatus?.pesan_dashboard || "Program Mudik Gratis Aceh 2026 telah selesai."}
              </p>
              {portalStatus?.pesan_home && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                  <p className="text-blue-700 text-sm font-medium">ℹ️ {portalStatus.pesan_home}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowSesiModal(false)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition">
                  Lihat Data Saya
                </button>
                <button onClick={() => { localStorage.clear(); navigate("/") }}
                  className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2">
                  <LogOut size={16} /> Logout & Kembali ke Beranda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ FLOATING FEEDBACK BUTTON ══════════ */}
      {ulasanAktif && !sudahKirimFeedback && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1, type: "spring", damping: 20 }}
          onClick={() => { setFeedbackStep("form"); setShowFeedbackModal(true) }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl shadow-amber-300 hover:shadow-amber-400 hover:-translate-y-1 transition-all text-sm"
          title="Beri Ulasan"
        >
          <Star size={18} fill="white" />
          <span className="hidden sm:inline">Beri Ulasan</span>
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full" />
        </motion.button>
      )}

      {/* ══════════ FEEDBACK MODAL (POPUP + FLOATING) ══════════ */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", background: "rgba(10,22,40,0.65)" }}
            onClick={(e) => { if (e.target === e.currentTarget && feedbackStep === "form") handleTutupFeedback() }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

              {/* Close button */}
              {feedbackStep === "form" && (
                <button
                  onClick={handleTutupFeedback}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition z-10"
                >
                  <XCircle size={16} className="text-slate-500" />
                </button>
              )}

              <AnimatePresence mode="wait">
                {feedbackStep === "form" ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="p-7"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
                        <Star size={26} className="text-white" fill="white" />
                      </div>
                      <div className="pt-1">
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Portal Ulasan Dibuka
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-800 leading-tight">
                          Bagaimana pengalamanmu,<br />{namaAkun.split(" ")[0]}? ✨
                        </h2>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      Ulasanmu sangat berarti untuk terus meningkatkan layanan Program Mudik Gratis Aceh.
                    </p>

                    {/* Star Rating */}
                    <div className="mb-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Penilaian Keseluruhan</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFeedbackRating(s)}
                            className="group flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-200"
                            style={{
                              borderColor: feedbackRating >= s ? "#f59e0b" : "#e2e8f0",
                              background: feedbackRating >= s ? "linear-gradient(135deg,#fef3c7,#fde68a)" : "#f8fafc",
                              transform: feedbackRating === s ? "scale(1.08)" : "scale(1)",
                            }}
                          >
                            <Star
                              size={22}
                              fill={feedbackRating >= s ? "#f59e0b" : "none"}
                              className="transition-all duration-200"
                              style={{ color: feedbackRating >= s ? "#f59e0b" : "#94a3b8" }}
                            />
                            <span className="text-[9px] font-bold" style={{ color: feedbackRating >= s ? "#92400e" : "#94a3b8" }}>
                              {s === 1 ? "Buruk" : s === 2 ? "Kurang" : s === 3 ? "Cukup" : s === 4 ? "Bagus" : "Sempurna"}
                            </span>
                          </button>
                        ))}
                      </div>
                      {feedbackRating > 0 && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center text-xs text-amber-600 font-semibold mt-2"
                        >
                          {feedbackRating === 1 ? "😞 Kami sangat menyesal mendengar ini" :
                           feedbackRating === 2 ? "😕 Terima kasih, kami akan memperbaiki diri" :
                           feedbackRating === 3 ? "🙂 Terima kasih atas penilaian Anda!" :
                           feedbackRating === 4 ? "😊 Senang mendengarnya, terima kasih!" :
                           "🥳 Wah, terima kasih banyak!"}
                        </motion.p>
                      )}
                    </div>

                    {/* Komentar */}
                    <div className="mb-6">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Ceritakan Pengalamanmu <span className="font-normal normal-case text-slate-400">(opsional)</span>
                      </p>
                      <textarea
                        value={feedbackKomentar}
                        onChange={(e) => setFeedbackKomentar(e.target.value)}
                        rows={3}
                        placeholder="Apa yang paling berkesan? Ada saran untuk panitia? 🚌"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-slate-50 resize-none transition"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleTutupFeedback}
                        className="px-5 py-3.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm hover:bg-slate-200 transition"
                      >
                        Lewati
                      </button>
                      <button
                        type="button"
                        onClick={handleKirimFeedback}
                        disabled={feedbackLoading || feedbackRating === 0}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-200 hover:shadow-amber-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 text-sm"
                      >
                        {feedbackLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <><Send size={15} /> Kirim Ulasan</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="p-10 flex flex-col items-center text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", damping: 14, stiffness: 260 }}
                      className="relative mb-5"
                    >
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-200">
                        <CheckCircle2 size={44} className="text-white" strokeWidth={2.5} />
                      </div>
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5], x: [0, (i - 2) * 28], y: [0, -40 - i * 8] }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.9 }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        >
                          <Star size={14} fill="#f59e0b" className="text-amber-400" />
                        </motion.div>
                      ))}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Terima Kasih! 🙏</h2>
                      <p className="text-slate-500 text-sm leading-relaxed mb-1">
                        Ulasanmu sudah kami terima dan sedang menunggu persetujuan admin.
                      </p>
                      <p className="text-slate-400 text-xs mb-7">
                        Masukan Anda sangat membantu kami memberikan layanan lebih baik di tahun mendatang.
                      </p>
                      <div className="flex justify-center gap-1 mb-7">
                        {[...Array(feedbackRating)].map((_, i) => (
                          <Star key={i} size={24} fill="#f59e0b" className="text-amber-400" />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal(false)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all text-sm"
                      >
                        Kembali ke Dashboard
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}

// ══════════ KUOTA CARD COMPONENT ══════════
function KuotaCard({ terpakai, sisa, maxKuota, pctUsed, bolehNambah, onTambah, sudahAdaLinkKonfirmasi, adaDiterimaH3, adaTerkonfirmasi, adaDitolak, semuaBatal }: any) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
        <User size={28} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-800">Kuota Keluarga</h2>
          <span className="text-sm font-extrabold text-slate-700">
            <span className="text-blue-600">{terpakai}</span>/{maxKuota}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctUsed}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className={`h-full rounded-full ${pctUsed >= 100 ? "bg-red-500" : pctUsed >= 66 ? "bg-orange-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
          />
        </div>
        <p className="text-xs text-slate-400">
          {semuaBatal
            ? `Semua pendaftaran dibatalkan — ${sisa} slot tersedia kembali`
            : adaDitolak
            ? "Ada data yang perlu diperbaiki"
            : sisa > 0 ? `Sisa ${sisa} slot tersedia` : "Kuota sudah penuh"}
        </p>
      </div>
      {/* ✅ FIX 2: semuaBatal tidak lagi show badge "Dibatalkan" yang block aksi
          Kalau semuaBatal tapi bolehNambah = true, tombol Tambah tetap muncul */}
      {adaDitolak ? (
        <div className="shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs border border-red-200 text-center max-w-[150px]">
          <AlertTriangle size={16} />
          <span>Ditolak</span>
          <span className="font-normal text-[10px] text-red-400 leading-tight">Perbaiki data anda sebelum kehabisan kuota</span>
        </div>
      ) : bolehNambah ? (
        <button
          onClick={onTambah}
          className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all"
        >
          <Plus size={16} /> Tambah
        </button>
      ) : adaDiterimaH3 ? (
        <div className="shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs border border-blue-200 text-center max-w-[140px]">
          <Lock size={16} />
          <span>Terkunci</span>
          <span className="font-normal text-[10px] text-blue-500 leading-tight">Status sudah Diterima H-3</span>
        </div>
      ) : adaTerkonfirmasi ? (
        <div className="shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl font-bold text-xs border border-green-200 text-center max-w-[140px]">
          <Lock size={16} />
          <span>Terkunci</span>
          <span className="font-normal text-[10px] text-green-600 leading-tight">Sudah terkonfirmasi / siap berangkat</span>
        </div>
      ) : sudahAdaLinkKonfirmasi ? (
        <div className="shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs border border-orange-200 text-center max-w-[140px]">
          <Lock size={16} />
          <span>Terkunci</span>
          <span className="font-normal text-[10px] text-orange-500 leading-tight">Link konfirmasi sudah dikirim</span>
        </div>
      ) : (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-500 rounded-xl font-bold text-sm border border-red-100">
          <AlertCircle size={16} /> Penuh
        </div>
      )}
    </div>
  )
}

// ══════════ MENU ITEM ══════════
function MenuItem({ icon, label, onClick, danger = false }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition
        ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}`}
    >
      <span className={danger ? "text-red-400" : "text-slate-400"}>{icon}</span>
      {label}
    </button>
  )
}

// ══════════ CARD PENUMPANG ══════════
function CardPenumpang({ data, onDownload, onEdit, tiketOpen, pesanTerkunci, linkReady }: { data: Pendaftaran; onDownload: () => void; onEdit: () => void; tiketOpen: boolean; pesanTerkunci: string; linkReady: boolean }) {
  const sudahAdaLinkKonfirmasi = linkReady;
  const isTerkonfirmasi = data.status_pendaftaran === "TERKONFIRMASI" || data.status_pendaftaran === "TERVERIFIKASI/ SIAP BERANGKAT"
  const isDiterima = data.status_pendaftaran === "DITERIMA" || data.status_pendaftaran === "DITERIMA H-3"
  const isMenunggu = data.status_pendaftaran === "MENUNGGU VERIFIKASI"
  const isDitolak = data.status_pendaftaran === "DITOLAK"
  const isBatal = data.status_pendaftaran === "DIBATALKAN"
  const isPending = data.status_pendaftaran === "PENDING"
  const isDitunda = isPending

  const busValid = data.nama_bus &&
    data.nama_bus.trim() !== "" &&
    data.nama_bus !== "-" &&
    data.nama_bus.toLowerCase() !== "belum plotting" &&
    data.nama_bus.toLowerCase() !== "menunggu plotting" &&
    data.nama_bus.toLowerCase() !== "belum di-plotting" &&
    !data.nama_bus.toLowerCase().includes("menunggu") &&
    !data.nama_bus.toLowerCase().includes("plotting")

  const canDownload = isTerkonfirmasi && busValid

  const statusConfig = (() => {
    if (canDownload) return { color: "bg-green-100 text-green-700 border-green-200", label: "SIAP BERANGKAT", dot: "bg-green-500" }
    if (isTerkonfirmasi) return { color: "bg-purple-100 text-purple-700 border-purple-200", label: "TERKONFIRMASI", dot: "bg-purple-500" }
    if (isDiterima) return { color: "bg-blue-100 text-blue-700 border-blue-200", label: "DITERIMA", dot: "bg-blue-500" }
    if (isDitunda) return { color: "bg-orange-100 text-orange-700 border-orange-200", label: "PENDING", dot: "bg-orange-500" }
    if (isMenunggu) return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "MENUNGGU", dot: "bg-yellow-500" }
    if (isDitolak) return { color: "bg-red-100 text-red-700 border-red-200", label: "DITOLAK", dot: "bg-red-500" }
    if (isBatal) return { color: "bg-slate-100 text-slate-500 border-slate-200", label: "DIBATALKAN", dot: "bg-slate-400" }
    return { color: "bg-slate-100 text-slate-600 border-slate-200", label: data.status_pendaftaran, dot: "bg-slate-400" }
  })()

  const accentColor = canDownload ? "from-green-500 to-emerald-600"
    : isTerkonfirmasi ? "from-purple-500 to-indigo-600"
    : isDiterima ? "from-blue-500 to-indigo-600"
    : isDitunda ? "from-orange-400 to-amber-500"
    : isMenunggu ? "from-yellow-400 to-orange-500"
    : isDitolak ? "from-red-500 to-rose-600"
    : "from-slate-300 to-slate-400"

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 flex flex-col h-full group">
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1 pr-2">
            <h4 className="font-extrabold text-slate-800 truncate text-base">{data.nama_peserta}</h4>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">NIK: {data.nik_peserta}</p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wide flex items-center gap-1.5 ${statusConfig.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
        </div>

        {/* Detail rows */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4 border border-slate-100 flex-1">
          <DetailRow
            icon={<MapPin size={14} className="text-red-500" />}
            label="Rute"
            value={data.tujuan ? `Banda Aceh → ${data.tujuan}` : "-"}
          />
          <DetailRow icon={<Calendar size={14} className="text-blue-500" />} label="Jadwal" value={data.tanggal_keberangkatan || "Menunggu jadwal"} />
          {tiketOpen ? (
            <DetailRow
              icon={<Bus size={14} className="text-purple-500" />}
              label="Bus"
              value={busValid ? data.nama_bus! : "-"}
              muted={!busValid}
            />
          ) : (
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 shrink-0"><Bus size={14} className="text-slate-300" /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-0.5">Bus</p>
                <p className="font-semibold text-sm text-slate-300">——</p>
              </div>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="mt-auto">
          {canDownload && tiketOpen && (
            <button
              onClick={onDownload}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5 transition-all text-sm"
            >
              <Download size={16} /> Download E-Tiket
            </button>
          )}

          {canDownload && !tiketOpen && (
            <>
              <button
                disabled
                className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed text-sm mb-2"
              >
                <Lock size={16} /> Tiket Belum Tersedia
              </button>
              <div className="bg-orange-50 text-orange-700 p-3 rounded-xl text-xs flex items-start gap-2 border border-orange-100">
                <Lock size={14} className="shrink-0 mt-0.5" />
                <span>{pesanTerkunci}</span>
              </div>
            </>
          )}

          {isTerkonfirmasi && !busValid && (
            <>
              <button
                disabled
                className="w-full bg-slate-200 text-slate-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed text-sm mb-2"
              >
                <Download size={16} /> Download E-Tiket
              </button>
              <div className="bg-purple-50 text-purple-700 p-3 rounded-xl text-xs flex items-center gap-2 border border-purple-100">
                <Ticket size={15} className="shrink-0" />
                <span><strong>Terkonfirmasi!</strong> Tiket dapat didownload setelah nomor bus tersedia (1 x 24 Jam).</span>
              </div>
            </>
          )}

          {isDiterima && (
            <div className="space-y-2">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs flex items-start gap-2 border border-blue-100">
                <Clock size={15} className="shrink-0 mt-0.5" />
                <span><strong>Pendaftaran anda berhasil!</strong> Konfirmasi kehadiran anda dengan meng-klik tombol di Bawah pada tanggal 8 Maret 2026</span>
              </div>
              {sudahAdaLinkKonfirmasi ? (
                <button
                  onClick={() => window.location.href = `/konfirmasi/${data.pendaftaran_id}`}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-200"
                >
                  <CheckCircle2 size={14} /> Konfirmasi Kehadiran Sekarang
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-slate-200 text-slate-400 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Lock size={14} /> Menunggu Link dari Admin
                </button>
              )}
            </div>
          )}

          {isMenunggu && (
            <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl text-xs flex items-center gap-2 border border-yellow-100">
              <Loader2 size={15} className="shrink-0 animate-spin" />
              <span>Sedang diverifikasi oleh admin.</span>
            </div>
          )}

          {isDitolak && (
            <div className="space-y-2">
              <div className="bg-red-50 p-3 rounded-xl text-xs flex items-start gap-2 border border-red-100">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                <span className="text-red-700">
                  <strong>Ditolak:</strong> {data.alasan_tolak || "Data tidak memenuhi syarat."}
                </span>
              </div>
              <button
                onClick={onEdit}
                className="w-full bg-white border-2 border-red-200 text-red-600 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-300 transition flex items-center justify-center gap-1.5"
              >
                <Edit size={13} /> Perbaiki Data
              </button>
            </div>
          )}

          {isDitunda && (
            <div className="bg-orange-50 p-3 rounded-xl text-xs flex items-start gap-2 border border-orange-200">
              <span className="shrink-0 text-base">⏳</span>
              <div className="text-orange-700">
                <strong className="block mb-0.5">Status: PENDING</strong>Segera perbaiki data anggota keluarga yang statusnya <b>DITOLAK</b>. Pendaftaran anda akan diproses Kembali setelah memperbaiki data yang ditolak.
              </div>
            </div>
          )}

          {isBatal && (
            <div className="bg-slate-100 text-slate-500 p-3 rounded-xl text-xs flex items-center gap-2 border border-slate-200 justify-center">
              <LogOut size={15} />
              <span>Pendaftaran anda tidak berhasil! Kuota sudah penuh.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value, subvalue, muted }: {
  icon: React.ReactNode; label: string; value: string; subvalue?: string; muted?: boolean
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-0.5">{label}</p>
        <p className={`font-semibold text-sm truncate ${muted ? "text-slate-400 italic" : "text-slate-700"}`}>{value}</p>
        {subvalue && (
          <span className="text-[10px] bg-white border px-2 py-0.5 rounded-md text-slate-500 font-mono mt-1 inline-block">
            {subvalue}
          </span>
        )}
      </div>
    </div>
  )
}