import React, { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { API } from "../lib/api"
import {
  User, Users, MapPin, Bus, AlertCircle, ArrowLeft,
  UploadCloud, ChevronDown, ChevronUp, CheckCircle,
  Clock, Trash2, Plus, Minus, CalendarDays, FileText, Info, Edit
} from "lucide-react"

/* ================= 1. TYPES ================= */
type RouteType = {
  rute_id: number
  asal?: string
  tujuan: string
  kuota_tersisa: number
  sisa_kuota?: number
  tanggal_keberangkatan?: string
  tanggalKeberangkatan?: string
  tanggal_berangkat?: string
  jam_berangkat?: string
  waktu_berangkat?: string
  nama_bus?: string
  namaBus?: string
  is_portal_open?: boolean
}

type Passenger = {
  id_unik: number
  tipe: "DEWASA" | "ANAK-ANAK" | "BAYI"
  label: string
  bayi: boolean

  nama: string
  nik: string
  noHp: string
  jenisKelamin: string
  tanggalLahir: string

  jenisIdentitas: string
  alamatRumah: string

  fotoBukti: File | null
  fotoPreview?: string
  fotoUrlServer?: string
  isExpanded?: boolean
}

export default function DaftarMudik() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const editId = searchParams.get("edit")
  const isEditMode = !!editId

  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [loadingData, setLoadingData] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingSubmitEvent, setPendingSubmitEvent] = useState<React.FormEvent | null>(null)

  // STATE VALIDASI RIWAYAT & RUTE LOCK
  const [hasExistingAdult, setHasExistingAdult] = useState(false)
  const [lockedRoute, setLockedRoute] = useState(false) // New State for locking route

  // --- HELPER ---
  const getRuteDate = (r: any) => r.tanggal_keberangkatan || r.tanggalKeberangkatan || r.tanggal || r.waktu_berangkat;
  const getRuteBus = (r: any) => r.nama_bus || r.namaBus || r.bus || "Bus Dishub";

  const formatDateTime = (dateRaw: any) => {
    if (!dateRaw) return "Jadwal Menyusul";
    try {
        let dateObj: Date;
        if (Array.isArray(dateRaw)) {
            const month = dateRaw[1] - 1;
            dateObj = new Date(dateRaw[0], month, dateRaw[2], dateRaw[3]||0, dateRaw[4]||0);
        } else {
            dateObj = new Date(dateRaw);
        }
        if (isNaN(dateObj.getTime())) return "Format Error";
        const tgl = dateObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
        const jam = dateObj.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${tgl} • Jam ${jam} WIB`;
    } catch (e) { return "Jadwal Error"; }
  }

  // --- AUTH ---
  const getUserId = () => {
    const uid = localStorage.getItem("userId")
    return uid ? uid.replace(/"/g, "") : null
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return -1
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  useEffect(() => {
    if (!getUserId()) { alert("Anda belum login!"); navigate("/login"); }
  }, [navigate])

  // --- LOAD RUTE ---
  const [routes, setRoutes] = useState<RouteType[]>([])
  const [routeId, setRouteId] = useState("")

  // FIX 3: State untuk dropdown bertingkat (tujuan → tanggal → jam → rute_id)
  const [selectedTujuan, setSelectedTujuan] = useState("")
  const [selectedTanggal, setSelectedTanggal] = useState("")

  useEffect(() => {
    fetch(API.RUTE)
      .then((r) => r.json())
      .then((d) => setRoutes(Array.isArray(d) ? d : d.data || []))
      .catch((e) => console.error("Gagal load rute", e))
  }, [])

  // 🔥 CHECK RIWAYAT, LOAD DATA EDIT & LOCK ROUTE
  useEffect(() => {
    const initData = async () => {
        const userId = getUserId()
        const token = localStorage.getItem("token")
        if (!userId || !token) return

        try {
            // 1. Cek Riwayat (Untuk Validasi Dewasa & Lock Rute)
            const urlRiwayat = API.RIWAYAT || "http://localhost:8080/api/pendaftaran/riwayat"
            const res = await fetch(urlRiwayat, {
                headers: { "Authorization": `Bearer ${token}`, "userId": userId }
            })

            let historyList = []
            if (res.ok) {
                const data = await res.json()
                historyList = Array.isArray(data) ? data : []

                // Filter active bookings only
                const activeBookings = historyList.filter((p: any) => {
                    const status = p.status_pendaftaran || p.status;
                    return status !== 'DITOLAK' && status !== 'DIBATALKAN';
                });

                // Logic: Check for existing Adult
                const adaDewasa = activeBookings.some((p: any) => {
                    const kat = p.kategori || p.kategori_penumpang || "";
                    if (kat === "DEWASA") return true;
                    if (p.tanggal_lahir) {
                        let tglStr = p.tanggal_lahir;
                        if (Array.isArray(tglStr)) {
                            tglStr = `${tglStr[0]}-${String(tglStr[1]).padStart(2, '0')}-${String(tglStr[2]).padStart(2, '0')}`;
                        }
                        if (calculateAge(tglStr) >= 17) return true;
                    }
                    if (!kat && !p.tanggal_lahir) return true;
                    return false;
                });

                if (adaDewasa) {
                    setHasExistingAdult(true)
                }

                // Logic: Lock Route based on first active booking found
                // If user has ANY active booking, they must use that route for new passengers
                if (activeBookings.length > 0 && !isEditMode) {
                    const existingRouteId = activeBookings[0].rute?.rute_id || activeBookings[0].rute_id;
                    if (existingRouteId) {
                        setRouteId(existingRouteId.toString());
                        setLockedRoute(true);
                        // FIX 3: Pre-fill dropdown bertingkat dari rute terkunci
                        const lockedRute = routes.find((r: RouteType) => r.rute_id.toString() === existingRouteId.toString());
                        const historyRoute = activeBookings.find((p: any) => String(p.rute?.rute_id || p.rute_id) === String(existingRouteId));
                        setSelectedTujuan(lockedRute?.tujuan || historyRoute?.rute?.tujuan || historyRoute?.tujuan || "");
                        setSelectedTanggal((lockedRute as any)?.tanggal_berangkat || historyRoute?.rute?.tanggal_berangkat || historyRoute?.tanggal_berangkat || "");
                    }
                }
            }

            // 2. 🔥 JIKA MODE EDIT: AMBIL DATA LAMA
            if (isEditMode) {
                setLoadingData(true)
                const targetData = historyList.find((h:any) => h.pendaftaran_id.toString() === editId)

                if (targetData) {
                    let tglLahir = "";
                    if(Array.isArray(targetData.tanggal_lahir)) {
                         const [y, m, d] = targetData.tanggal_lahir;
                         tglLahir = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    } else {
                        tglLahir = targetData.tanggal_lahir;
                    }

                    const loadedPassenger: Passenger = {
                        id_unik: Date.now(),
                        tipe: (targetData.kategori_penumpang || "DEWASA") as any,
                        label: "Edit Penumpang",
                        bayi: targetData.kategori_penumpang === "BAYI",
                        nama: targetData.nama_peserta || "",
                        nik: targetData.nik_peserta || "",
                        noHp: targetData.no_hp_peserta || "",
                        jenisKelamin: targetData.jenis_kelamin || "LAKI-LAKI",
                        tanggalLahir: tglLahir,
                        jenisIdentitas: targetData.jenis_identitas || (targetData.kategori_penumpang === "DEWASA" ? "KTP" : "KIA"),
                        alamatRumah: targetData.alamat_rumah || "",
                        fotoBukti: null,
                        fotoUrlServer: targetData.foto_bukti,
                        fotoPreview: targetData.foto_bukti ? (API.BASE_URL + targetData.foto_bukti) : undefined,
                        isExpanded: true
                    }

                    setPenumpang([loadedPassenger])

                    // Pre-fill route for edit mode as well, though hidden
                    if(targetData.rute && targetData.rute.rute_id) {
                        setRouteId(targetData.rute.rute_id.toString());
                    }

                } else {
                    alert("Data pendaftaran tidak ditemukan di riwayat Anda.")
                    navigate("/dashboard")
                }
                setLoadingData(false)
            }

        } catch (e) { console.error("Error init data", e) }
    }
    initData()
  }, [isEditMode, editId, routes])


  // --- STATE PENUMPANG ---
  const [penumpang, setPenumpang] = useState<Passenger[]>([])

  const createPassenger = (tipe: "DEWASA" | "ANAK-ANAK" | "BAYI", indexUrut: number): Passenger => ({
    id_unik: Date.now() + Math.random(),
    tipe,
    label: tipe === "DEWASA" ? `Dewasa ${indexUrut}` : tipe === "ANAK-ANAK" ? `Anak ${indexUrut}` : `Bayi ${indexUrut}`,
    bayi: tipe === "BAYI",
    nama: "", nik: "", noHp: "", jenisKelamin: "", alamatRumah: "",
    tanggalLahir: "",
    jenisIdentitas: tipe === "DEWASA" ? "KTP" : "KIA",
    fotoBukti: null,
    isExpanded: true
  })

  // --- LOGIC AUTO FORM ---
  const countType = (t: string) => penumpang.filter(p => p.tipe === t).length

  const handleAddAuto = (tipe: "DEWASA" | "ANAK-ANAK" | "BAYI") => {
    if (isEditMode) return alert("Dalam mode perbaikan data, Anda tidak bisa menambah penumpang baru.");

    if (penumpang.length >= 6) return alert("Maksimal 6 penumpang per akun!")

    if ((tipe === "ANAK-ANAK" || tipe === "BAYI")) {
        if (countType("DEWASA") === 0 && !hasExistingAdult) {
            return alert("Harus ada penumpang DEWASA dulu (di form ini atau riwayat sebelumnya)!")
        }
    }

    const currentCount = countType(tipe)
    const newP = createPassenger(tipe, currentCount + 1)
    setPenumpang(curr => [...curr, newP])
  }

  const handleRemoveAuto = (tipe: "DEWASA" | "ANAK-ANAK" | "BAYI") => {
    if (isEditMode) return alert("Tidak bisa menghapus data saat mode perbaikan.");

    const newArr = [...penumpang]
    let lastIndex = -1
    for (let i = newArr.length - 1; i >= 0; i--) {
        if (newArr[i].tipe === tipe) { lastIndex = i; break; }
    }
    if (lastIndex !== -1) {
        if (tipe === "DEWASA" && countType("DEWASA") === 1 && (countType("ANAK-ANAK") > 0 || countType("BAYI") > 0)) {
            if (!hasExistingAdult) return alert("Hapus Anak/Bayi dulu sebelum menghapus Dewasa terakhir!")
        }
        newArr.splice(lastIndex, 1)
        setPenumpang(newArr)
    }
  }

  const removeSpecific = (index: number) => {
    if (isEditMode) return alert("Tidak bisa menghapus data saat mode perbaikan.");

    const p = penumpang[index]
    if (p.tipe === "DEWASA" && countType("DEWASA") === 1 && penumpang.length > 1 && !hasExistingAdult) {
        return alert("Tidak bisa menghapus Dewasa terakhir. Anak/Bayi butuh pendamping.")
    }
    if(!confirm("Hapus penumpang ini?")) return
    setPenumpang(prev => prev.filter((_, i) => i !== index))
  }

  const update = (i: number, k: keyof Passenger, v: any) => {
    setPenumpang((p) =>
      p.map((x, idx) => idx === i ? { ...x, [k]: v, ...(k === "fotoBukti" && v ? { fotoPreview: URL.createObjectURL(v) } : {}) } : x)
    )
  }

  const isiDataPemilik = (index: number) => {
      const nama = localStorage.getItem("nama")?.replace(/"/g, "") || ""
      const nik = localStorage.getItem("username")?.replace(/"/g, "") || localStorage.getItem("nik")?.replace(/"/g, "") || ""

      if(nama) update(index, "nama", nama)
      if(nik) update(index, "nik", nik)
  }

  // --- SUBMIT ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Hanya tampilkan modal peringatan jika bukan edit mode
    if (!isEditMode) {
      setPendingSubmitEvent(e)
      setShowWarningModal(true)
    } else {
      doSubmit(e)
    }
  }

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    setLoadingSubmit(true)

    const userId = getUserId()
    const token = localStorage.getItem("token")

    if (!userId || !token) {
        setLoadingSubmit(false)
        return alert("Sesi habis, silakan login ulang!")
    }

    if (!isEditMode && !selectedTujuan) {
        setLoadingSubmit(false)
        return alert("⚠️ Pilih Kota Tujuan terlebih dahulu!")
    }
    if (!isEditMode && !selectedTanggal) {
        setLoadingSubmit(false)
        return alert("⚠️ Pilih Tanggal Keberangkatan terlebih dahulu!")
    }
    if (!isEditMode && !routeId) {
        setLoadingSubmit(false)
        return alert("⚠️ Pilih Jam Keberangkatan terlebih dahulu!")
    }

    if (!isEditMode && countType("DEWASA") === 0 && !hasExistingAdult) {
        setLoadingSubmit(false)
        return alert("❌ Pendaftaran Gagal!\nWajib ada minimal 1 Penumpang Dewasa (Penanggung Jawab).")
    }

    try {
        const fd = new FormData()

        for (const [index, p] of penumpang.entries()) {
            if (!p.nama || !p.nik || !p.jenisKelamin || !p.tanggalLahir || !p.alamatRumah) {
                throw new Error(`Data ${p.label} belum lengkap!`)
            }
            if (p.nik.length !== 16) throw new Error(`NIK ${p.label} harus 16 digit!`)

            const age = calculateAge(p.tanggalLahir)
            if (p.tipe === "DEWASA" && age < 17) throw new Error(`${p.label}: Umur ${age} thn (Dewasa harus 17+)`)
            if (p.tipe === "ANAK-ANAK" && (age < 3 || age >= 17)) throw new Error(`${p.label}: Umur ${age} thn (Anak harus 5-16 thn)`)
            if (p.tipe === "BAYI" && age >= 5) throw new Error(`${p.label}: Umur ${age} thn (Bayi harus < 5 thn)`)

            fd.append("nama_peserta", p.nama)
            fd.append("nik_peserta", p.nik)
            fd.append("jenis_kelamin", p.jenisKelamin)
            fd.append("tanggal_lahir", p.tanggalLahir)
            fd.append("jenis_identitas", p.jenisIdentitas)
            fd.append("alamat_rumah", p.alamatRumah)
            fd.append("no_hp_peserta", p.noHp || "-")
            fd.append("jenis_barang", "Bawaan Standar")
            fd.append("ukuran_barang", "Sedang")

            if (p.fotoBukti) {
                fd.append(`fotoBukti_${index}`, p.fotoBukti)
            }
        }

        let url = `${API.PENDAFTARAN}?rute_id=${routeId}`;
        let method = "POST";

        if (isEditMode) {
             url = `${API.PENDAFTARAN}/perbaiki-data/${editId}`;
             method = "PUT";
        }

        const res = await fetch(url, {
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "userId": userId
            },
            body: fd
        })

        const text = await res.text()
        let json
        try { json = JSON.parse(text) } catch {
            throw new Error("Server Error: Respon bukan JSON. Cek Network Tab.")
        }

        if (!res.ok) throw new Error(json.error || json.message || "Gagal mendaftar")

        alert(`✅ BERHASIL! ${json.pesan}\n\nAdmin akan memverifikasi data Anda.`)

        // Buka WA ke admin untuk notifikasi otomatis
        if (json.link_wa_admin && json.link_wa_admin !== "#" && json.link_wa_admin.length > 5) {
          window.open(json.link_wa_admin, "_blank")
        }

        navigate("/dashboard")

    } catch (err: any) {
        const message = err?.message || "Pendaftaran gagal. Silakan coba lagi."
        setLoadingSubmit(false)
        setSubmitError(message)
        alert("❌ " + message)
    } finally {
        setLoadingSubmit(false)
    }
  }

  const selectedRoute = routes.find(r => r.rute_id.toString() === routeId)

  if (loadingData) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-slate-600 font-medium">Memuat data perbaikan...</p>
      </div>
    </div>
  )

  return (
    <>
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* ── TOP HEADER ─────────────────────────── */}
      <div className={`${isEditMode ? "bg-gradient-to-r from-amber-600 to-orange-600" : "bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-800"} text-white px-6 md:px-10 py-5 shadow-lg`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
              <ArrowLeft size={20}/>
            </button>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                {isEditMode ? <Edit size={20}/> : <Bus size={20} className="text-yellow-300"/>}
                {isEditMode ? "Perbaiki Data Pendaftaran" : "Pendaftaran Mudik Gratis"}
              </h1>
              <p className="text-sm opacity-75 mt-0.5">
                {isEditMode ? "Perbarui data yang salah sesuai arahan verifikator" : "Program Mudik Gratis — Dinas Perhubungan Aceh"}
              </p>
            </div>
          </div>
          {!isEditMode && (
            <div className="hidden md:flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
              <CheckCircle size={15} className="text-green-300"/>
              <span className="font-medium">100% Gratis</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN LAYOUT: Form + Side Panel ─────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* ════ FORM (2/3 lebar) ════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card pembungkus form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`px-6 py-4 border-b border-slate-100 ${isEditMode ? "bg-amber-50" : "bg-blue-50"}`}>
              <p className={`text-sm font-bold ${isEditMode ? "text-amber-700" : "text-blue-700"} flex items-center gap-2`}>
                <Info size={15}/>
                {isEditMode ? "Mode Perbaikan: isi ulang data yang diminta admin." : "Isi data sesuai KTP/KK. Maksimal 6 penumpang per akun."}
              </p>
            </div>
            <div className="p-6 space-y-8">
          {/* STEP 1: PILIH RUTE — FIX 3: 3 Dropdown Bertingkat (Tujuan → Tanggal → Jam) */}
          {!isEditMode && (() => {
            // Derive unique tujuan dari semua rute
            const uniqueTujuan = Array.from(new Set(routes.map(r => r.tujuan))).filter(Boolean).sort()

            // Rute yang cocok dengan tujuan yang dipilih
            const ruteByTujuan = selectedTujuan
              ? routes.filter(r => r.tujuan === selectedTujuan)
              : []

            // Tanggal unik dari rute yang cocok
            const uniqueTanggal = Array.from(
              new Set(ruteByTujuan.map(r => (r as any).tanggal_berangkat || "").filter(Boolean))
            ).sort()

            // Rute final berdasarkan tujuan + tanggal yang dipilih
            const ruteByTanggal = selectedTanggal
              ? ruteByTujuan.filter(r => (r as any).tanggal_berangkat === selectedTanggal)
              : []

            return (
            <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <label className="block mb-4 font-bold text-slate-700 flex items-center gap-2">
                <MapPin size={18} className="text-red-500"/> Pilih Tujuan & Jadwal
              </label>
              <p className="text-xs text-slate-500 -mt-2 mb-4 ml-1">Pilih kota tujuan → tanggal → jam keberangkatan secara berurutan.</p>

              {lockedRoute ? (
                /* Jika rute terkunci, tampilkan info saja */
                <div className="space-y-3">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <Info size={16} className="text-orange-600 mt-0.5 shrink-0"/>
                    <div>
                      <p className="text-sm font-bold text-orange-700">Rute Keluarga Dikunci</p>
                      <p className="text-xs text-orange-600 mt-1">
                        Tujuan dan jadwal mengikuti pendaftaran pertama. Anda tetap bisa menambahkan penumpang lain sampai maksimal 6 orang dalam akun ini.
                      </p>
                    </div>
                  </div>
                  {selectedRoute && (
                    <div className="bg-blue-100 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 text-blue-800 text-sm">
                      <div className="flex items-center gap-2"><MapPin size={16}/> <span>Tujuan: <b>{selectedRoute.tujuan}</b></span></div>
                      <div className="flex items-center gap-2"><CalendarDays size={16}/> <span>Tanggal: <b>{(selectedRoute as any).tanggal_berangkat || "-"}</b></span></div>
                      <div className="flex items-center gap-2"><Clock size={16}/> <span>Jam: <b>{(selectedRoute as any).jam_berangkat || "-"}</b></span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">

                  {/* DROPDOWN 1: Pilih Kota Tujuan */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                      Kota Tujuan
                    </p>
                    <div className="relative">
                      <select
                        className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium appearance-none"
                        value={selectedTujuan}
                        onChange={(e) => {
                          setSelectedTujuan(e.target.value)
                          setSelectedTanggal("")  // reset tanggal & jam
                          setRouteId("")
                        }}
                      >
                        <option value="">-- Pilih Kota Tujuan --</option>
                        {uniqueTujuan.map(t => {
                          const sample = routes.find(r => r.tujuan === t)
                          const asal = (sample as any)?.asal || "Banda Aceh"
                          return <option key={t} value={t}>{asal} → {t}</option>
                        })}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                    </div>
                  </div>

                  {/* DROPDOWN 2: Pilih Tanggal (muncul setelah tujuan dipilih) */}
                  {selectedTujuan && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                        Tanggal Keberangkatan
                      </p>
                      <div className="relative">
                        <select
                          className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium appearance-none"
                          value={selectedTanggal}
                          onChange={(e) => {
                            setSelectedTanggal(e.target.value)
                            setRouteId("")  // reset jam/rute_id
                          }}
                        >
                          <option value="">-- Pilih Tanggal --</option>
                          {uniqueTanggal.map(tgl => {
                            // Format tanggal lebih manusiawi: "2025-03-28" → "28 Maret 2025"
                            let label = tgl
                            try {
                              label = new Date(tgl).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                            } catch {}
                            return <option key={tgl} value={tgl}>{label}</option>
                          })}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                      </div>
                    </div>
                  )}

                  {/* DROPDOWN 3: Pilih Jam (muncul setelah tanggal dipilih) */}
                  {selectedTanggal && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                        Jam Keberangkatan
                      </p>
                      <div className="relative">
                        <select
                          className="w-full p-4 pl-11 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium appearance-none"
                          value={routeId}
                          onChange={(e) => setRouteId(e.target.value)}
                        >
                          <option value="">-- Pilih Jam Keberangkatan --</option>
                          {ruteByTanggal.map(r => {
                            const kuota = r.kuota_tersisa ?? r.sisa_kuota ?? 0
                            const portalTutup = r.is_portal_open === false
                            const isFull = kuota <= 0
                            const nonAktif = isFull || portalTutup
                            const jam = (r as any).jam_berangkat || "-"
                            const statusLabel = portalTutup ? " [DITUTUP]" : isFull ? " [PENUH]" : " [Tersedia]"
                            return (
                              <option
                                key={r.rute_id}
                                value={r.rute_id.toString()}
                                disabled={nonAktif}
                              >
                                {jam}{statusLabel}
                              </option>
                            )
                          })}
                        </select>
                        <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"/>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20}/>
                      </div>
                      {/* Status info setelah jam dipilih */}
                      {routeId && (() => {
                        const r = ruteByTanggal.find(x => x.rute_id.toString() === routeId)
                        if (!r) return null
                        const kuota = r.kuota_tersisa ?? r.sisa_kuota ?? 0
                        const portalTutup = r.is_portal_open === false
                        const isFull = kuota <= 0
                        if (portalTutup) return (
                          <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/> Jadwal ini sedang ditutup oleh admin.</p>
                        )
                        if (isFull) return (
                          <p className="text-xs text-orange-600 font-bold mt-2 flex items-center gap-1"><AlertCircle size={12}/> Kuota jadwal ini sudah penuh.</p>
                        )
                        return null
                      })()}
                    </div>
                  )}

                  {/* RINGKASAN PILIHAN (setelah semua dipilih) */}
                  {routeId && selectedRoute && (
                    <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                      <CheckCircle size={20} className="text-green-600 shrink-0"/>
                      <div className="text-sm text-green-800">
                        <p className="font-bold">Jadwal dipilih:</p>
                        <p>{selectedRoute.tujuan} • {(selectedRoute as any).tanggal_berangkat ? new Date((selectedRoute as any).tanggal_berangkat).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"}) : "-"} • {(selectedRoute as any).jam_berangkat || "-"}</p>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </section>
            )
          })()}

          {/* STEP 2: CONTROLLER (Hidden saat Edit) */}
          {!isEditMode && (
          <section>
            <label className="block font-bold text-slate-700 mb-4 flex items-center gap-2"><Users size={18} className="text-blue-600"/> Tambah Penumpang</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <ControlCard label="Dewasa (17+)" count={countType("DEWASA")} onAdd={() => handleAddAuto("DEWASA")} onRemove={() => handleRemoveAuto("DEWASA")} />
               <ControlCard label="Anak (2-16)" count={countType("ANAK-ANAK")} onAdd={() => handleAddAuto("ANAK-ANAK")} onRemove={() => handleRemoveAuto("ANAK-ANAK")} disabled={!hasExistingAdult && countType("DEWASA") === 0} />
               <ControlCard label="Bayi (<2)" count={countType("BAYI")} onAdd={() => handleAddAuto("BAYI")} onRemove={() => handleRemoveAuto("BAYI")} disabled={!hasExistingAdult && countType("DEWASA") === 0} />
            </div>
            {!hasExistingAdult && countType("DEWASA") === 0 && <p className="text-xs text-red-500 mt-2 italic font-bold animate-pulse">* Anda belum memiliki riwayat penumpang Dewasa. Tambahkan Dewasa terlebih dahulu.</p>}
            {hasExistingAdult && <p className="text-xs text-green-600 mt-2 italic font-bold flex items-center gap-1"><CheckCircle size={14}/> Akun Anda sudah terverifikasi memiliki penumpang Dewasa.</p>}
          </section>
          )}

          {/* STEP 3: FORM */}
          {penumpang.length > 0 && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 text-sm">
                <AlertCircle size={18}/> <span>{isEditMode ? "Perbaiki data di bawah ini sesuai arahan admin." : <b>Total: {penumpang.length} Penumpang. Pastikan data KTP/KK sesuai.</b>}</span>
              </div>
              {penumpang.map((p, i) => (
                <div key={p.id_unik} className={`border rounded-2xl bg-white overflow-hidden transition-all duration-300 ${p.isExpanded ? "ring-2 ring-blue-100 border-blue-300 shadow-md" : "border-slate-200"}`}>
                  <div onClick={() => setPenumpang(curr => curr.map((x, idx) => idx === i ? { ...x, isExpanded: !x.isExpanded } : x))} className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 ${p.isExpanded ? "bg-blue-50/30" : ""}`}>
                    <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.nama ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{p.nama ? <CheckCircle size={16}/> : (i + 1)}</span>
                        <div><p className="font-bold text-slate-800">{p.label}</p><p className="text-xs text-slate-500">{p.nama || "Klik untuk isi data..."}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditMode && <button type="button" onClick={(e) => { e.stopPropagation(); removeSpecific(i); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"><Trash2 size={18} /></button>}
                        {p.isExpanded ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                    </div>
                  </div>
                  {p.isExpanded && (
                    <div className="p-6 border-t border-slate-100 bg-white">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Nama Lengkap</Label>
                          <Input value={p.nama} onChange={(e: any) => update(i, "nama", e.target.value)} placeholder="Nama lengkap sesuai KTP/KK/Akta" />
                          <p className="text-[11px] text-slate-400 mt-1">⚠️ Tulis nama <b>persis seperti di KTP/KK/Akta</b>. Jangan singkat atau tambahkan gelar.</p>
                        </div>
                        <div>
                          <Label>NIK</Label>
                          <Input type="number" value={p.nik} onChange={(e: any) => update(i, "nik", e.target.value)} placeholder="Contoh: 1171010101010001" />
                          <div className={`flex items-center justify-between mt-1 text-xs font-bold ${p.nik.length === 16 ? "text-green-600" : p.nik.length > 0 ? "text-orange-500" : "text-slate-400"}`}>
                            <span>{p.nik.length === 16 ? "✅ NIK valid (16 digit)" : p.nik.length > 0 ? `${p.nik.length}/16 digit${p.nik.length < 16 ? ` — kurang ${16 - p.nik.length}` : " — terlalu panjang"}` : "Masukkan 16 digit NIK"}</span>
                          </div>
                        </div>
                        <div>
                          <Label>Tanggal Lahir</Label>
                          <div className="relative">
                            <input type="date" className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer text-slate-700" value={p.tanggalLahir} max={new Date().toISOString().split("T")[0]} onChange={(e) => update(i, "tanggalLahir", e.target.value)}/>
                            <CalendarDays size={18} className="absolute left-3 top-3.5 text-blue-500 pointer-events-none"/>
                          </div>
                          {p.tanggalLahir
                            ? <p className="text-xs mt-1 font-bold text-blue-600">📅 Umur: {calculateAge(p.tanggalLahir)} tahun → Kategori: {calculateAge(p.tanggalLahir) < 2 ? "BAYI" : calculateAge(p.tanggalLahir) < 17 ? "ANAK-ANAK" : "DEWASA"}</p>
                            : <p className="text-[11px] text-slate-400 mt-1">Kategori (Bayi/Anak/Dewasa) ditentukan otomatis dari tanggal lahir.</p>
                          }
                        </div>
                        <div>
                          <Label>Jenis Kelamin</Label>
                          <Select value={p.jenisKelamin} onChange={(e: any) => update(i, "jenisKelamin", e.target.value)}>
                            <option value="">-- Pilih --</option>
                            <option value="LAKI-LAKI">Laki-laki</option>
                            <option value="PEREMPUAN">Perempuan</option>
                          </Select>
                          {!p.jenisKelamin && <p className="text-[11px] text-orange-400 mt-1">Wajib dipilih.</p>}
                        </div>
                        <div>
                          <Label>Jenis Identitas</Label>
                          <div className="relative">
                            <select className="w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-lg appearance-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition" value={p.jenisIdentitas} onChange={(e: any) => update(i, "jenisIdentitas", e.target.value)}>
                              {p.tipe === "DEWASA"
                                ? <><option value="KTP">KTP</option><option value="KK">KK</option></>
                                : <><option value="KIA">KIA</option><option value="KK">KK</option></>
                              }
                            </select>
                            <FileText size={18} className="absolute left-3 top-3.5 text-slate-400 pointer-events-none"/>
                            <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"/>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{p.tipe === "DEWASA" ? "Gunakan KTP (utama) atau KK jika KTP tidak tersedia." : "Gunakan KIA atau KK untuk anak/bayi."}</p>
                        </div>

                        <div>
                            <Label>Upload Foto {p.jenisIdentitas || "Identitas"}</Label>
                            <div className={`border-2 border-dashed rounded-xl p-3 text-center relative transition flex items-center justify-center h-[52px] ${p.fotoBukti ? "bg-green-50 border-green-400" : "hover:bg-slate-50 border-slate-300"}`}>
                                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const MAX_SIZE = 2 * 1024 * 1024; // 2MB
                                        if (file.size > MAX_SIZE) {
                                            e.target.value = '';
                                            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                                            alert(`❌ File terlalu besar!\n\nUkuran file: ${sizeMB} MB\nMaksimum: 2 MB\n\nSilakan kompres foto atau pilih foto lain yang lebih kecil.`);
                                            return;
                                        }
                                    }
                                    update(i, "fotoBukti", file);
                                }} />
                                {p.fotoPreview ?
                                    <div className="flex items-center gap-2"><img src={p.fotoPreview} className="h-8 w-8 object-cover rounded" alt="preview"/><span className="text-xs font-bold text-green-700">Terupload ✅</span></div>
                                :
                                    <div className="flex items-center gap-2 text-slate-500"><UploadCloud size={18}/><span className="text-xs font-medium">{isEditMode ? "Ganti Foto" : "Pilih File..."}</span></div>
                                }
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">📸 Foto harus <b>jelas & terbaca</b>. Format JPG/PNG, maks 2MB. Pastikan tidak buram atau terpotong.</p>
                        </div>

                        <div>
                          <Label>No. HP</Label>
                          <Input type="tel" value={p.noHp} onChange={(e: any) => update(i, "noHp", e.target.value)} placeholder="Contoh: 0812xxxxxxxx" />
                          <p className="text-[11px] text-slate-400 mt-1">Nomor HP aktif. Notifikasi WhatsApp akan dikirim ke nomor ini.</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Alamat Domisili</Label>
                          <Input value={p.alamatRumah} onChange={(e: any) => update(i, "alamatRumah", e.target.value)} placeholder="Contoh: Jl. Mawar No. 5, Ulee Kareng, Banda Aceh" />
                          <p className="text-[11px] text-slate-400 mt-1">Tuliskan alamat lengkap (jalan, kelurahan, kota).</p>
                        </div>

                        <div className="md:col-span-2 mt-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-start gap-2">
                            <Info size={16} className="text-yellow-600 mt-0.5 shrink-0"/>
                            <p className="text-xs text-yellow-800 leading-relaxed">
                                <strong>Info Bagasi:</strong> Maksimal barang bawaan adalah 1 Koper/Kardus Sedang + 1 Tas Ransel per penumpang. Barang pecah belah harap diamankan sendiri.
                            </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {submitError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {submitError}
                </div>
              )}
              <div className="flex gap-4 pt-4 border-t border-slate-200">
                 {!isEditMode && <button type="button" onClick={() => {if(confirm("Reset semua?")) setPenumpang([])}} className="flex-1 py-4 bg-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition">Reset</button>}
                 <button type="submit" disabled={loadingSubmit} className={`flex-[2] py-4 text-white rounded-xl font-bold shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2 ${isEditMode ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-900 hover:bg-blue-800"}`}>
                     {loadingSubmit ? "Mengirim..." : <>{isEditMode ? <Edit size={20}/> : <Bus size={20}/>} {isEditMode ? "Simpan Perubahan" : "Kirim"}</>}
                 </button>
              </div>
            </form>
          )}
            </div>
          </div>
        </div>

        {/* ════ SIDE INFO PANEL (1/3 lebar) ════ */}
        <aside className="space-y-4 lg:sticky lg:top-6">

          {/* Status Rute Dipilih */}
          {selectedRoute && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-3">Jadwal Dipilih</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><MapPin size={16}/></div>
                  <div><p className="text-xs text-blue-200">Tujuan</p><p className="font-bold">{selectedRoute.tujuan}</p></div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><CalendarDays size={16}/></div>
                  <div><p className="text-xs text-blue-200">Tanggal</p><p className="font-bold">{(selectedRoute as any).tanggal_berangkat ? new Date((selectedRoute as any).tanggal_berangkat).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}) : "-"}</p></div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Clock size={16}/></div>
                  <div><p className="text-xs text-blue-200">Jam Berangkat</p><p className="font-bold">{(selectedRoute as any).jam_berangkat || "-"}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Rangkuman Penumpang */}
          {penumpang.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Ringkasan Formulir</p>
              <div className="space-y-2">
                {["DEWASA","ANAK-ANAK","BAYI"].map(tipe => {
                  const cnt = penumpang.filter(p => p.tipe === tipe).length;
                  if (!cnt) return null;
                  return (
                    <div key={tipe} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{tipe === "DEWASA" ? "👤 Dewasa" : tipe === "ANAK-ANAK" ? "🧒 Anak-anak" : "👶 Bayi"}</span>
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full text-sm">{cnt}</span>
                    </div>
                  );
                })}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">Total</span>
                  <span className="font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full text-sm">{penumpang.length} orang</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                <CheckCircle size={12} className="text-green-500"/>
                {penumpang.filter(p => p.nama && p.nik && p.jenisKelamin && p.tanggalLahir && p.alamatRumah).length}/{penumpang.length} data lengkap
              </div>
            </div>
          )}

          {/* Panduan Pengisian */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Panduan Pengisian</p>
            <div className="space-y-3.5">
              {[
                { icon: "📋", title: "Data sesuai KTP/KK", desc: "Nama, NIK, dan tanggal lahir wajib sesuai dokumen resmi." },
                { icon: "📸", title: "Upload foto identitas", desc: "Foto KTP/KIA jelas, tidak buram. Maks 2MB." },
                { icon: "👨‍👩‍👧", title: "Pendamping wajib dewasa", desc: "Anak & bayi wajib disertai penumpang dewasa (17+)." },
                { icon: "🎒", title: "Bagasi standar", desc: "Maks 1 koper/kardus sedang + 1 tas ransel per orang." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info kontak */}
          <div className="bg-slate-800 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3">Butuh Bantuan?</p>
            <a href="https://wa.me/628217653095?text=Halo%20Admin%20Maman%2C%20saya%20ingin%20menanyakan%20perihal%20status%20pendaftaran%20Mudik%20Gratis%20Aceh%20saya." target="_blank" rel="noreferrer"
              className="flex items-center gap-3 bg-green-500 hover:bg-green-600 rounded-xl px-4 py-3 transition font-bold text-sm">
              <span className="text-xl">💬</span> Chat Admin WhatsApp
            </a>
            <p className="text-xs text-slate-400 mt-3 text-center">Sen–Jum, 08.00–16.00 WIB</p>
          </div>

        </aside>
      </div>
    </main>

    {/* Modal Peringatan Sebelum Submit */}
    {showWarningModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 text-center mb-4">Perhatian!</h2>
          <p className="text-slate-600 text-sm text-center leading-relaxed mb-6">
            Pastikan data dan nomor HP anda benar,{" "}
            <strong className="text-red-600 text-base">
              anda tidak dapat merubah data setelah submit
            </strong>
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setShowWarningModal(false)
                if (pendingSubmitEvent) doSubmit(pendingSubmitEvent)
              }}
              className="w-full bg-blue-900 text-white font-bold py-3.5 rounded-xl hover:bg-blue-800 transition"
            >
              Saya Mengerti, Kirim Sekarang
            </button>
            <button
              onClick={() => { setShowWarningModal(false); setPendingSubmitEvent(null) }}
              className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition"
            >
              Cek Kembali Data
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}

const ControlCard = ({label, count, onAdd, onRemove, disabled}: any) => (
  <div className={`flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition ${disabled ? 'opacity-50' : ''}`}>
    <span className="font-bold text-sm mb-2 text-slate-600">{label}</span>
    <div className="flex items-center gap-4">
      <button type="button" onClick={onRemove} disabled={count === 0} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 flex items-center justify-center transition disabled:opacity-30"><Minus size={18}/></button>
      <span className="text-2xl font-bold w-6 text-center text-slate-800">{count}</span>
      <button type="button" onClick={onAdd} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:bg-blue-700 transition"><Plus size={18}/></button>
    </div>
  </div>
)
const Label = ({children}: any) => <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">{children}</label>
const Input = (props: any) => <input {...props} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-800 placeholder:text-slate-400"/>
const Select = (props: any) => <div className="relative"><select {...props} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg appearance-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition text-slate-800">{props.children}</select><ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"/></div>