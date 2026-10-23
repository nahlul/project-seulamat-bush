import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FeedbackAPI, API } from "../lib/api"
import {
  Star, Check, X, Trash2, ArrowLeft, MessageSquare,
  ThumbsUp, Eye, EyeOff, Loader2, RefreshCw, TrendingUp,
  ToggleLeft, ToggleRight, Bell
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useNotification } from "../context/NotificationContext"
import { invalidatePortalCache } from "../hooks/usePortalStatus"

type Feedback = {
  id: number
  rating: number
  komentar: string
  nama_pengirim: string
  dikirim_at: string
  disetujui: boolean
}

export default function AdminFeedback() {
  const navigate     = useNavigate()
  const { addNotif } = useNotification()

  const [list, setList]       = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<"semua" | "disetujui" | "pending">("semua")
  const [stats, setStats]     = useState({ total: 0, disetujui: 0, pending: 0, avg: 0 })
  const [actionId, setActionId] = useState<number | null>(null)

  // ── Status portal ulasan (dari backend) ──────────────────────────
  const [ulasanOpen, setUlasanOpen]       = useState(false)
  const [portalLoading, setPortalLoading] = useState(true)
  const [toggling, setToggling]           = useState(false)

  const token     = localStorage.getItem("token") || ""
  const adminNama = localStorage.getItem("nama")?.replace(/"/g, "") || "Admin"

  // ── Load portal status ────────────────────────────────────────────
  const loadPortalStatus = async () => {
    setPortalLoading(true)
    try {
      const res  = await fetch(`${API.BASE_URL}/api/portal/status`)
      const data = await res.json()
      setUlasanOpen(!!data.ulasan_open)
    } catch (e) {
      console.error("Gagal load portal status", e)
    } finally {
      setPortalLoading(false)
    }
  }

  // ── Toggle ulasan_open ────────────────────────────────────────────
  const handleToggleUlasan = async () => {
    if (!confirm(`Yakin ingin ${ulasanOpen ? "MENUTUP" : "MEMBUKA"} portal ulasan?`)) return
    setToggling(true)
    try {
      const res = await fetch(`${API.BASE_URL}/api/portal/ulasan`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ open: !ulasanOpen, admin: adminNama }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const nowOpen = !ulasanOpen
      setUlasanOpen(nowOpen)
      invalidatePortalCache()
      addNotif({
        type: "portal",
        title: `Portal Ulasan ${nowOpen ? "DIBUKA" : "DITUTUP"}`,
        message: `Portal ulasan telah ${nowOpen ? "dibuka" : "ditutup"} oleh ${adminNama}.`,
        link: "/admin/feedback",
      })
    } catch (e: any) {
      alert("Gagal: " + e.message)
    } finally {
      setToggling(false)
    }
  }

  useEffect(() => {
    if (!token) { navigate("/admin/login"); return }
    loadPortalStatus()
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await FeedbackAPI.getAdmin()
      if (Array.isArray(res)) {
        setList(res)
        const disetujui = res.filter((f: Feedback) => f.disetujui).length
        const avg = res.length > 0
          ? res.reduce((a: number, f: Feedback) => a + f.rating, 0) / res.length : 0
        setStats({ total: res.length, disetujui, pending: res.length - disetujui, avg: Math.round(avg * 10) / 10 })
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSetujui = async (id: number, disetujui: boolean) => {
    setActionId(id)
    try {
      await FeedbackAPI.setujui(id, disetujui)
      const target = list.find(f => f.id === id)
      setList(prev => prev.map(f => f.id === id ? { ...f, disetujui } : f))
      setStats(prev => ({
        ...prev,
        disetujui: prev.disetujui + (disetujui ? 1 : -1),
        pending:   prev.pending   + (disetujui ? -1 : 1),
      }))
      const nama = target?.nama_pengirim || "Anonim"
      addNotif(disetujui
        ? { type: "feedback", title: "Feedback Disetujui", message: `Feedback dari "${nama}" telah disetujui.`, link: "/admin/feedback" }
        : { type: "feedback", title: "Persetujuan Dicabut", message: `Feedback dari "${nama}" tidak lagi tampil publik.`, link: "/admin/feedback" }
      )
    } catch (err) { alert("Gagal: " + err) }
    finally { setActionId(null) }
  }

  const handleHapus = async (id: number) => {
    if (!confirm("Hapus feedback ini?")) return
    setActionId(id)
    const target = list.find(f => f.id === id)
    try {
      await FeedbackAPI.hapus(id)
      setList(prev => prev.filter(f => f.id !== id))
      const nama = target?.nama_pengirim || "Anonim"
      addNotif({ type: "feedback", title: "Feedback Dihapus", message: `Feedback dari "${nama}" telah dihapus permanen.`, link: "/admin/feedback" })
    } catch (err) { alert("Gagal: " + err) }
    finally { setActionId(null) }
  }

  const filtered = list.filter(f => {
    if (filter === "disetujui") return f.disetujui
    if (filter === "pending")   return !f.disetujui
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-5 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/dashboard")}
              className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition text-white">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                <MessageSquare size={20} /> Manajemen Feedback
              </h1>
              <p className="text-blue-200 text-xs mt-0.5">Review, setujui ulasan, dan kontrol portal feedback user</p>
            </div>
          </div>
          <button onClick={() => { loadPortalStatus(); loadData() }}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Kontrol Portal Ulasan ──────────────────────────────── */}
        <div className={`rounded-2xl border-2 p-5 mb-8 shadow-sm transition-all ${
          ulasanOpen ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon + info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                ulasanOpen ? "bg-green-100" : "bg-slate-100"
              }`}>
                <Bell size={22} className={ulasanOpen ? "text-green-600" : "text-slate-400"} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                  Kontrol Popup Ulasan di Dashboard User
                  {portalLoading ? (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Memuat...</span>
                  ) : ulasanOpen ? (
                    <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold">AKTIF</span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">NONAKTIF</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ulasanOpen
                    ? "Popup otomatis + floating button + banner inline aktif di dashboard user."
                    : "Popup otomatis, floating button, dan banner inline tidak tampil ke user saat ini."}
                </p>
              </div>
            </div>

            {/* Toggle button */}
            <button
              onClick={handleToggleUlasan}
              disabled={toggling || portalLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition shrink-0 disabled:opacity-60 ${
                ulasanOpen
                  ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                  : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
              }`}
            >
              {toggling ? <Loader2 size={15} className="animate-spin" />
                : ulasanOpen ? <><ToggleRight size={16} /> Tutup Portal Ulasan</>
                : <><ToggleLeft size={16} /> Buka Portal Ulasan</>}
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 text-xs text-slate-500 bg-white border border-slate-100 rounded-xl p-3 flex items-start gap-2">
            <MessageSquare size={13} className="mt-0.5 shrink-0 text-blue-400" />
            <span>
              Saat <strong>AKTIF</strong>: (1) popup ulasan muncul otomatis 1.5 detik setelah dashboard dibuka
              (hanya untuk user yang belum pernah memberi ulasan), (2) floating button ⭐ muncul di pojok kanan bawah,
              dan (3) banner inline muncul di area konten dashboard. Saat <strong>NONAKTIF</strong>: ketiganya disembunyikan sepenuhnya.
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Feedback",  value: stats.total,      icon: <MessageSquare size={20} />, color: "bg-blue-50 text-blue-600" },
            { label: "Disetujui",       value: stats.disetujui,  icon: <ThumbsUp size={20} />,      color: "bg-green-50 text-green-600" },
            { label: "Menunggu",        value: stats.pending,    icon: <Eye size={20} />,           color: "bg-amber-50 text-amber-600" },
            { label: "Rata-rata",       value: `${stats.avg} ★`, icon: <TrendingUp size={20} />,    color: "bg-purple-50 text-purple-600" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
              <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["semua", "disetujui", "pending"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition capitalize ${
                filter === f ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}>
              {f === "semua" ? `Semua (${stats.total})` : f === "disetujui" ? `Disetujui (${stats.disetujui})` : `Menunggu (${stats.pending})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <MessageSquare size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">Belum ada feedback</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {filtered.map((fb, i) => (
                <motion.div key={fb.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-2xl p-5 shadow-sm border transition ${fb.disetujui ? "border-green-200" : "border-slate-100"}`}>

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-800">{fb.nama_pengirim}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{fb.dikirim_at}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fb.disetujui ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {fb.disetujui ? "Disetujui" : "Menunggu"}
                    </span>
                  </div>

                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={16} fill={s <= fb.rating ? "#f59e0b" : "none"}
                        className={s <= fb.rating ? "text-amber-400" : "text-slate-200"} />
                    ))}
                    <span className="text-xs font-bold text-slate-600 ml-1">{fb.rating}/5</span>
                  </div>

                  {fb.komentar && (
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                      "{fb.komentar}"
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleSetujui(fb.id, !fb.disetujui)} disabled={actionId === fb.id}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${
                        fb.disetujui ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-100"
                      }`}>
                      {actionId === fb.id ? <Loader2 size={14} className="animate-spin" /> : fb.disetujui ? <EyeOff size={14} /> : <Check size={14} />}
                      {fb.disetujui ? "Batalkan" : "Setujui Tampil"}
                    </button>
                    <button onClick={() => handleHapus(fb.id)} disabled={actionId === fb.id}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition border border-red-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}