import { useNavigate } from "react-router-dom"
import { useState } from "react"
import heroMobile from "../assets/hero-mobile.png"
import heroDesktop from "../assets/hero-dekstop.png"
import { AdminAPI } from "../lib/api"
import { Eye, EyeOff, Lock, LogIn } from "lucide-react"

export default function LoginAdmin() {
  const navigate = useNavigate()

  // =====================
  // STATE FORM
  // =====================
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // =====================
  // STATE ERROR & LOADING
  // =====================
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // =====================
  // SUBMIT LOGIN (LOGIC ASLI - JANGAN DIUBAH)
  // =====================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = await AdminAPI.login({ email, password })

      if (data.role === "ADMIN") {
        localStorage.setItem("token", data.token)
        localStorage.setItem("role", data.role)
        localStorage.setItem("nama", data.nama)
        if (data.userId) localStorage.setItem("userId", data.userId)

        navigate("/admin/dashboard")
      } else {
        localStorage.clear()
        throw new Error("⛔ Akses ditolak! Akun bukan administrator.")
      }
    } catch (err: any) {
      setError(err.message || "Gagal terhubung ke server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <section className="relative min-h-screen px-5">

        {/* BACKGROUND */}
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url(${heroMobile})` }}
        />
        <div
          className="absolute inset-0 hidden bg-cover bg-center md:block"
          style={{ backgroundImage: `url(${heroDesktop})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/90 to-blue-950/95" />

        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="w-full max-w-5xl py-10">

            <button
              onClick={() => navigate("/")}
              className="mb-8 text-sm text-white/80 hover:text-white flex items-center gap-2 transition"
            >
              ← Kembali ke Beranda
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

              {/* FORM */}
              <div className="bg-white rounded-3xl shadow-2xl px-8 py-10 animate-fade-in-up">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <LogIn className="text-blue-600" />
                    Login Administrator
                  </h1>
                  <p className="mt-2 text-slate-500">
                    Masuk menggunakan akun administrator
                  </p>
                </div>

                {error && (
                  <div className="mb-6 text-sm bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="Email"
                    placeholder="Isi Email Admin Dengan Benar"
                    required
                    onChange={setEmail}
                  />

                  {/* PASSWORD */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 font-medium
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full mt-2 rounded-xl py-3.5 text-white font-bold text-lg shadow-lg shadow-blue-200 transition transform active:scale-95 ${
                      loading
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {loading ? "Memverifikasi..." : "Masuk Admin"}
                  </button>
                </form>

                {/* TRUST */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-50 py-3 rounded-lg border border-slate-100">
                  <Lock size={14} />
                  Data administrator terenkripsi & aman
                </div>

                <p className="mt-6 text-center text-sm text-slate-600">
                  Bukan admin?{" "}
                  <span
                    onClick={() => navigate("/login")}
                    className="text-blue-600 font-bold cursor-pointer hover:underline"
                  >
                    Login Peserta
                  </span>
                </p>
              </div>

              {/* INFO (DESKTOP) */}
              <div className="hidden md:block text-white space-y-8 px-6">
                <div>
                  <h2 className="text-4xl font-extrabold mb-4 leading-tight">
                    Akses Khusus Admin
                  </h2>
                  <p className="text-blue-100 text-lg leading-relaxed">
                    Halaman ini hanya diperuntukkan bagi administrator resmi
                    untuk mengelola data pendaftaran mudik.
                  </p>
                </div>

                <InfoBox text="Gunakan email admin yang telah terdaftar pada sistem" />
                <InfoBox text="Pastikan password diisi dengan benar" />
                <InfoBox text="Jangan membagikan akun admin kepada siapapun" warning />
              </div>

            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

// =====================
// INPUT (STYLE LOGIN)
// =====================
function Input({
  label,
  type = "text",
  placeholder,
  required = false,
  onChange,
}: {
  label: string
  type?: string
  placeholder: string
  required?: boolean
  onChange: (val: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
      />
    </div>
  )
}

// =====================
// INFO BOX (LOGIN STYLE)
// =====================
function InfoBox({
  text,
  warning = false,
}: {
  text: string
  warning?: boolean
}) {
  return (
    <div
      className={`backdrop-blur-sm border p-4 rounded-2xl flex items-start gap-4 ${
        warning
          ? "bg-yellow-400/20 border-yellow-300 text-yellow-100"
          : "bg-white/10 border-white/20 text-white"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl ${
          warning ? "bg-yellow-400 text-blue-900" : "bg-green-400 text-blue-900"
        }`}
      >
        {warning ? "!" : "✓"}
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  )
}
