import { useNavigate } from "react-router-dom"
import { ArrowLeft, Settings, Wrench, Clock } from "lucide-react"

export default function EditProfile() {
  const navigate = useNavigate()
  const namaAkun = (localStorage.getItem("nama") || "User").replace(/"/g, "")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans flex flex-col">

      {/* TOP BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-40 shadow-sm">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Edit Profil</h1>
          <p className="text-xs text-slate-400">Pengaturan akun</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">

          {/* Icon animasi */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg">
              <Settings size={52} className="text-blue-400 animate-spin" style={{ animationDuration: "8s" }} />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md">
              <Wrench size={20} className="text-white" />
            </div>
          </div>

          {/* Teks */}
          <h2 className="text-2xl font-extrabold text-slate-800 mb-3">
            Fitur Sedang Dikembangkan
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-2">
            Halo, <span className="font-bold text-slate-700">{namaAkun}</span>!
          </p>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Fitur edit profil sedang dalam proses pengembangan dan akan segera tersedia. Tim kami sedang bekerja keras untuk menghadirkan pengalaman terbaik.
          </p>

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left">
            <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-0.5">Akan segera hadir</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Edit nama, nomor HP, foto profil, dan ganti password akan dapat dilakukan setelah fitur ini selesai dikembangkan.
              </p>
            </div>
          </div>

          {/* Tombol kembali */}
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Kembali ke Dashboard
          </button>

        </div>
      </div>
    </div>
  )
}