import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, User, Calendar, MapPin, Bus, Phone,
    Save, AlertCircle, Search, X, Trash2, ChevronDown,
    ChevronUp, Users, UploadCloud, FileText
} from 'lucide-react';
import { API, apiRequest, BASE_URL } from '../lib/api';

// ── TIPE ──────────────────────────────────────────────────────────────────────
interface PenumpangForm {
    id_unik: number;
    nama_peserta: string;
    nik_peserta: string;
    jenis_kelamin: string;
    tanggal_lahir: string;
    alamat_rumah: string;
    no_hp_peserta: string;
    jenis_identitas: string;
    foto_identitas: File | null;
    foto_preview: string;
    isExpanded: boolean;
}

const emptyPenumpang = (id: number): PenumpangForm => ({
    id_unik: id,
    nama_peserta: '',
    nik_peserta: '',
    jenis_kelamin: 'LAKI-LAKI',
    tanggal_lahir: '',
    alamat_rumah: '',
    no_hp_peserta: '',
    jenis_identitas: 'KTP',
    foto_identitas: null,
    foto_preview: '',
    isExpanded: true,
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
const hitungUmur = (tgl: string) => {
    if (!tgl) return null;
    const today = new Date();
    const birth = new Date(tgl);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const getKategori = (umur: number | null) => {
    if (umur === null) return 'DEWASA';
    if (umur < 2) return 'BAYI';
    if (umur < 17) return 'ANAK';
    return 'DEWASA';
};

const badgeKategori = (k: string) => {
    if (k === 'BAYI') return 'bg-pink-100 text-pink-700';
    if (k === 'ANAK') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
};

const formatDateTime = (dateRaw: any) => {
    if (!dateRaw) return 'Jadwal Menyusul';
    try {
        let dateObj: Date;
        if (Array.isArray(dateRaw)) {
            dateObj = new Date(dateRaw[0], dateRaw[1] - 1, dateRaw[2], dateRaw[3] || 0, dateRaw[4] || 0);
        } else {
            dateObj = new Date(dateRaw);
        }
        if (isNaN(dateObj.getTime())) return dateRaw;
        const tgl = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const jam = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${tgl} • ${jam} WIB`;
    } catch { return String(dateRaw); }
};

// ── KOMPONEN UTAMA ────────────────────────────────────────────────────────────
export default function AdminTambahPenumpang() {
    const navigate = useNavigate();

    // --- Data umum ---
    const [rutes, setRutes] = useState<any[]>([]);
    const [buses, setBuses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // --- Filter rute bertingkat (mirip DaftarMudik) ---
    const [selectedTujuan, setSelectedTujuan] = useState('');
    const [selectedTanggal, setSelectedTanggal] = useState('');
    const [ruteId, setRuteId] = useState('');
    const [kendaraanId, setKendaraanId] = useState('');

    // --- Kaitkan user (WAJIB) + pencarian ---
    const [userSearch, setUserSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const userSearchRef = useRef<HTMLDivElement>(null);

    // --- Daftar penumpang (maks 6) ---
    const [penumpangs, setPenumpangs] = useState<PenumpangForm[]>([emptyPenumpang(Date.now())]);

    // --- Status submit ---
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [results, setResults] = useState<{ nama: string; status: 'ok' | 'err'; pesan: string }[]>([]);

    // ── LOAD DATA ──────────────────────────────────────────────────
    useEffect(() => {
        loadRutes();
        loadUsers();
    }, []);

    useEffect(() => {
        if (ruteId) loadBuses(ruteId);
        else setBuses([]);
    }, [ruteId]);

    // Tutup dropdown user saat klik di luar
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const loadRutes = async () => {
        try {
            const data = await apiRequest<any[]>(API.RUTE, 'GET', undefined, false);
            setRutes(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const loadBuses = async (id: string) => {
        try {
            const data = await apiRequest<any[]>(`${BASE_URL}/api/admin/kendaraan?rute_id=${id}`);
            setBuses(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const loadUsers = async () => {
        try {
            const data = await apiRequest<any[]>(`${BASE_URL}/api/admin/users`);
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    // ── DROPDOWN RUTE BERTINGKAT ───────────────────────────────────
    const uniqueTujuan = Array.from(new Set(rutes.map(r => r.tujuan).filter(Boolean)));
    const ruteByTujuan = selectedTujuan ? rutes.filter(r => r.tujuan === selectedTujuan) : [];
    const uniqueTanggal = Array.from(
        new Set(ruteByTujuan.map(r => r.tanggal_berangkat || '').filter(Boolean))
    );
    const ruteByTanggal = selectedTanggal
        ? ruteByTujuan.filter(r => r.tanggal_berangkat === selectedTanggal)
        : [];
    const selectedRuteObj = rutes.find(r => r.rute_id?.toString() === ruteId);

    // ── PENCARIAN USER ─────────────────────────────────────────────
    const filteredUsers = users.filter(u => {
        if (!userSearch.trim()) return true;
        const q = userSearch.toLowerCase();
        return (
            (u.nama_lengkap || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.no_hp || '').includes(q) ||
            (u.nik || '').includes(q)
        );
    }).slice(0, 20); // tampilkan maks 20

    // ── MANAJEMEN DAFTAR PENUMPANG ─────────────────────────────────
    const tambahPenumpang = () => {
        if (penumpangs.length >= 6) return;
        setPenumpangs(prev => [
            ...prev.map(p => ({ ...p, isExpanded: false })),
            emptyPenumpang(Date.now()),
        ]);
    };

    const hapusPenumpang = (id: number) => {
        if (penumpangs.length <= 1) return;
        setPenumpangs(prev => prev.filter(p => p.id_unik !== id));
    };

    const toggleExpand = (id: number) => {
        setPenumpangs(prev => prev.map(p =>
            p.id_unik === id ? { ...p, isExpanded: !p.isExpanded } : p
        ));
    };

    const updatePenumpang = (id: number, field: keyof PenumpangForm, value: any) => {
        setPenumpangs(prev => prev.map(p => {
            if (p.id_unik !== id) return p;
            const updated = { ...p, [field]: value };
            return updated;
        }));
    };

    const handleFoto = (id: number, file: File | null) => {
        if (!file) return;
        const preview = URL.createObjectURL(file);
        setPenumpangs(prev => prev.map(p =>
            p.id_unik === id ? { ...p, foto_identitas: file, foto_preview: preview } : p
        ));
    };

    // ── SUBMIT ─────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setResults([]);

        // Validasi wajib
        if (!ruteId) { setError('Pilih Rute Tujuan terlebih dahulu!'); return; }
        if (!selectedUser) { setError('Akun user WAJIB dipilih untuk Go Show!'); return; }

        for (const p of penumpangs) {
            if (!p.nama_peserta.trim()) { setError(`Nama peserta wajib diisi!`); return; }
            if (!p.nik_peserta || p.nik_peserta.length !== 16) { setError(`NIK ${p.nama_peserta || 'peserta'} harus 16 digit!`); return; }
        }

        setLoading(true);
        const localResults: typeof results = [];

        for (const p of penumpangs) {
            try {
                // Upload foto jika ada
                let fotoPath: string | null = null;
                if (p.foto_identitas) {
                    const fd = new FormData();
                    fd.append('file', p.foto_identitas);
                    try {
                        const upRes = await fetch(`${BASE_URL}/api/upload`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                            body: fd,
                        });
                        if (upRes.ok) {
                            const upJson = await upRes.json();
                            fotoPath = upJson.filename || upJson.path || null;
                        }
                    } catch { /* foto gagal, lanjut */ }
                }

                const payload: any = {
                    rute_id: parseInt(ruteId),
                    user_id: selectedUser.user_id,
                    nama_peserta: p.nama_peserta.toUpperCase(),
                    nik_peserta: p.nik_peserta.trim(),
                    jenis_kelamin: p.jenis_kelamin,
                    tanggal_lahir: p.tanggal_lahir || null,
                    alamat_rumah: p.alamat_rumah || '-',
                    no_hp_peserta: p.no_hp_peserta || null,
                    jenis_identitas: p.jenis_identitas,
                    foto_identitas_path: fotoPath,
                };
                if (kendaraanId) payload.kendaraan_id = parseInt(kendaraanId);

                const json = await apiRequest<any>(API.ADMIN_TAMBAH_PENUMPANG, 'POST', payload);
                localResults.push({ nama: p.nama_peserta, status: 'ok', pesan: json.pesan || 'Berhasil ditambahkan' });
            } catch (err: any) {
                localResults.push({ nama: p.nama_peserta, status: 'err', pesan: err.message || 'Gagal' });
            }
        }

        setResults(localResults);
        const berhasil = localResults.filter(r => r.status === 'ok').length;
        const gagal = localResults.filter(r => r.status === 'err').length;

        if (berhasil > 0) {
            setSuccess(`✅ ${berhasil} penumpang berhasil didaftarkan${gagal > 0 ? `, ${gagal} gagal` : '!'}`);
            // Reset penumpang berhasil, sisakan yang gagal
            const namaGagal = localResults.filter(r => r.status === 'err').map(r => r.nama.toUpperCase());
            setPenumpangs(prev =>
                namaGagal.length > 0
                    ? prev.filter(p => namaGagal.includes(p.nama_peserta.toUpperCase()))
                    : [emptyPenumpang(Date.now())]
            );
        }
        if (gagal > 0 && berhasil === 0) setError('❌ Semua entri gagal. Periksa detail di bawah.');

        setLoading(false);
    };

    // ── RENDER ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/admin/verifikasi')}
                    className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2 transition mb-6"
                >
                    <ArrowLeft size={18} /> Kembali ke Verifikasi
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white">
                        <h1 className="text-xl font-bold flex items-center gap-3">
                            <Plus size={24} className="text-yellow-400" />
                            Tambah Penumpang Go Show (Admin)
                        </h1>
                        <p className="text-blue-100 text-sm mt-1">
                            Daftarkan penumpang on-the-spot. Akun user wajib dikaitkan. Maks. 6 penumpang per input.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* ── Alert ── */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl font-bold text-sm">
                                {success}
                            </div>
                        )}
                        {results.length > 0 && (
                            <div className="space-y-1.5">
                                {results.map((r, i) => (
                                    <div key={i} className={`text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-2 ${r.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        <span>{r.status === 'ok' ? '✅' : '❌'}</span>
                                        <span className="font-bold">{r.nama}</span>
                                        <span>— {r.pesan}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ════════════════════════════════════════
                            SEKSI 1: PILIH RUTE (Bertingkat)
                        ════════════════════════════════════════ */}
                        <section className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                            <label className="block font-bold text-slate-700 flex items-center gap-2">
                                <MapPin size={16} className="text-red-500" />
                                Pilih Tujuan & Jadwal <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-slate-400 -mt-2">Pilih kota tujuan → tanggal → jam keberangkatan.</p>

                            {/* Step 1: Kota Tujuan */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                                    Kota Tujuan
                                </p>
                                <select
                                    value={selectedTujuan}
                                    onChange={e => { setSelectedTujuan(e.target.value); setSelectedTanggal(''); setRuteId(''); }}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">-- Pilih Kota Tujuan --</option>
                                    {uniqueTujuan.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Tanggal */}
                            {selectedTujuan && uniqueTanggal.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                                        Tanggal Keberangkatan
                                    </p>
                                    <select
                                        value={selectedTanggal}
                                        onChange={e => { setSelectedTanggal(e.target.value); setRuteId(''); }}
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">-- Pilih Tanggal --</option>
                                        {uniqueTanggal.map(t => (
                                            <option key={t} value={t}>{formatDateTime(t)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Step 3: Jam / Rute spesifik */}
                            {selectedTanggal && ruteByTanggal.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                                        Jam Keberangkatan
                                    </p>
                                    <select
                                        value={ruteId}
                                        onChange={e => setRuteId(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        required
                                    >
                                        <option value="">-- Pilih Jam --</option>
                                        {ruteByTanggal.map(r => (
                                            <option key={r.rute_id} value={r.rute_id} disabled={(r.sisa_kuota ?? r.kuota_tersisa ?? 0) <= 0}>
                                                {r.jam_berangkat || r.waktu_berangkat || 'Lihat detail'} — Sisa: {r.sisa_kuota ?? r.kuota_tersisa ?? 0} kursi
                                                {(r.sisa_kuota ?? r.kuota_tersisa ?? 0) <= 0 ? ' (PENUH)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Info rute terpilih */}
                            {selectedRuteObj && (
                                <div className="bg-blue-100/60 rounded-xl px-4 py-2.5 text-xs text-blue-800 flex items-center gap-2">
                                    <MapPin size={13} />
                                    <span className="font-bold">{selectedRuteObj.asal || '-'} → {selectedRuteObj.tujuan}</span>
                                    <span className="text-blue-600">| Sisa: {selectedRuteObj.sisa_kuota ?? selectedRuteObj.kuota_tersisa ?? 0} kursi</span>
                                </div>
                            )}
                        </section>

                        {/* ════════════════════════════════════════
                            SEKSI 2: KAITKAN KE AKUN USER (WAJIB)
                        ════════════════════════════════════════ */}
                        <section className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-3">
                            <label className="block font-bold text-slate-700 flex items-center gap-2">
                                <User size={16} className="text-amber-600" />
                                Kaitkan ke Akun User <span className="text-red-500">*</span>
                                <span className="ml-auto text-xs font-normal bg-red-100 text-red-600 px-2 py-0.5 rounded-full">WAJIB</span>
                            </label>
                            <p className="text-xs text-amber-700 -mt-1">
                                Penumpang Go Show harus dikaitkan ke akun user terdaftar agar muncul di dashboard mereka.
                            </p>

                            {/* Jika sudah pilih user */}
                            {selectedUser ? (
                                <div className="flex items-center gap-3 bg-white border border-green-200 rounded-xl px-4 py-3">
                                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700 text-sm shrink-0">
                                        {(selectedUser.nama_lengkap || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800 truncate">{selectedUser.nama_lengkap}</p>
                                        <p className="text-xs text-slate-500 truncate">{selectedUser.email || selectedUser.no_hp} • NIK: {selectedUser.nik || '-'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                                        className="text-slate-400 hover:text-red-500 transition"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div ref={userSearchRef} className="relative">
                                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl bg-white px-3 focus-within:ring-2 focus-within:ring-blue-500">
                                        <Search size={15} className="text-slate-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                                            onFocus={() => setShowUserDropdown(true)}
                                            placeholder="Cari nama, email, no HP, atau NIK user..."
                                            className="flex-1 py-3 outline-none text-sm bg-transparent"
                                        />
                                        {userSearch && (
                                            <button type="button" onClick={() => setUserSearch('')} className="text-slate-400 hover:text-slate-600">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {showUserDropdown && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {filteredUsers.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">
                                                    {userSearch ? 'Tidak ditemukan' : 'Ketik untuk mencari user...'}
                                                </p>
                                            ) : (
                                                filteredUsers.map(u => (
                                                    <button
                                                        key={u.user_id}
                                                        type="button"
                                                        onClick={() => { setSelectedUser(u); setUserSearch(''); setShowUserDropdown(false); }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-3 transition border-b border-slate-50 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
                                                            {(u.nama_lengkap || 'U')[0].toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-sm text-slate-800 truncate">{u.nama_lengkap}</p>
                                                            <p className="text-xs text-slate-400 truncate">
                                                                {u.email || u.no_hp} {u.nik ? `• NIK: ${u.nik}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${u.status_akun === 'AKTIF' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {u.status_akun}
                                                        </span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* ════════════════════════════════════════
                            SEKSI 3: ASSIGN BUS (opsional)
                        ════════════════════════════════════════ */}
                        {buses.length > 0 && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1 uppercase">
                                    <Bus size={13} /> Assign Bus (Opsional)
                                </label>
                                <select
                                    value={kendaraanId}
                                    onChange={e => setKendaraanId(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">-- Tanpa Bus (Plotting nanti) --</option>
                                    {buses.map((b: any) => {
                                        const sisa = (b.kapasitas_total || 0) - (b.terisi || 0);
                                        return (
                                            <option key={b.id} value={b.id} disabled={sisa <= 0}>
                                                {b.nama_armada} ({b.plat_nomor}) — Sisa: {sisa}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {/* ════════════════════════════════════════
                            SEKSI 4: DAFTAR PENUMPANG (1-6)
                        ════════════════════════════════════════ */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Users size={16} className="text-blue-600" />
                                    Data Penumpang ({penumpangs.length}/6)
                                </h2>
                                {penumpangs.length < 6 && (
                                    <button
                                        type="button"
                                        onClick={tambahPenumpang}
                                        className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                                    >
                                        <Plus size={15} /> Tambah Penumpang
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {penumpangs.map((p, idx) => {
                                    const umur = hitungUmur(p.tanggal_lahir);
                                    const kategori = getKategori(umur);
                                    return (
                                        <div key={p.id_unik} className="border border-slate-200 rounded-2xl overflow-hidden">
                                            {/* Header kartu penumpang */}
                                            <div
                                                className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                                                onClick={() => toggleExpand(p.id_unik)}
                                            >
                                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-slate-800 truncate">
                                                        {p.nama_peserta || <span className="text-slate-400 font-normal">Penumpang {idx + 1}</span>}
                                                    </p>
                                                    {p.nama_peserta && (
                                                        <p className="text-xs text-slate-400">
                                                            {p.nik_peserta || '-'} •&nbsp;
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeKategori(kategori)}`}>{kategori}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {penumpangs.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={e => { e.stopPropagation(); hapusPenumpang(p.id_unik); }}
                                                            className="text-slate-300 hover:text-red-500 transition p-1"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                    {p.isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                </div>
                                            </div>

                                            {/* Form isian penumpang */}
                                            {p.isExpanded && (
                                                <div className="p-4 space-y-4 bg-white">
                                                    {/* Nama & NIK */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Lengkap *</label>
                                                            <input
                                                                type="text"
                                                                value={p.nama_peserta}
                                                                onChange={e => updatePenumpang(p.id_unik, 'nama_peserta', e.target.value.toUpperCase())}
                                                                placeholder="Sesuai KTP/Identitas"
                                                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">NIK (16 Digit) *</label>
                                                            <input
                                                                type="text"
                                                                value={p.nik_peserta}
                                                                onChange={e => updatePenumpang(p.id_unik, 'nik_peserta', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                                                placeholder="1234567890123456"
                                                                maxLength={16}
                                                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Tanggal Lahir & Jenis Kelamin */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1 uppercase">
                                                                <Calendar size={12} /> Tanggal Lahir
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={p.tanggal_lahir}
                                                                onChange={e => updatePenumpang(p.id_unik, 'tanggal_lahir', e.target.value)}
                                                                max={new Date().toISOString().split('T')[0]}
                                                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                            {umur !== null && (
                                                                <p className="text-xs mt-1 font-bold">
                                                                    Umur: {umur} thn →&nbsp;
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeKategori(kategori)}`}>{kategori}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Jenis Kelamin</label>
                                                            <select
                                                                value={p.jenis_kelamin}
                                                                onChange={e => updatePenumpang(p.id_unik, 'jenis_kelamin', e.target.value)}
                                                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                            >
                                                                <option value="LAKI-LAKI">Laki-laki</option>
                                                                <option value="PEREMPUAN">Perempuan</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Jenis Identitas */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1 uppercase">
                                                            <FileText size={12} /> Jenis Identitas
                                                        </label>
                                                        <select
                                                            value={p.jenis_identitas}
                                                            onChange={e => updatePenumpang(p.id_unik, 'jenis_identitas', e.target.value)}
                                                            className="w-full p-2.5 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                        >
                                                            <option value="KTP">KTP</option>
                                                            <option value="SIM">SIM</option>
                                                            <option value="PASPOR">Paspor</option>
                                                            <option value="AKTA_LAHIR">Akta Lahir</option>
                                                            <option value="KK">Kartu Keluarga</option>
                                                            <option value="LAINNYA">Lainnya</option>
                                                        </select>
                                                    </div>

                                                    {/* Alamat & No HP */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Alamat Domisili</label>
                                                            <input
                                                                type="text"
                                                                value={p.alamat_rumah}
                                                                onChange={e => updatePenumpang(p.id_unik, 'alamat_rumah', e.target.value)}
                                                                placeholder="Jl. Contoh No. 1, Kecamatan..."
                                                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1 uppercase">
                                                                <Phone size={12} /> No. HP / WhatsApp
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                value={p.no_hp_peserta}
                                                                onChange={e => updatePenumpang(p.id_unik, 'no_hp_peserta', e.target.value)}
                                                                placeholder="08xxx"
                                                                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Upload Foto Identitas */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1 uppercase">
                                                            <UploadCloud size={12} /> Foto Identitas
                                                            <span className="text-slate-400 font-normal normal-case ml-1">(opsional)</span>
                                                        </label>
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl px-4 py-2.5 transition text-sm text-slate-500 hover:text-blue-600">
                                                                <UploadCloud size={16} />
                                                                <span>{p.foto_identitas ? p.foto_identitas.name : 'Pilih foto...'}</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={e => handleFoto(p.id_unik, e.target.files?.[0] || null)}
                                                                />
                                                            </label>
                                                            {p.foto_preview && (
                                                                <img
                                                                    src={p.foto_preview}
                                                                    alt="preview"
                                                                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {penumpangs.length < 6 && (
                                <button
                                    type="button"
                                    onClick={tambahPenumpang}
                                    className="w-full mt-3 py-3 border-2 border-dashed border-blue-200 text-blue-500 hover:border-blue-400 hover:text-blue-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
                                >
                                    <Plus size={16} /> Tambah Penumpang Lagi (maks. 6)
                                </button>
                            )}
                        </div>

                        {/* ── TOMBOL SIMPAN ── */}
                        <button
                            type="submit"
                            disabled={loading || !ruteId || !selectedUser}
                            className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
                                : <><Save size={18} /> Simpan {penumpangs.length} Penumpang</>
                            }
                        </button>

                        {(!ruteId || !selectedUser) && (
                            <p className="text-center text-xs text-slate-400">
                                {!ruteId ? '⚠️ Pilih rute tujuan' : ''}
                                {!ruteId && !selectedUser ? ' & ' : ''}
                                {!selectedUser ? '⚠️ Pilih akun user' : ''}
                                {' '}untuk mengaktifkan tombol simpan.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}