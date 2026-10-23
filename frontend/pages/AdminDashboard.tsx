import { useEffect, useState, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Users, Bus, MapPin, LogOut, ArrowRight, Map,
  UserCog, BarChart2, UserPlus, Shield, LayoutDashboard,
  MessageSquare, Star, ChevronRight, Menu, X,
  Activity, Clock, CheckCircle2, AlertCircle, Loader2,
  Power, ToggleLeft, ToggleRight, RefreshCw,
  TrendingUp, FileText, Bell, Settings, Zap,
  ArrowUpRight, AlertTriangle, CheckCircle, XCircle
} from "lucide-react"
import { AdminAPI, PortalAPI, API } from "../lib/api"
import { motion, AnimatePresence } from "framer-motion"
import NotificationBell from "../components/admin/NotificationBell"
import { useAdminNotifPoller } from "../hooks/useAdminNotifPoller"

// ─── Sidebar Menu Items ───────────────────────────────────────
const MENU = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { id: "verifikasi", label: "Verifikasi Pendaftar", icon: Users, path: "/admin/verifikasi", badge: "pending" },
  { id: "kendaraan", label: "Armada Bus", icon: Bus, path: "/admin/kendaraan" },
  { id: "rute", label: "Rute & Jadwal", icon: Map, path: "/admin/rute" },
  { id: "manifest", label: "Manifest", icon: BarChart2, path: "/admin/manifest" },
  { id: "tambah", label: "Tambah Penumpang", icon: UserPlus, path: "/admin/tambah-penumpang" },
  { id: "users", label: "Data User", icon: UserCog, path: "/admin/users" },
  { id: "feedback", label: "Feedback", icon: MessageSquare, path: "/admin/feedback" },
  { id: "portal", label: "Kontrol Portal", icon: Shield, path: "/admin/portal", danger: true },
]

interface PortalStatus {
  sesi_aktif: boolean
  portal_register_open: boolean
  portal_mudik_open: boolean
}

// ─── Quick Portal Toggle Widget ───────────────────────────────
function PortalWidget() {
  const [status, setStatus] = useState<PortalStatus | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/status`)
      const data = await res.json()
      setStatus(data)
      setError(false)
    } catch { setError(true) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (key: "sesi" | "register" | "mudik") => {
    if (!status) return
    setLoading(key)
    try {
      if (key === "sesi") await PortalAPI.toggleSesi(!status.sesi_aktif)
      else if (key === "register") await PortalAPI.toggleRegister(!status.portal_register_open)
      else if (key === "mudik") await PortalAPI.toggleMudik(!status.portal_mudik_open)
      await load()
    } catch { alert("Gagal mengubah status portal") }
    finally { setLoading(null) }
  }

  const portals = [
    {
      key: "sesi" as const,
      label: "Sesi Program",
      desc: "Master switch seluruh sistem",
      active: status?.sesi_aktif,
      icon: Power,
      activeColor: "text-emerald-600",
      activeBg: "bg-emerald-50 border-emerald-200",
      inactiveBg: "bg-slate-50 border-slate-200",
    },
    {
      key: "register" as const,
      label: "Portal Register",
      desc: "Pendaftaran akun baru",
      active: status?.portal_register_open,
      icon: UserPlus,
      activeColor: "text-blue-600",
      activeBg: "bg-blue-50 border-blue-200",
      inactiveBg: "bg-slate-50 border-slate-200",
    },
    {
      key: "mudik" as const,
      label: "Portal Mudik",
      desc: "Form pendaftaran mudik",
      active: status?.portal_mudik_open,
      icon: Bus,
      activeColor: "text-violet-600",
      activeBg: "bg-violet-50 border-violet-200",
      inactiveBg: "bg-slate-50 border-slate-200",
    },
  ]

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 flex items-center gap-2">
      <AlertTriangle size={16} /> Gagal memuat status portal.
      <button onClick={load} className="underline font-semibold ml-1">Coba lagi</button>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Zap size={15} className="text-yellow-400" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">Kontrol Portal Cepat</p>
            <p className="text-xs text-slate-400">Toggle langsung tanpa pindah halaman</p>
          </div>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition" title="Refresh status">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Portal Toggles */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {portals.map(p => {
          const Icon = p.icon
          const isLoading = loading === p.key
          const isActive = p.active ?? false

          return (
            <div key={p.key} className={`rounded-xl border-2 p-4 transition-all ${isActive ? p.activeBg : p.inactiveBg}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? "bg-white shadow-sm" : "bg-white/60"}`}>
                  <Icon size={17} className={isActive ? p.activeColor : "text-slate-400"} />
                </div>
                {/* Toggle pill */}
                <button
                  onClick={() => toggle(p.key)}
                  disabled={isLoading || status === null}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${
                    isActive
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                  }`}
                >
                  {isLoading
                    ? <RefreshCw size={11} className="animate-spin" />
                    : isActive
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" /> ON</>
                      : <>OFF</>
                  }
                </button>
              </div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{p.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Emergency actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={async () => {
            if (!confirm("Tutup SEMUA portal sekarang?")) return
            setLoading("all")
            try {
              await PortalAPI.updateSemua({ sesi_aktif: false, portal_register_open: false, portal_mudik_open: false })
              await load()
            } catch { alert("Gagal") } finally { setLoading(null) }
          }}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-xs hover:bg-red-100 transition disabled:opacity-50"
        >
          <XCircle size={14} /> Tutup Semua
        </button>
        <button
          onClick={async () => {
            if (!confirm("Buka SEMUA portal sekarang?")) return
            setLoading("all")
            try {
              await PortalAPI.updateSemua({ sesi_aktif: true, portal_register_open: true, portal_mudik_open: true })
              await load()
            } catch { alert("Gagal") } finally { setLoading(null) }
          }}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition disabled:opacity-50"
        >
          <CheckCircle size={14} /> Buka Semua
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useAdminNotifPoller()

  const namaAdmin = (localStorage.getItem("nama") || "Admin").replace(/"/g, "")
  const initials = namaAdmin.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { navigate("/admin/login"); return }
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoadingStats(true)
    try { setStats(await AdminAPI.getStats()) }
    catch (err) { console.error(err) }
    finally { setLoadingStats(false) }
  }

  const handleLogout = () => { localStorage.clear(); navigate("/admin/login") }
  const currentMenu = MENU.find(m => location.pathname === m.path)?.id || "dashboard"

  // Stat cards config
  const statCards = [
    {
      label: "Total Pendaftar",
      value: stats?.total_masuk ?? 0,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      sub: `${stats?.total_menunggu ?? 0} menunggu verif`,
      subColor: "text-blue-200",
      trend: "+12%",
    },
    {
      label: "Armada Bus",
      value: stats?.total_armada ?? 0,
      icon: Bus,
      color: "from-violet-500 to-violet-600",
      sub: "unit terdaftar",
      subColor: "text-violet-200",
      trend: null,
    },
    {
      label: "Rute Aktif",
      value: stats?.total_rute ?? 0,
      icon: MapPin,
      color: "from-orange-400 to-orange-500",
      sub: "tujuan tersedia",
      subColor: "text-orange-200",
      trend: null,
    },
    {
      label: "Rating Kepuasan",
      value: `${stats?.rata_rata_rating ?? 0}/5`,
      icon: Star,
      color: "from-amber-400 to-yellow-500",
      sub: `${stats?.total_feedback ?? 0} ulasan`,
      subColor: "text-amber-200",
      trend: null,
    },
  ]

  // Status pendaftaran
  const statusItems = [
    { label: "Menunggu Verifikasi", value: stats?.total_menunggu ?? 0, icon: Clock, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconColor: "text-amber-500", action: () => navigate("/admin/verifikasi") },
    { label: "Diterima (H-3)", value: stats?.total_diterima ?? 0, icon: CheckCircle2, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", iconColor: "text-blue-500", action: null },
    { label: "Siap Berangkat", value: stats?.total_siap ?? 0, icon: CheckCircle2, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconColor: "text-emerald-500", action: null },
    { label: "Ditolak", value: stats?.total_ditolak ?? 0, icon: AlertCircle, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", iconColor: "text-red-500", action: null },
  ]

  // Quick nav items (exclude dashboard)
  const quickNav = MENU.filter(m => m.id !== "dashboard" && m.id !== "portal")
  const descriptions: Record<string, string> = {
    verifikasi: "Tinjau & setujui pendaftar baru",
    kendaraan: "Kelola armada & assignment bus",
    rute: "Atur rute dan jadwal keberangkatan",
    manifest: "Lihat & unduh manifest penumpang",
    tambah: "Input penumpang secara manual",
    users: "Kelola akun pengguna",
    feedback: "Tinjau ulasan & kepuasan user",
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>

      {/* ═══ SIDEBAR ═══ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`fixed top-0 left-0 h-full w-60 bg-[#0d1526] z-50 flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static`}>

        {/* Brand */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <Bus size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-extrabold text-sm leading-tight">Seulamat</p>
                <p className="text-slate-400 text-[10px]">Admin Panel 2026</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Admin avatar */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white/5 border border-white/8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-extrabold text-white text-xs shadow">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">{namaAdmin}</p>
            <p className="text-slate-400 text-[10px]">Administrator</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </div>

        {/* Divider label */}
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Navigasi</p>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pb-2">
          {MENU.map(item => {
            const Icon = item.icon
            const isActive = currentMenu === item.id
            return (
              <button key={item.id} onClick={() => { navigate(item.path); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group
                  ${isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                    : item.danger
                      ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      : "text-slate-400 hover:bg-white/6 hover:text-slate-200"
                  }`}>
                <Icon size={15} className={isActive ? "text-white" : item.danger ? "text-red-400" : "text-slate-500 group-hover:text-slate-300"} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight size={12} />}
                {item.id === "verifikasi" && stats?.total_menunggu > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[9px] font-black text-white ml-auto">
                    {stats.total_menunggu}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/6">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition">
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">Dashboard Admin</h1>
              <p className="text-slate-400 text-xs">Program Mudik Gratis 2026 · Dishub Aceh</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadStats}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-blue-50 hover:border-blue-200">
              <Activity size={13} /> Refresh
            </button>
            <div className="bg-slate-800 rounded-xl p-0.5">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5 max-w-[1400px] mx-auto">

            {/* ── Row 1: Stats ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {loadingStats ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4" />
                    <div className="h-7 bg-slate-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                ))
              ) : statCards.map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition group overflow-hidden relative">
                    {/* Background accent */}
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${s.color} opacity-[0.06] transform translate-x-8 -translate-y-8`} />
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-4 shadow-md`}>
                      <Icon size={18} />
                    </div>
                    <p className="text-2xl font-black text-slate-800">{s.value}</p>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label}</p>
                    <p className={`text-[11px] mt-1 ${s.subColor.replace("text-", "text-slate-")} text-slate-400`}>{s.sub}</p>
                  </motion.div>
                )
              })}
            </div>

            {/* ── Row 2: Status + Portal Control ── */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

              {/* Status Pendaftaran (3/5) */}
              {stats && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-5 rounded-full bg-blue-500" />
                      <h3 className="font-bold text-slate-800">Status Pendaftaran</h3>
                    </div>
                    <button onClick={() => navigate("/admin/verifikasi")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline">
                      Lihat Semua <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {statusItems.map((s, i) => {
                      const Icon = s.icon
                      return (
                        <div key={i}
                          onClick={() => s.action?.()}
                          className={`rounded-xl border p-4 ${s.bg} ${s.border} ${s.action ? "cursor-pointer hover:shadow-sm transition-shadow" : ""}`}>
                          <div className="flex items-center justify-between mb-2">
                            <Icon size={16} className={s.iconColor} />
                            {s.action && <ArrowUpRight size={12} className={s.iconColor} />}
                          </div>
                          <p className="text-2xl font-black">{s.value}</p>
                          <p className={`text-xs font-semibold mt-0.5 ${s.text}`}>{s.label}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Mini progress bar */}
                  {stats.total_masuk > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>Progress Verifikasi</span>
                        <span className="font-bold text-slate-700">
                          {Math.round(((stats.total_diterima + stats.total_siap) / stats.total_masuk) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${((stats.total_diterima + stats.total_siap) / stats.total_masuk) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Portal Widget (2/5) */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="xl:col-span-2">
                <PortalWidget />
              </motion.div>
            </div>

            {/* ── Row 3: Quick Navigation ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Navigasi Cepat</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
                {quickNav.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <motion.button key={item.id} onClick={() => navigate(item.path)}
                      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left hover:shadow-md hover:border-blue-100 transition group relative">
                      {item.id === "verifikasi" && stats?.total_menunggu > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[9px] font-black text-white">
                          {stats.total_menunggu > 9 ? "9+" : stats.total_menunggu}
                        </span>
                      )}
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:border-blue-100 transition">
                        <Icon size={17} className="text-slate-500 group-hover:text-blue-600 transition" />
                      </div>
                      <p className="font-bold text-slate-800 text-xs leading-snug">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug hidden sm:block">{descriptions[item.id]}</p>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>


          </div>
        </main>
      </div>
    </div>
  )
}