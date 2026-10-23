import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import heroMobile from "../assets/hero-mobile.png"
import heroDesktop from "../assets/hero-dekstop.png"
import Modal from "../components/Modal"
import ModalLupaPassword from "../components/ModalLupaPassword"
import { API, PortalAPI } from "../lib/api"
import { Eye, EyeOff, Lock, LogIn, XCircle, ArrowLeft, AlertTriangle } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalMsg, setModalMsg] = useState("")
  const [loading, setLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [portalStatus, setPortalStatus] = useState<any>(null)
  const [portalLoading, setPortalLoading] = useState(true)

  useEffect(() => {
    PortalAPI.getStatus().then(setPortalStatus).catch(() => setPortalStatus(null)).finally(() => setPortalLoading(false))
  }, [])

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")))
    } catch { return null }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setModalTitle("Login Gagal"); setModalMsg("Email dan password wajib diisi."); setShowModal(true); return }
    setLoading(true)
    try {
      const res = await fetch(API.LOGIN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setModalTitle("Login Gagal"); setModalMsg(data?.error || data?.message || "Email atau password salah."); setShowModal(true); return }
      if (data?.token) {
        localStorage.setItem("token", data.token)
        if (data.nama) localStorage.setItem("nama", data.nama)
        const decoded = parseJwt(data.token)
        const userId = data.id_user || data.userId || decoded?.id_user || decoded?.userId || decoded?.sub || decoded?.upn
        localStorage.setItem("userId", userId ? String(userId) : email)
        setModalTitle("Login Berhasil"); setModalMsg(`Selamat datang kembali, ${data.nama ?? "User"}!`); setShowModal(true)
        setTimeout(() => navigate("/dashboard"), 1500)
      } else throw new Error("Token tidak diterima dari server.")
    } catch (err: any) {
      setModalTitle("Login Gagal"); setModalMsg(err.message || "Tidak dapat terhubung ke server."); setShowModal(true)
    } finally { setLoading(false) }
  }

  // Portal penuh ditutup: sesi tidak aktif DAN register tutup → sembunyikan form login
  const portalTutupTotal = portalStatus && !portalStatus.sesi_aktif && !portalStatus.portal_register_open

  return (
    <main className="min-h-screen">
      <section className="relative min-h-screen px-5">
        <div className="absolute inset-0 bg-cover bg-center md:hidden" style={{ backgroundImage: `url(${heroMobile})` }} />
        <div className="absolute inset-0 hidden bg-cover bg-center md:block" style={{ backgroundImage: `url(${heroDesktop})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/90 to-blue-950/95" />

        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="w-full max-w-5xl py-10">
            <button onClick={() => navigate("/")} className="mb-8 text-sm text-white/80 hover:text-white flex items-center gap-2 transition">
              <ArrowLeft size={16} /> Kembali ke Beranda
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="bg-white rounded-3xl shadow-2xl px-8 py-10">

                {/* ═══ PORTAL TUTUP TOTAL ═══ */}
                {!portalLoading && portalTutupTotal ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                      <XCircle size={36} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-3">Portal Ditutup</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      {portalStatus?.pesan_register_tutup || "Login dan pendaftaran saat ini tidak tersedia."}
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
                      Login tidak dapat dilakukan saat portal penuh ditutup.
                    </div>
                    <button onClick={() => navigate("/")} className="mt-6 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
                      Kembali ke Beranda
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Banner peringatan jika register tutup tapi login masih bisa */}
                    {!portalLoading && portalStatus && !portalStatus.portal_register_open && portalStatus.sesi_aktif && (
                      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-amber-700 text-xs font-medium leading-relaxed">
                          {portalStatus.pesan_register_tutup || "Pendaftaran akun baru ditutup."} Anda masih bisa login jika sudah memiliki akun.
                        </p>
                      </div>
                    )}

                    <div className="mb-8">
                      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <LogIn className="text-blue-600" /> Login Akun
                      </h1>
                      <p className="mt-2 text-slate-500">Masuk untuk mengakses layanan mudik gratis.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                        <input type="email" placeholder="nama@email.com" required onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} placeholder="••••••••" required onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        <div className="mt-2 text-right">
                          <button type="button" onClick={() => setShowResetModal(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition hover:underline">Lupa password?</button>
                        </div>
                      </div>
                      <button type="submit" disabled={loading}
                        className={`w-full mt-2 rounded-xl py-3.5 text-white font-bold text-lg shadow-lg shadow-blue-200 transition transform active:scale-95 ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                        {loading ? "Memproses..." : "Masuk Sekarang"}
                      </button>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 py-3 rounded-lg border border-slate-100">
                      <Lock size={14} /> Koneksi Anda terenkripsi dan aman.
                    </div>

                    {/* Sembunyikan link daftar jika register tutup */}
                    {(!portalStatus || portalStatus.portal_register_open) && (
                      <p className="mt-6 text-center text-sm text-slate-600">
                        Belum punya akun?{" "}
                        <span onClick={() => navigate("/register")} className="text-blue-600 font-bold cursor-pointer hover:underline">Daftar disini</span>
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="hidden md:block text-white space-y-8 px-6">
                <div>
                  <h2 className="text-4xl font-extrabold mb-4 leading-tight">Selamat Datang Kembali!</h2>
                  <p className="text-blue-100 text-lg leading-relaxed">Silakan login untuk memantau status pendaftaran, mengunduh tiket, atau mendaftarkan anggota keluarga.</p>
                </div>
                <div className="space-y-4">
                  {[{ title: "Cek Status", desc: "Pantau verifikasi berkas secara realtime." }, { title: "Unduh Tiket", desc: "Dapatkan e-tiket resmi setelah disetujui." }, { title: "Kelola Keluarga", desc: "Daftarkan hingga 6 anggota keluarga." },{ title: "Pantau Terus!", desc: "Pendaftaran ditutup sewaktu-waktu ketika kuota penuh." }].map((item, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-blue-900 font-bold text-xl shrink-0">✓</div>
                      <div><h3 className="font-bold text-lg">{item.title}</h3><p className="text-sm text-blue-100">{item.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal open={showModal} title={modalTitle} message={modalMsg} onClose={() => { setShowModal(false); if (modalTitle === "Login Berhasil") navigate("/dashboard") }} />
      {showResetModal && <ModalLupaPassword onClose={() => setShowResetModal(false)} />}
    </main>
  )
}