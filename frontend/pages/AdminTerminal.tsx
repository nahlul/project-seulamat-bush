import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    MapPin, Plus, Edit, Trash2, X, Save, ArrowLeft,
    Navigation, Globe, Info, CheckCircle, Search,
    ExternalLink, Map, RefreshCw, AlertTriangle
} from "lucide-react";
import { API } from "../lib/api";
import PetaSebaran from "../components/PetaSebaran";

// ── Terminal rekomendasi jalur mudik Aceh ───────────────────────────
const TERMINAL_REKOMENDASI = [
    { nama: "Terminal Batoh",          kota: "Banda Aceh",        latitude: 5.529939,  longitude: 95.328827,  info: "Terminal asal utama (default)" },
    { nama: "Terminal Lhokseumawe",    kota: "Lhokseumawe",       latitude: 5.1801,    longitude: 97.1419,    info: "Kota transit Aceh Utara" },
    { nama: "Terminal Langsa",         kota: "Langsa",            latitude: 4.4683,    longitude: 97.9620,    info: "Kota perbatasan Aceh–Sumut" },
    { nama: "Terminal Amplas",         kota: "Medan",             latitude: 3.5397,    longitude: 98.6880,    info: "Terminal utama selatan Medan" },
    { nama: "Terminal Pinang Baris",   kota: "Medan",             latitude: 3.6244,    longitude: 98.6179,    info: "Terminal utama barat Medan" },
    { nama: "Terminal Padang Sidempuan", kota: "Padang Sidempuan", latitude: 1.3985,   longitude: 99.2717,    info: "Kota hub Tapanuli" },
    { nama: "Terminal AKAP Pekanbaru", kota: "Pekanbaru",         latitude: 0.5071,    longitude: 101.4478,   info: "Ibukota Riau" },
    { nama: "Terminal Lintas Andalas", kota: "Padang",            latitude: -0.9571,   longitude: 100.4219,   info: "Ibukota Sumatera Barat" },
    { nama: "Terminal Kampung Rambutan", kota: "Jakarta",         latitude: -6.2863,   longitude: 106.8741,   info: "Terminal utama Jakarta Timur" },
    { nama: "Terminal Pulo Gadung",    kota: "Jakarta",           latitude: -6.1941,   longitude: 106.9053,   info: "Terminal bus Jakarta" },
    { nama: "Terminal Bungurasih",     kota: "Surabaya",          latitude: -7.3737,   longitude: 112.7300,   info: "Terminal terbesar Jawa Timur" },
];

type Terminal = {
    id: number;
    nama: string;
    kota: string;
    latitude: number;
    longitude: number;
    label?: string;
    koordinat?: string;
};

type FormState = {
    id: number;
    nama: string;
    kota: string;
    latitude: string;
    longitude: string;
};

// ── Mini map iframe (OpenStreetMap embed, no API key needed) ───────
function MiniMap({ lat, lon, nama }: { lat: number; lon: number; nama: string }) {
    if (!lat || !lon) return null;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05},${lat - 0.05},${lon + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lon}`;
    return (
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm mt-3">
            <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Map size={12} /> Preview Lokasi: {nama}
                </span>
                <a
                    href={`https://www.google.com/maps?q=${lat},${lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                >
                    <ExternalLink size={11} /> Google Maps
                </a>
            </div>
            <iframe
                title="preview-peta"
                src={src}
                width="100%"
                height="180"
                style={{ border: "none", display: "block" }}
                loading="lazy"
            />
        </div>
    );
}

// ── Koordinat valid checker ─────────────────────────────────────────
function isValidCoord(lat: string, lon: string): boolean {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    return !isNaN(la) && !isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
}

export default function AdminTerminal() {
    const navigate = useNavigate();
    const [list, setList]       = useState<Terminal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit]   = useState(false);
    const [saving, setSaving]   = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [form, setForm]       = useState<FormState>({ id: 0, nama: "", kota: "", latitude: "", longitude: "" });
    const [success, setSuccess] = useState("");
    const [error, setError]     = useState("");
    const [search, setSearch]   = useState("");
    const [showPreview, setShowPreview] = useState(false);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) { navigate("/admin/login"); return; }
        loadData();
    }, []);

    // Debounce preview map setelah user selesai ketik koordinat
    const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (previewTimer.current) clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(() => {
            setShowPreview(isValidCoord(form.latitude, form.longitude));
        }, 800);
    }, [form.latitude, form.longitude]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API.BASE_URL}/api/terminal`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setList(Array.isArray(data) ? data : []);
        } catch {
            setError("Gagal memuat data terminal. Periksa koneksi ke server.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.nama.trim() || !form.kota.trim()) {
            setError("Nama terminal dan nama kota wajib diisi!"); return;
        }
        if (!isValidCoord(form.latitude, form.longitude)) {
            setError("Koordinat tidak valid. Latitude: -90 s/d 90, Longitude: -180 s/d 180."); return;
        }

        setSaving(true); setError("");
        try {
            const payload = {
                nama: form.nama.trim(),
                kota: form.kota.trim(),
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
            };
            const url    = isEdit ? `${API.BASE_URL}/api/terminal/${form.id}` : `${API.BASE_URL}/api/terminal`;
            const method = isEdit ? "PUT" : "POST";
            const res    = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Gagal menyimpan"); }
            setSuccess(isEdit ? `Terminal "${form.nama}" berhasil diperbarui!` : `Terminal "${form.nama}" berhasil ditambahkan!`);
            setShowModal(false);
            loadData();
            setTimeout(() => setSuccess(""), 4000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, nama: string) => {
        if (!confirm(`Hapus terminal "${nama}"?\n\nRute yang nama kota-nya cocok dengan terminal ini tidak akan muncul di Peta Sebaran.`)) return;
        setDeleting(id);
        try {
            const res = await fetch(`${API.BASE_URL}/api/terminal/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Gagal menghapus");
            setSuccess(`Terminal "${nama}" berhasil dihapus.`);
            loadData();
            setTimeout(() => setSuccess(""), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDeleting(null);
        }
    };

    const openAdd = () => {
        setForm({ id: 0, nama: "", kota: "", latitude: "", longitude: "" });
        setIsEdit(false); setError(""); setShowPreview(false); setShowModal(true);
    };
    const openEdit = (t: Terminal) => {
        setForm({ id: t.id, nama: t.nama, kota: t.kota, latitude: String(t.latitude), longitude: String(t.longitude) });
        setIsEdit(true); setError(""); setShowModal(true);
    };

    const isiRekomendasi = (r: typeof TERMINAL_REKOMENDASI[0]) => {
        setForm({ id: 0, nama: r.nama, kota: r.kota, latitude: String(r.latitude), longitude: String(r.longitude) });
        setIsEdit(false); setError(""); setShowModal(true);
    };

    // Paste koordinat sekaligus (format: "lat, lon" atau "lat lon")
    const handlePasteKoordinat = (raw: string) => {
        const cleaned = raw.replace(/[°''""]/g, "").trim();
        const parts   = cleaned.split(/[,\s]+/).filter(Boolean);
        if (parts.length >= 2) {
            setForm(f => ({ ...f, latitude: parts[0], longitude: parts[1] }));
        }
    };

    const filtered = list.filter(t =>
        t.nama?.toLowerCase().includes(search.toLowerCase()) ||
        t.kota?.toLowerCase().includes(search.toLowerCase())
    );

    const previewLat = parseFloat(form.latitude);
    const previewLon = parseFloat(form.longitude);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* ── TOPBAR ──────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/admin/dashboard")}
                            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-medium text-sm transition"
                        >
                            <ArrowLeft size={16} /> Dashboard
                        </button>
                        <span className="text-slate-200">|</span>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 leading-none">Kelola Terminal & Titik Peta</h1>
                            <p className="text-xs text-slate-400 mt-0.5">Koordinat terminal menentukan rute yang tampil di Peta Sebaran Pemudik</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition"
                            title="Refresh data"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={openAdd}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 text-sm"
                        >
                            <Plus size={18} /> Tambah Terminal
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6">
                {/* ── ALERT BANNER ───────────────────────────────── */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Info size={17} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800">
                        <p className="font-bold mb-0.5">⚡ Cara kerja integrasi Terminal ↔ Peta Sebaran</p>
                        <p>Peta menampilkan rute yang memiliki peserta berstatus <b>DITERIMA H-3</b> atau <b>TERVERIFIKASI/SIAP BERANGKAT</b>. Agar rute muncul, <b>nama kota di data rute harus cocok</b> (persis) dengan field <code className="bg-amber-100 px-1 rounded text-xs">kota</code> terminal di sini.</p>
                    </div>
                </div>

                {/* ── NOTIF ──────────────────────────────────────── */}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 font-medium text-sm">
                        <CheckCircle size={17} /> {success}
                    </div>
                )}
                {error && !showModal && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* ── SEARCH + COUNT ─────────────────────────────── */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Cari nama terminal atau kota..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-sm text-slate-500">
                        {filtered.length} terminal{filtered.length !== list.length ? ` dari ${list.length}` : " terdaftar"}
                    </span>
                </div>

                {/* ── GRID TERMINAL ──────────────────────────────── */}
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="h-10 bg-slate-50 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 mb-8">
                        <MapPin size={40} className="mx-auto mb-3 text-slate-200" />
                        <p className="font-semibold text-slate-500">
                            {search ? `Tidak ditemukan terminal untuk "${search}"` : "Belum ada terminal terdaftar"}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            {search ? "Coba kata kunci lain" : "Gunakan tombol Tambah atau pilih dari daftar rekomendasi di bawah"}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {filtered.map(t => (
                            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                                {/* Map thumbnail mini */}
                                <div className="h-32 rounded-t-2xl overflow-hidden bg-slate-100 relative">
                                    <iframe
                                        title={`map-${t.id}`}
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${t.longitude - 0.04},${t.latitude - 0.04},${t.longitude + 0.04},${t.latitude + 0.04}&layer=mapnik&marker=${t.latitude},${t.longitude}`}
                                        width="100%"
                                        height="100%"
                                        style={{ border: "none", pointerEvents: "none" }}
                                        loading="lazy"
                                    />
                                    {/* Overlay actions */}
                                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                        <a
                                            href={`https://www.google.com/maps?q=${t.latitude},${t.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 bg-white/90 backdrop-blur-sm text-blue-600 rounded-lg shadow hover:bg-white transition"
                                            title="Buka di Google Maps"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                        <button
                                            onClick={() => openEdit(t)}
                                            className="p-1.5 bg-white/90 backdrop-blur-sm text-yellow-600 rounded-lg shadow hover:bg-white transition"
                                            title="Edit"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id, t.nama)}
                                            disabled={deleting === t.id}
                                            className="p-1.5 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg shadow hover:bg-white transition disabled:opacity-50"
                                            title="Hapus"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{t.nama}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                <Globe size={10} /> {t.kota}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                                            <Navigation size={11} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{t.latitude?.toFixed(6)}, {t.longitude?.toFixed(6)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── REKOMENDASI TERMINAL ───────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                <MapPin size={18} className="text-blue-500" />
                                Terminal Rekomendasi Jalur Mudik Aceh
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Koordinat sudah tervalidasi. Klik <b>Tambah</b> untuk mengisi form otomatis.
                            </p>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-full border border-blue-100">
                            {list.filter(t => TERMINAL_REKOMENDASI.some(r => r.nama === t.nama)).length}/{TERMINAL_REKOMENDASI.length} sudah ditambahkan
                        </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                        {TERMINAL_REKOMENDASI.map((r, i) => {
                            const sudahAda = list.some(t => t.nama === r.nama);
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition ${
                                        sudahAda
                                            ? "bg-green-50 border-green-200"
                                            : "bg-slate-50 border-slate-200 hover:border-blue-200 hover:bg-blue-50/40"
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-sm text-slate-800 truncate">{r.nama}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{r.kota} · {r.info}</p>
                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{r.latitude}, {r.longitude}</p>
                                    </div>
                                    {sudahAda ? (
                                        <span className="text-xs font-bold text-green-600 flex items-center gap-1 ml-3 shrink-0">
                                            <CheckCircle size={14} /> Sudah ada
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => isiRekomendasi(r)}
                                            className="ml-3 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl transition shrink-0 flex items-center gap-1 shadow-sm"
                                        >
                                            <Plus size={13} /> Tambah
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── PETA SEBARAN PEMUDIK ──────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin size={17} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800 text-base">Peta Sebaran Pemudik</h2>
                            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-medium ml-1">
                                Live Data
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 hidden md:block">Rute tampil jika ada peserta DITERIMA H-3 atau SIAP BERANGKAT</p>
                    </div>
                    <div className="h-[560px] w-full relative z-0">
                        <PetaSebaran />
                    </div>
                </div>
            </div>

            {/* ── MODAL TAMBAH / EDIT ─────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header modal */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                                    <MapPin size={18} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-base leading-none">
                                        {isEdit ? "Edit Terminal" : "Tambah Terminal Baru"}
                                    </h2>
                                    <p className="text-blue-200 text-xs mt-0.5">
                                        {isEdit ? `ID: ${form.id}` : "Data akan disimpan ke database"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2.5 rounded-xl mb-4 flex items-center gap-2">
                                    <AlertTriangle size={15} /> {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Nama Terminal */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                        Nama Terminal <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Contoh: Terminal Batoh"
                                        value={form.nama}
                                        onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                                    />
                                </div>

                                {/* Nama Kota */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                        Nama Kota <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Contoh: Banda Aceh"
                                        value={form.kota}
                                        onChange={e => setForm(f => ({ ...f, kota: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        Harus cocok persis dengan nama kota di data Rute agar terhubung ke peta
                                    </p>
                                </div>

                                {/* Paste koordinat langsung */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                        Tempel Koordinat (opsional)
                                    </label>
                                    <input
                                        className="w-full p-3 border border-dashed border-blue-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-blue-50/30 placeholder:text-slate-400"
                                        placeholder='Tempel "lat, lon" dari Google Maps (mis: 5.529939, 95.328827)'
                                        onPaste={e => {
                                            e.preventDefault();
                                            handlePasteKoordinat(e.clipboardData.getData("text"));
                                        }}
                                        onChange={e => handlePasteKoordinat(e.target.value)}
                                        value=""
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Dari Google Maps: klik lokasi → salin koordinat yang muncul → tempel di sini
                                    </p>
                                </div>

                                {/* Lat & Lon */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                            Latitude <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                            placeholder="5.529939"
                                            value={form.latitude}
                                            onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                            Longitude <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                            placeholder="95.328827"
                                            value={form.longitude}
                                            onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Preview peta otomatis */}
                                {showPreview && isValidCoord(form.latitude, form.longitude) && (
                                    <MiniMap
                                        lat={previewLat}
                                        lon={previewLon}
                                        nama={form.nama || "Lokasi dipilih"}
                                    />
                                )}
                            </div>

                            {/* Tombol aksi */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200"
                                >
                                    {saving ? (
                                        <><RefreshCw size={15} className="animate-spin" /> Menyimpan...</>
                                    ) : (
                                        <><Save size={15} /> {isEdit ? "Simpan Perubahan" : "Tambah Terminal"}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}