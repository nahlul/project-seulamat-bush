import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bus, Trash2, Plus, ArrowLeft, Phone, User, Edit, Save, X,
    Copy, MapPin, ArrowRight, RefreshCw, Filter, Search,
    CheckCircle, AlertTriangle, ChevronDown, Clock
} from 'lucide-react';
import { API, UserAPI } from '../lib/api';

interface BusData {
    id: number;
    nama_armada: string;
    jenis_kendaraan: string;
    plat_nomor: string;
    kapasitas_total: number;
    terisi: number;
    nama_supir?: string;
    kontak_supir?: string;
    rute_id?: number;
    rute_tujuan?: string;
    rute_asal?: string;
    waktu_berangkat?: string;
}

const JENIS_OPTIONS = [
    { value: 'BUS BESAR', label: 'Bus Besar (40-50 seat)' },
    { value: 'BUS SEDANG', label: 'Bus Sedang (25-30 seat)' },
    { value: 'MINIBUS', label: 'Hiace / ELF (10-15 seat)' },
];

// ── MODAL DUPLIKASI BUS ─────────────────────────────────────────
function ModalDuplikat({ bus, rutes, onClose, onSuccess }: {
    bus: BusData;
    rutes: any[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [targetRuteId, setTargetRuteId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDuplicate = async () => {
        if (!targetRuteId) return alert('Pilih rute tujuan duplikasi!');
        if (!confirm(`Duplikat bus "${bus.nama_armada}" ke rute yang dipilih? Bus ini akan di-copy dengan data yang sama tetapi penumpang kosong.`)) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.ADMIN_KENDARAAN}?rute_id=${targetRuteId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nama_armada: bus.nama_armada,
                    jenis_kendaraan: bus.jenis_kendaraan,
                    plat_nomor: bus.plat_nomor,
                    kapasitas_total: bus.kapasitas_total,
                    nama_supir: bus.nama_supir || '',
                    kontak_supir: bus.kontak_supir || '',
                })
            });
            if (res.ok) {
                alert(`✅ Bus "${bus.nama_armada}" berhasil di-duplikat ke rute yang dipilih!`);
                onSuccess();
                onClose();
            } else {
                const j = await res.json();
                alert('Gagal: ' + (j.error || 'Coba lagi'));
            }
        } catch { alert('Gagal koneksi ke server'); }
        finally { setLoading(false); }
    };

    const targetRute = rutes.find(r => String(r.rute_id) === targetRuteId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-base flex items-center gap-2"><Copy size={16} /> Duplikat Bus ke Rute Lain</h3>
                        <p className="text-white/70 text-xs mt-0.5">Bus yang sama digunakan di rute / jadwal berbeda</p>
                    </div>
                    <button onClick={onClose} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Info bus */}
                    <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                        <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">Bus yang diduplikat</p>
                        <p className="font-bold text-slate-800">{bus.nama_armada}</p>
                        <div className="flex gap-3 text-xs text-slate-500 mt-1">
                            <span className="bg-white px-2 py-0.5 rounded border font-mono">{bus.plat_nomor || '—'}</span>
                            <span>{bus.jenis_kendaraan}</span>
                            <span>Kapasitas: {bus.kapasitas_total} kursi</span>
                        </div>
                        {bus.rute_tujuan && (
                            <p className="text-xs text-purple-600 font-bold mt-2 flex items-center gap-1">
                                <MapPin size={11} /> Rute saat ini: {bus.rute_asal} → {bus.rute_tujuan}
                                {bus.waktu_berangkat && <span className="text-slate-400 font-normal ml-1">({bus.waktu_berangkat})</span>}
                            </p>
                        )}
                    </div>

                    {/* Pilih rute target */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Rute Tujuan Duplikat
                        </label>
                        <select
                            value={targetRuteId}
                            onChange={e => setTargetRuteId(e.target.value)}
                            className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                        >
                            <option value="">— Pilih Rute Tujuan —</option>
                            {rutes.map(r => (
                                <option key={r.rute_id} value={r.rute_id} disabled={String(r.rute_id) === String(bus.rute_id)}>
                                    {r.asal} → {r.tujuan} {r.waktu_berangkat ? `(${r.waktu_berangkat})` : ''} {String(r.rute_id) === String(bus.rute_id) ? '✓ Rute saat ini' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {targetRute && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs">
                            <p className="font-bold text-green-700 flex items-center gap-1"><CheckCircle size={12} /> Akan diduplikat ke:</p>
                            <p className="text-slate-700 mt-1 font-medium">{targetRute.asal} → {targetRute.tujuan}</p>
                            {targetRute.waktu_berangkat && <p className="text-slate-500 flex items-center gap-1 mt-0.5"><Clock size={10} /> {targetRute.waktu_berangkat}</p>}
                            <p className="text-green-600 mt-1">Penumpang bus baru = 0 (kosong)</p>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                        <p className="font-bold flex items-center gap-1"><AlertTriangle size={12} /> Catatan:</p>
                        <p className="mt-1 leading-relaxed">Bus duplikat hanya menyalin data armada & supir. Penumpang tidak ikut diduplikat. Gunakan fitur ini jika bus sudah selesai melayani satu rute dan siap untuk rute/jadwal baru.</p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition">Batal</button>
                        <button
                            onClick={handleDuplicate}
                            disabled={!targetRuteId || loading}
                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                        >
                            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Copy size={16} />}
                            Duplikat Sekarang
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── MODAL EDIT BUS ──────────────────────────────────────────────
function ModalEditBus({ bus, rutes, onClose, onSuccess }: {
    bus: BusData;
    rutes: any[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        nama_armada: bus.nama_armada,
        jenis_kendaraan: bus.jenis_kendaraan,
        plat_nomor: bus.plat_nomor,
        kapasitas_total: bus.kapasitas_total,
        nama_supir: bus.nama_supir || '',
        kontak_supir: bus.kontak_supir || '',
    });
    // ruteIdBaru: string kosong = tidak ganti rute, isi = ganti ke rute ini
    const [ruteIdBaru, setRuteIdBaru] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            // Hanya tambah query param kalau admin memilih rute baru
            const queryParam = ruteIdBaru ? `?rute_id=${ruteIdBaru}` : `?rute_id=${bus.rute_id}`;
            const res = await fetch(`${API.ADMIN_KENDARAAN}/${bus.id}${queryParam}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            if (res.ok) { alert('✅ Bus berhasil diperbarui!'); onSuccess(); onClose(); }
            else { const j = await res.json(); alert('Gagal: ' + (j.error || 'Coba lagi')); }
        } catch { alert('Gagal koneksi ke server'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-5 text-white flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-base flex items-center gap-2"><Edit size={16} /> Edit Data Bus</h3>
                        <p className="text-white/70 text-xs mt-0.5">{bus.nama_armada}</p>
                    </div>
                    <button onClick={onClose} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition"><X size={18} /></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nama PO / Bus</label>
                        <input required type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                            value={form.nama_armada} onChange={e => setForm({ ...form, nama_armada: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Plat Nomor</label>
                            <input required type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-mono"
                                value={form.plat_nomor} onChange={e => setForm({ ...form, plat_nomor: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Kapasitas Kursi</label>
                            <input required type="number" className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-center"
                                value={form.kapasitas_total} onChange={e => setForm({ ...form, kapasitas_total: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Jenis Kendaraan</label>
                        <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                            value={form.jenis_kendaraan} onChange={e => setForm({ ...form, jenis_kendaraan: e.target.value })}>
                            {JENIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Rute Saat Ini</label>
                        <div className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm text-slate-600 font-medium">
                            {bus.rute_asal && bus.rute_tujuan
                                ? `${bus.rute_asal} → ${bus.rute_tujuan}`
                                : <span className="text-slate-400 italic">Belum ada rute</span>}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Ganti Rute <span className="font-normal text-slate-400 normal-case">(kosongkan jika tidak ingin ganti)</span>
                        </label>
                        <select className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm"
                            value={ruteIdBaru} onChange={e => setRuteIdBaru(e.target.value)}>
                            <option value="">— Tetap di rute sekarang —</option>
                            {rutes.filter(r => String(r.rute_id) !== String(bus.rute_id)).map(r => (
                                <option key={r.rute_id} value={r.rute_id}>
                                    {r.asal} → {r.tujuan} {r.waktu_berangkat ? `(${r.waktu_berangkat})` : ''}
                                </option>
                            ))}
                        </select>
                        {ruteIdBaru && (
                            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                                <AlertTriangle size={11} /> Rute bus akan dipindah. Penumpang yang sudah di-plotting tetap di rute lama.
                            </p>
                        )}
                    </div>
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase">Info Supir</p>
                        <div className="flex items-center gap-2">
                            <User size={15} className="text-slate-400 shrink-0" />
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" placeholder="Nama Supir"
                                value={form.nama_supir} onChange={e => setForm({ ...form, nama_supir: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone size={15} className="text-slate-400 shrink-0" />
                            <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" placeholder="No HP Supir"
                                value={form.kontak_supir} onChange={e => setForm({ ...form, kontak_supir: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition">Batal</button>
                        <button type="submit" disabled={saving} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-yellow-200">
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function AdminKendaraan() {
    const navigate = useNavigate();
    const [rutes, setRutes] = useState<any[]>([]);
    const [selectedRute, setSelectedRute] = useState<string>('');
    const [buses, setBuses] = useState<BusData[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [editBus, setEditBus] = useState<BusData | null>(null);
    const [duplikatBus, setDuplikatBus] = useState<BusData | null>(null);

    const [form, setForm] = useState({
        nama_armada: '',
        jenis_kendaraan: 'BUS BESAR',
        plat_nomor: '',
        kapasitas_total: 40,
        nama_supir: '',
        kontak_supir: '',
    });

    useEffect(() => {
        loadRutes();
        loadBuses('');
    }, []);

    const loadRutes = async () => {
        try {
            const res = await UserAPI.getRute();
            setRutes(res);
        } catch (e) { console.error(e); }
    };

    const loadBuses = async (ruteIdVal: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = ruteIdVal
                ? `${API.ADMIN_KENDARAAN}?rute_id=${ruteIdVal}`
                : API.ADMIN_KENDARAAN;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Gagal');
            const data = await res.json();
            setBuses(Array.isArray(data) ? data : []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const handleRuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedRute(val);
        loadBuses(val);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus bus ini? Kuota rute akan berkurang otomatis!')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API.ADMIN_KENDARAAN}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            loadBuses(selectedRute);
        } catch { alert('Gagal hapus'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRute) return alert('Wajib pilih Rute dulu!');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.ADMIN_KENDARAAN}?rute_id=${selectedRute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('✅ Bus Berhasil Ditambahkan!');
                setForm({ nama_armada: '', jenis_kendaraan: 'BUS BESAR', plat_nomor: '', kapasitas_total: 40, nama_supir: '', kontak_supir: '' });
                loadBuses(selectedRute);
            } else {
                const j = await res.json();
                alert('Gagal: ' + (j.error || 'Cek koneksi'));
            }
        } catch { alert('Error koneksi'); }
    };

    const filteredBuses = buses.filter(b =>
        !search || b.nama_armada.toLowerCase().includes(search.toLowerCase()) ||
        (b.plat_nomor || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.rute_tujuan || '').toLowerCase().includes(search.toLowerCase())
    );

    const namaRuteSelected = rutes.find(r => String(r.rute_id) === selectedRute);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

            {/* ── TOP BAR ── */}
            <div className="bg-gradient-to-r from-slate-900 to-purple-900 text-white px-6 py-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-extrabold flex items-center gap-2"><Bus size={20} /> Manajemen Armada Bus</h1>
                        <p className="text-slate-400 text-xs">Tambah, edit, dan duplikat bus per rute keberangkatan</p>
                    </div>
                </div>
                <button onClick={() => loadBuses(selectedRute)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition" title="Refresh">
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── KOLOM KIRI: FORM ── */}
                <div className="lg:col-span-1 space-y-5">

                    {/* Pilih Rute */}
                    <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm p-5">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Langkah 1</p>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Pilih Rute Tujuan <span className="text-red-500">*</span></label>
                        <select
                            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 text-sm font-medium"
                            value={selectedRute}
                            onChange={handleRuteChange}
                        >
                            <option value="">— Semua Rute (hanya lihat) —</option>
                            {rutes.map((r: any) => (
                                <option key={r.rute_id} value={r.rute_id}>
                                    {r.asal} → {r.tujuan} {r.waktu_berangkat ? `| ${r.waktu_berangkat}` : ''}
                                </option>
                            ))}
                        </select>
                        {namaRuteSelected && (
                            <div className="mt-3 bg-purple-50 rounded-xl p-3 text-xs">
                                <p className="font-bold text-purple-700 flex items-center gap-1">
                                    <MapPin size={11} /> {namaRuteSelected.asal} → {namaRuteSelected.tujuan}
                                </p>
                                {namaRuteSelected.waktu_berangkat && (
                                    <p className="text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={10} /> {namaRuteSelected.waktu_berangkat}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Form Tambah Bus */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-purple-100 p-2 rounded-xl text-purple-600"><Plus size={16} /></div>
                            <div>
                                <p className="text-xs font-bold text-purple-600 uppercase">Langkah 2</p>
                                <p className="text-sm font-bold text-slate-700">Tambah Bus Baru</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nama PO / Armada <span className="text-red-500">*</span></label>
                                <input required type="text" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                                    placeholder="Contoh: Sempati Star 01"
                                    value={form.nama_armada} onChange={e => setForm({ ...form, nama_armada: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Plat Nomor</label>
                                    <input required type="text" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-none"
                                        placeholder="BL 1234 AA"
                                        value={form.plat_nomor} onChange={e => setForm({ ...form, plat_nomor: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Kapasitas</label>
                                    <input required type="number" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-purple-400 outline-none"
                                        value={form.kapasitas_total} onChange={e => setForm({ ...form, kapasitas_total: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Jenis Kendaraan</label>
                                <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                                    value={form.jenis_kendaraan} onChange={e => setForm({ ...form, jenis_kendaraan: e.target.value })}>
                                    {JENIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2.5">Info Supir (Opsional)</p>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <User size={15} className="text-slate-400 shrink-0" />
                                        <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" placeholder="Nama Supir"
                                            value={form.nama_supir} onChange={e => setForm({ ...form, nama_supir: e.target.value })} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone size={15} className="text-slate-400 shrink-0" />
                                        <input type="text" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" placeholder="No HP Supir"
                                            value={form.kontak_supir} onChange={e => setForm({ ...form, kontak_supir: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedRute}
                                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition text-sm"
                            >
                                {selectedRute ? '+ Simpan Bus ke Rute Ini' : '☝️ Pilih Rute Terlebih Dahulu'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── KOLOM KANAN: TABEL BUS ── */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {/* Table Header */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 font-bold text-slate-700 flex-1">
                            <Bus size={18} className="text-purple-600" />
                            Daftar Armada {selectedRute ? `— ${namaRuteSelected?.asal} → ${namaRuteSelected?.tujuan}` : '— Semua Rute'}
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
                            {filteredBuses.length} Unit
                        </span>

                        {/* Search bus */}
                        <div className="relative min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari bus / plat..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                            />
                        </div>
                    </div>

                    {/* Stats row */}
                    {buses.length > 0 && (
                        <div className="px-4 py-2.5 border-b border-slate-100 flex gap-4 text-xs text-slate-500 bg-slate-50/50">
                            <span>Total kursi: <b className="text-slate-700">{buses.reduce((s, b) => s + (b.kapasitas_total || 0), 0)}</b></span>
                            <span>Terisi: <b className="text-blue-600">{buses.reduce((s, b) => s + (b.terisi || 0), 0)}</b></span>
                            <span>Sisa: <b className="text-green-600">{buses.reduce((s, b) => s + ((b.kapasitas_total || 0) - (b.terisi || 0)), 0)}</b></span>
                            <span>Bus penuh: <b className="text-red-500">{buses.filter(b => b.terisi >= b.kapasitas_total).length}</b></span>
                        </div>
                    )}

                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 sticky top-0">
                                <tr>
                                    <th className="px-5 py-3 font-bold">Armada & Rute</th>
                                    <th className="px-5 py-3 font-bold">Supir & Kontak</th>
                                    <th className="px-5 py-3 text-center font-bold">Kapasitas</th>
                                    <th className="px-5 py-3 text-center font-bold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-10 text-center text-slate-400">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-30" /> Memuat data...
                                    </td></tr>
                                ) : filteredBuses.length === 0 ? (
                                    <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">
                                        {buses.length === 0 ? 'Belum ada bus. Pilih rute dan tambah bus baru.' : 'Tidak ada bus yang sesuai pencarian.'}
                                    </td></tr>
                                ) : filteredBuses.map((b) => {
                                    const sisa = (b.kapasitas_total || 0) - (b.terisi || 0);
                                    const penuh = sisa <= 0;
                                    return (
                                        <tr key={b.id} className="hover:bg-purple-50/30 transition">
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-800 text-sm">{b.nama_armada}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{b.plat_nomor || '—'}</span>
                                                    <span className="text-xs text-purple-600 font-bold">{b.jenis_kendaraan}</span>
                                                </div>

                                                {/* ✅ RUTE selalu tampil untuk setiap bus */}
                                                <div className="mt-2 flex items-center gap-1 text-xs">
                                                    {b.rute_tujuan ? (
                                                        <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
                                                            <MapPin size={10} className="text-blue-400 shrink-0" />
                                                            <span className="text-blue-700 font-semibold">{b.rute_asal || '?'}</span>
                                                            <ArrowRight size={9} className="text-blue-300" />
                                                            <span className="text-blue-700 font-semibold">{b.rute_tujuan}</span>
                                                            {b.waktu_berangkat && (
                                                                <span className="text-blue-400 ml-1 flex items-center gap-0.5">
                                                                    <Clock size={9} /> {b.waktu_berangkat}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-400 italic">
                                                            <MapPin size={10} className="shrink-0" />
                                                            <span className="text-[11px]">Belum ada rute</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {b.nama_supir ? (
                                                    <div>
                                                        <div className="font-medium text-slate-700 flex items-center gap-1 text-xs"><User size={12} /> {b.nama_supir}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone size={11} /> {b.kontak_supir || '—'}</div>
                                                    </div>
                                                ) : <span className="text-slate-300 text-xs italic">Belum ada supir</span>}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {/* Progress ring visual */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-lg font-black">
                                                        <span className={penuh ? 'text-red-500' : 'text-green-600'}>{b.terisi}</span>
                                                        <span className="text-slate-300 text-sm"> / {b.kapasitas_total}</span>
                                                    </div>
                                                    <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-1.5 rounded-full ${penuh ? 'bg-red-500' : sisa <= 5 ? 'bg-orange-400' : 'bg-green-500'}`}
                                                            style={{ width: `${b.kapasitas_total > 0 ? Math.min(100, (b.terisi / b.kapasitas_total) * 100) : 0}%` }}
                                                        />
                                                    </div>
                                                    {penuh ? (
                                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">PENUH</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">Sisa {sisa}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => setEditBus(b)}
                                                        title="Edit data bus"
                                                        className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg transition border border-yellow-100"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                    {/* Duplikat */}
                                                    <button
                                                        onClick={() => setDuplikatBus(b)}
                                                        title="Duplikat bus ke rute lain"
                                                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition border border-indigo-100"
                                                    >
                                                        <Copy size={15} />
                                                    </button>
                                                    {/* Hapus */}
                                                    <button
                                                        onClick={() => handleDelete(b.id)}
                                                        title="Hapus bus"
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition border border-red-100"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {editBus && (
                <ModalEditBus
                    bus={editBus}
                    rutes={rutes}
                    onClose={() => setEditBus(null)}
                    onSuccess={() => loadBuses(selectedRute)}
                />
            )}
            {duplikatBus && (
                <ModalDuplikat
                    bus={duplikatBus}
                    rutes={rutes}
                    onClose={() => setDuplikatBus(null)}
                    onSuccess={() => loadBuses(selectedRute)}
                />
            )}
        </div>
    );
}