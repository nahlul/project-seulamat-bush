import React, { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { PortalAPI, FeedbackAPI, AdminAPI } from "../lib/api"

import heroMobile from "../assets/BG-Phone.jpg"
import heroDesktop from "../assets/BG-Dekstop.jpg"
import logoDishub from "../assets/LOGO 26-29.png"
import logoseulamat from "../assets/Seulamat Logo-04.png"
import logoMudikGratis from "../assets/logo-mudik-gratis.png"
import logoPemprov from "../assets/pemprov aceh.png"
import gubWagub from "../assets/gub-wagub.png"
import logoSemenAndalas from "../assets/Logo-Semen-Andalas.png"
import logoBSI from "../assets/Logo BSI Green.png"

// Sponsor Row 1
import logoBaraMifa from "../assets/sponsors/logo-bara-mifa.png"
import logoJasaRaharja from "../assets/sponsors/logo-jasa-raharja.png"
import logoBankAceh from "../assets/sponsors/logo-bank-aceh.png"
import logoBankMustaqim from "../assets/sponsors/logo-bank-mustaqim.jpg"
import logoPLN from "../assets/sponsors/logo-pln.png"

// Sponsor Row 2
import logoBpmaMedco from "../assets/sponsors/logo-bpma-medco.png"
import logoAsdp from "../assets/sponsors/logo-asdp.png"
import logoPelindo from "../assets/sponsors/logo-pelindo.png"
import logoSkkPertamina from "../assets/sponsors/logo-skk-pertamina.png"
import logoBankBukopin from "../assets/sponsors/bank bukopin.png"
import logoBankBCA from "../assets/sponsors/logobankbca.png"
import logofibertera from "../assets/sponsors/fibertera.png"
import logoPIM from "../assets/sponsors//PIM.png"

// Sponsor Row 3 & 4
import logoAJB from "../assets/sponsors/LOGO_AJB-100KB-removebg-preview.png"
import logoPEMA from "../assets/sponsors/Logo-PEMA-Horizon 3.png"
import logoPN from "../assets/sponsors/Logo_Holding_Perkebunan_Nusantara_III.png"
import logoBI from "../assets/sponsors/bank-indonesia.png"

import {
  ClipboardCheck,
  ShieldCheck,
  MapPin,
  Bus,
  Sparkles,
  Globe2,
  Mail,
  Phone,
  ArrowRight,
  ChevronDown,
  Star,
  Clock,
  CheckCircle2,
  Play,
  AlertCircle,
  Timer,
} from "lucide-react"

// ─── Floating particles background ────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 6 + 2,
            height: Math.random() * 6 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "rgba(251,191,36,0.6)" : i % 3 === 1 ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.3)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// ─── Countdown Timer Component ────────────────────────────────
function CountdownTimer({ target, label }: { target: string; label: string }) {
  const calcTimeLeft = () => {
    const diff = new Date(target).getTime() - Date.now()
    if (diff <= 0) return { hari: 0, jam: 0, menit: 0, detik: 0, selesai: true }
    return {
      hari: Math.floor(diff / (1000 * 60 * 60 * 24)),
      jam: Math.floor((diff / (1000 * 60 * 60)) % 24),
      menit: Math.floor((diff / (1000 * 60)) % 60),
      detik: Math.floor((diff / 1000) % 60),
      selesai: false,
    }
  }
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft)

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [target])

  const pads = (n: number) => String(n).padStart(2, "0")

  const units = [
    { val: timeLeft.hari, label: "HARI" },
    { val: timeLeft.jam, label: "JAM" },
    { val: timeLeft.menit, label: "MENIT" },
    { val: timeLeft.detik, label: "DETIK" },
  ]

  if (timeLeft.selesai) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-3 bg-green-500/20 border border-green-400/40 text-green-300 font-bold text-xl px-8 py-4 rounded-2xl backdrop-blur-sm">
          <CheckCircle2 size={24} />
          Pendaftaran Sekarang Dibuka!
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className="flex flex-col items-center gap-5"
    >
      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-yellow-300 font-bold text-xs md:text-sm uppercase tracking-[0.15em]">{label}</span>
      </div>

      {/* Boxes */}
      <div className="flex items-center gap-2 md:gap-3">
        {units.map((unit, i) => (
          <React.Fragment key={unit.label}>
            {i > 0 && (
              <div className="flex flex-col gap-1.5 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
            )}
            <motion.div
              key={`${unit.label}-${unit.val}`}
              className="flex flex-col items-center"
            >
              <div
                className="flex items-center justify-center rounded-xl md:rounded-2xl font-black text-white"
                style={{
                  width: "clamp(60px, 14vw, 90px)",
                  height: "clamp(64px, 15vw, 96px)",
                  fontSize: "clamp(1.6rem, 5vw, 2.5rem)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                  letterSpacing: "-0.02em",
                }}
              >
                {pads(unit.val)}
              </div>
              <span className="text-white/50 text-[10px] md:text-xs font-bold mt-2 tracking-widest">{unit.label}</span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 80])

  const [portalStatus, setPortalStatus] = useState<any>(null)
  const [dbStats, setDbStats] = useState<any>(null)
  const [feedbackList, setFeedbackList] = useState<any[]>([])

  useEffect(() => {
    PortalAPI.getStatus().then(setPortalStatus).catch(() => {})
    FeedbackAPI.getStats().then(setDbStats).catch(() => {})
  }, [])

  const countdownAktif = portalStatus?.countdown_aktif === true
  const countdownTarget = portalStatus?.countdown_target || ""
  const countdownLabel = portalStatus?.countdown_label || "PENDAFTARAN AKAN DIBUKA SEGERA"

  // ── Admin Secret: klik logo 3x dalam 2 detik ──
  const [adminClickCount, setAdminClickCount] = useState(0)
  const adminClickTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleLogoClick = () => {
    setAdminClickCount(prev => {
      const next = prev + 1
      if (adminClickTimer.current) clearTimeout(adminClickTimer.current)
      if (next >= 3) return 3
      adminClickTimer.current = setTimeout(() => setAdminClickCount(0), 2000)
      return next
    })
  }

  const videos = [
    { id: "K9Wailk3Yzo", title: "Pelepasan Mudik Gratis", desc: "Momen bersejarah pelepasan armada oleh Gubernur Aceh." },
    { id: "8eQx0qiOOFw", title: "Recap Mudik Gratis 2025", desc: "Ribuan pemudik berbagi cerita kebersamaan." },
    { id: "6HjG4UMIBoc", title: "Persiapan & Panduan", desc: "Tips dan panduan lengkap sebelum berangkat." },
  ]

  const steps = [
    { num: "01", icon: <ClipboardCheck size={28} />, title: "Daftar Akun", desc: "Buat akun dengan NIK dan data diri yang valid." },
    { num: "02", icon: <ShieldCheck size={28} />, title: "Isi Formulir", desc: "Lengkapi data keluarga dan pilih rute tujuan." },
    { num: "03", icon: <Clock size={28} />, title: "Tunggu Verifikasi", desc: "Tim Dishub memverifikasi data." },
    { num: "04", icon: <CheckCircle2 size={28} />, title: "Berangkat!", desc: "Download tiket dan hadir sesuai jadwal keberangkatan." },
  ]

  return (
    <main className="min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif", background: "#f8fafc" }}>

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative flex flex-col" style={{ minHeight: "100svh" }}>
        {/* BG Layers */}
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <div className="absolute inset-0 bg-cover bg-center md:hidden" style={{ backgroundImage: `url(${heroMobile})` }} />
          <div className="absolute inset-0 hidden bg-cover bg-center md:block" style={{ backgroundImage: `url(${heroDesktop})` }} />
        </motion.div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/92 via-[#0a1628]/75 to-[#0a1628]/40" />
        {/* Decorative mesh */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(59,130,246,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,158,11,0.3) 0%, transparent 50%)`
        }} />
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        <Particles />

        {/* Navbar */}
        <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 pt-6 pb-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div
              onClick={handleLogoClick}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 md:px-4 md:py-2 cursor-pointer select-none"
            >
              <img src={logoseulamat} alt="Seulamat" className="h-8 md:h-9 w-auto drop-shadow-lg" />
              <div className="w-px h-5 bg-white/20" />
              <img src={logoPemprov} alt="Pemprov Aceh" className="h-7 md:h-9 w-auto drop-shadow" />
              <div className="w-px h-5 bg-white/20" />
              <img src={logoDishub} alt="Dishub Aceh" className="h-7 md:h-9 w-auto drop-shadow" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
            <motion.a
              href="/bantuan"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="hidden md:flex items-center text-white text-sm font-semibold transition px-4 py-2 rounded-xl"
              style={{
                background: "rgba(15, 25, 50, 0.55)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}
            >
              Bantuan
            </motion.a>

            {!countdownAktif && (
              <motion.button
                onClick={() => navigate("/login")}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.96 }}
                className="hidden md:flex items-center gap-2 text-white text-sm font-bold rounded-xl px-5 py-2.5 transition"
                style={{
                  background: "rgba(59, 130, 246, 0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(147,197,253,0.35)",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
              >
                Login
              </motion.button>
            )}

            {adminClickCount >= 3 && (
              <motion.a
                href="/admin/login"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.96 }}
                className="hidden md:flex items-center text-white text-xs font-semibold transition px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(15, 25, 50, 0.45)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                Admin
              </motion.a>
            )}
          </motion.div>
        </nav>

        {/* ══ MOBILE LAYOUT ══ */}
        <div className="relative z-10 md:hidden flex flex-col flex-1">

          {/* Logo Mudik Gratis pojok kanan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex justify-end px-5 pt-1 pb-0"
          >
            <img
              src={logoMudikGratis}
              alt="Mudik Gratis"
              className="h-20 w-auto"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.7))" }}
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="px-6 pt-2 pb-3"
          >
            <div className="inline-flex items-center gap-2 bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-sm">
              <Sparkles size={12} />
              Program Resmi Pemerintah Aceh 2026
            </div>
          </motion.div>

          {/* ✅ FIX iPhone: Foto Gub & Wagub — object-contain agar tidak crop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative w-full flex justify-center"
          >
            <img
              src={gubWagub}
              alt="H. Muzakir Manaf & H. Fadhlullah, S.E."
              className="w-full max-w-sm h-auto object-contain"
              style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))" }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(10,22,40,0.85) 0%, transparent 100%)" }} />
          </motion.div>

          {/* Teks + Tombol */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="px-6 pt-3 pb-10"
          >
            <h1 className="text-4xl font-extrabold text-white leading-[1.05] tracking-tight mb-4">
              Mudik{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Gratis</span>
              <br />
              <span className="text-blue-300">Pemerintah Aceh</span>
            </h1>
            <p className="text-base text-white/75 leading-relaxed mb-8">
              Seulamat Bak Jalan, Bahgia di Gampoeng
            </p>

            {countdownAktif && countdownTarget ? (
              <div className="py-2">
                <CountdownTimer target={countdownTarget} label={countdownLabel} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => navigate("/register")}
                  whileTap={{ scale: 0.97 }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-4 text-white font-bold text-base shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-3 w-full"
                >
                  <span className="relative z-10">Daftar Sekarang</span>
                  <ArrowRight size={18} className="relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
                <motion.button
                  onClick={() => navigate("/login")}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 px-8 py-4 text-white font-bold text-base hover:bg-white/20 transition flex items-center justify-center gap-2 w-full"
                >
                  Login Peserta
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>

        {/* ══ DESKTOP LAYOUT ══ */}
        <div className="relative z-10 flex-1 hidden md:flex items-center">
          <div className="max-w-6xl mx-auto px-12 grid md:grid-cols-2 gap-12 items-end py-0 w-full">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="pb-16"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5 backdrop-blur-sm"
              >
                <Sparkles size={12} />
                Program Resmi Pemerintah Aceh 2026
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="flex justify-start mb-5"
              >
                <img
                  src={logoMudikGratis}
                  alt="Mudik Gratis"
                  className="h-28 w-auto"
                  style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))" }}
                />
              </motion.div>

              <h1 className="text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
                Mudik{" "}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Gratis</span>
                  <motion.span
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  />
                </span>
                <br />
                <span className="text-blue-300">Pemerintah Aceh</span>
              </h1>
              <p className="text-lg text-white/75 max-w-md leading-relaxed mb-10">
                Seulamat Bak Jalan, Bahgia di Gampoeng
              </p>

              <div className="flex flex-row gap-4">
                {countdownAktif && countdownTarget ? (
                  <CountdownTimer target={countdownTarget} label={countdownLabel} />
                ) : (
                  <>
                    <motion.button
                      onClick={() => navigate("/register")}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-4 text-white font-bold text-base shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-3"
                    >
                      <span className="relative z-10">Daftar Sekarang</span>
                      <motion.span className="relative z-10 group-hover:translate-x-1 transition-transform">
                        <ArrowRight size={18} />
                      </motion.span>
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                    <motion.button
                      onClick={() => navigate("/login")}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 px-8 py-4 text-white font-bold text-base hover:bg-white/20 transition flex items-center justify-center gap-2"
                    >
                      Login Peserta
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>

            {/* RIGHT — Foto Gubernur & Wagub */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex justify-center items-end relative"
              style={{ minHeight: "480px" }}
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full blur-3xl"
                style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.3) 0%, transparent 70%)" }} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-2xl"
                style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.15) 0%, transparent 70%)" }} />
              <motion.img
                src={gubWagub}
                alt="H. Muzakir Manaf & H. Fadhlullah, S.E. — Gubernur & Wakil Gubernur Aceh"
                className="relative z-10 w-full max-w-md h-auto object-contain object-bottom"
                style={{ filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.55))", maxHeight: "520px" }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

          </div>
        </div>

        {/* Scroll indicator — desktop only */}
        <motion.div
          className="relative z-10 hidden md:flex justify-center pb-8"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown size={28} className="text-white/30" />
        </motion.div>
      </section>

      {/* ══════════════════ BANNER PORTAL INFO ══════════════════ */}
      {portalStatus && (
        <AnimatePresence>
          {!portalStatus.sesi_aktif && portalStatus.pesan_home && (
            <motion.section
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-5"
            >
              <div className="max-w-5xl mx-auto flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">📢 Informasi Program</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{portalStatus.pesan_home}</p>
                </div>
              </div>
            </motion.section>
          )}
          {portalStatus.sesi_aktif && !portalStatus.portal_register_open && portalStatus.pesan_home && (
            <motion.section
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border-b border-amber-200 px-6 py-4"
            >
              <div className="max-w-5xl mx-auto flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} className="text-amber-600" />
                </div>
                <p className="text-amber-800 text-sm font-medium">{portalStatus.pesan_home}</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      )}

      {/* ══════════════════ SPONSOR ══════════════════ */}
      <section className="py-12 bg-white border-y border-slate-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-4 mb-10 justify-center"
          >
            <div className="h-px flex-1 max-w-32 bg-gradient-to-r from-transparent to-slate-200" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Didukung Oleh</p>
            <div className="h-px flex-1 max-w-32 bg-gradient-to-l from-transparent to-slate-200" />
          </motion.div>

          {/* ROW 1 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-8"
          >
            {[
              { src: logoJasaRaharja,  alt: "Jasa Raharja",                          h: "h-8 md:h-10",  wide: true },
              { src: logoBaraMifa,     alt: "Bara Energi Lestari & Mifa Bersaudara", h: "h-10 md:h-14", wide: true },
              { src: logoBankAceh,     alt: "Bank Aceh Syariah",                     h: "h-9 md:h-11",  wide: true },
              { src: logoBankMustaqim, alt: "Bank Mustaqim Aceh",                    h: "h-12 md:h-16"              },
              { src: logoBSI,          alt: "Bank Syariah Indonesia",                h: "h-9 md:h-11"               },
            ].map((logo, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={`${logo.h} ${logo.wide ? "w-auto max-w-[140px] md:max-w-[180px]" : "w-auto"} object-contain`}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="border-t border-slate-100 mb-8" />

          {/* ROW 2 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-8"
          >
            {[
              { src: logoBI,           alt: "Bank Indonesia",           h: "h-10 md:h-12", wide: true },
              { src: logoSkkPertamina, alt: "SKK Migas & Pertamina EP", h: "h-10 md:h-12", wide: true },
              { src: logoBankBCA,      alt: "Bank BCA",                 h: "h-10 md:h-12", wide: true },
              { src: logoBpmaMedco,    alt: "BPMA & MedcoEnergi",       h: "h-12 md:h-16", wide: true },
              { src: logoSemenAndalas, alt: "Semen Andalas Indonesia",  h: "h-8 md:h-10",  wide: true },

            ].map((logo, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={`${logo.h} ${logo.wide ? "w-auto max-w-[150px] md:max-w-[190px]" : "w-auto"} object-contain`}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="border-t border-slate-100 mb-8" />

          {/* ROW 3 — Fibertera, AJB, PEMA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mb-8"
          >
            {[
              { src: logoBankBukopin,  alt: "Bank Bukopin",           h: "h-8 md:h-10",  wide: true },
              { src: logofibertera, alt: "Fibertera",                 h: "h-12 md:h-12"               },
              { src: logoAJB,       alt: "PT. Agrabudi Jasa Bersama", h: "h-12 md:h-12"               },
              { src: logoPIM,       alt: "PIM",                       h: "h-12 md:h-12"               },
              { src: logoPEMA,      alt: "PEMA Pembangunan Aceh",     h: "h-12 md:h-11",  wide: true   },
              { src: logoPN,        alt: "Perkebunan Nusantara",      h: "h-10 md:h-12", wide: true   },
            ].map((logo, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={`${logo.h} ${logo.wide ? "w-auto max-w-[150px] md:max-w-[190px]" : "w-auto"} object-contain`}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="border-t border-slate-100 mb-8" />

          {/* ROW 4 — ASDP, Pelindo, PLN, Perkebunan Nusantara */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {[
              { src: logoAsdp,    alt: "ASDP Indonesia Ferry",  h: "h-10 md:h-12"               },
              { src: logoPelindo, alt: "Pelindo",                h: "h-8 md:h-10",  wide: true   },
              { src: logoPLN,     alt: "PLN",                    h: "h-9 md:h-11",  wide: true   },

            ].map((logo, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={`${logo.h} ${logo.wide ? "w-auto max-w-[150px] md:max-w-[190px]" : "w-auto"} object-contain`}
                />
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
              <Sparkles size={12} /> Cara Pendaftaran
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              4 Langkah Mudah<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Untuk Ikut Mudik Gratis</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100 z-0" />
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                viewport={{ once: true }}
                className="relative z-10 group"
              >
                <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 h-full">
                  <span className="text-4xl font-black text-blue-200 tracking-[0.05em] mb-4 block">{step.num}</span>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-12">
            {!countdownAktif && (
              <button
                onClick={() => navigate("/register")}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300"
              >
                Mulai Pendaftaran <ArrowRight size={18} />
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ ABOUT / INFO ══════════════════ */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-7">
              <Sparkles size={12} /> Tentang Seulamat
            </span>

            <div className="relative flex md:hidden items-center justify-center mb-8">
              <div className="w-52 h-52 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 flex items-center justify-center">
                <motion.img
                  src={logoseulamat}
                  alt="Seulamat"
                  className="w-40 h-40 object-contain drop-shadow-xl"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="absolute w-52 h-52 rounded-full bg-blue-400/20 animate-ping" style={{ animationDuration: "3s" }} />
            </div>

            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              <strong>SEULAMAT</strong> — Sistem Elektronik Layanan Mudik Aceh Terpadu — hadir sebagai solusi digital untuk program mudik gratis yang aman, terorganisir, dan transparan bagi seluruh warga Aceh.
            </p>
            <div className="flex flex-col gap-4">
              {[
                "Pendaftaran online dimana saja",
                "Verifikasi data mudah dan transparan",
                "Tiket digital bisa di-download langsung",
                "Mudik jadi aman dan nyaman",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3 text-slate-700"
                >
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-green-600" />
                  </div>
                  <span className="font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="hidden md:flex items-center justify-center"
          >
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute w-80 h-80 rounded-full bg-blue-400 blur-3xl"
                initial={{ opacity: 0.4, scale: 1 }}
                animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative w-96 h-96 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 flex items-center justify-center">
                <motion.img
                  src={logoseulamat}
                  alt="Seulamat"
                  className="w-72 h-72 object-contain drop-shadow-xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ VIDEO GALLERY ══════════════════ */}
      <section className="py-24 px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.3) 0%, transparent 70%)"
        }} />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Galeri{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Mudik Gratis</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {videos.map((vid, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <div className="relative pt-[56.25%] bg-black">
                  {activeVideo === i ? (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${vid.id}?autoplay=1`}
                      title={vid.title}
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <img
                        src={`https://img.youtube.com/vi/${vid.id}/maxresdefault.jpg`}
                        alt={vid.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={() => setActiveVideo(i)}
                          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl hover:bg-red-500 hover:scale-110 transition-all"
                        >
                          <Play size={24} fill="white" className="text-white ml-1" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-white text-base mb-1.5">{vid.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{vid.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ CTA BANNER ══════════════════ */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <Particles />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
              Siap Pulang Kampung<br />Bersama Kami?
            </h2>
            <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
              Jangan sampai kehabisan kuota. Daftar sekarang dan amankan tempat dudukmu!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!countdownAktif && (
                <motion.button
                  onClick={() => navigate("/register")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white text-blue-700 font-extrabold px-10 py-4 rounded-2xl text-base shadow-2xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                >
                  Daftar Gratis Sekarang <ArrowRight size={18} />
                </motion.button>
              )}
              <button
                onClick={() => navigate("/bantuan")}
                className="border-2 border-white/30 text-white font-bold px-8 py-4 rounded-2xl text-base hover:bg-white/10 transition"
              >
                Hubungi Kami
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ ULASAN PENGGUNA ══════════════════ */}
      {dbStats && dbStats.rata_rata > 0 && (
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
                <Star size={12} fill="currentColor" /> Ulasan Pengguna
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Apa Kata{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Pemudik?</span>
              </h2>
              <p className="text-slate-500 mt-4 max-w-md mx-auto">Penilaian pemudik program mudik gratis Pemerintah Aceh.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-10 max-w-xs mx-auto"
            >
              <p className="text-7xl font-black text-amber-500">{dbStats.rata_rata}</p>
              <div className="flex justify-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={24} fill={s <= Math.round(dbStats.rata_rata) ? "#f59e0b" : "none"} className={s <= Math.round(dbStats.rata_rata) ? "text-amber-400" : "text-slate-300"} />
                ))}
              </div>
              <p className="text-slate-500 text-sm font-medium">dari 5 bintang</p>
              {dbStats.total_ulasan > 0 && (
                <p className="text-slate-400 text-xs">{dbStats.total_ulasan.toLocaleString("id-ID")} ulasan</p>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="bg-[#060d1f] text-white pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <img src={logoPemprov} alt="Aceh" className="h-10 w-auto" />
                <div className="w-px h-8 bg-white/10" />
                <img src={logoDishub} alt="Dishub" className="h-10 w-auto" />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Program Mudik Gratis Pemerintah Aceh melalui Dinas Perhubungan Aceh untuk memfasilitasi masyarakat pulang kampung dengan aman dan nyaman.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[
                ].map((social, idx) => (
                  <a key={idx} href={social.href} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-500 transition-colors">
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Tautan Cepat</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="/" className="hover:text-blue-400 transition-colors">Beranda</a></li>
                {!countdownAktif && (
                  <li><a href="/register" className="hover:text-blue-400 transition-colors">Pendaftaran</a></li>
                )}
                <li><a href="/bantuan" className="hover:text-blue-400 transition-colors">Pusat Bantuan</a></li>
                {!countdownAktif && (
                  <li><a href="/login" className="hover:text-blue-400 transition-colors">Login Peserta</a></li>
                )}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-bold text-lg mb-6">Hubungi Kami</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <span>Jl. Mayjend T. Hamzah Bendahara No.52, Kuta Alam, Banda Aceh, 23121.</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-400 shrink-0" />
                  <span>(0651) 22110</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-blue-400 shrink-0" />
                  <span>dishub@acehprov.go.id</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Dinas Perhubungan Aceh. Hak Cipta Dilindungi.
            </p>
            <p className="text-slate-500 text-sm"></p>
          </div>
        </div>
      </footer>
    </main>
  )
}
