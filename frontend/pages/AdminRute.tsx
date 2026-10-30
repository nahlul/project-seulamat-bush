import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    MapPin, Calendar, Users, Edit, Trash2, Plus, X, Save, Clock,
    ArrowRight, ToggleLeft, ToggleRight, Bell,
    ChevronDown, ChevronUp, Phone, Bus, Eye, Search,
    Filter, RefreshCw, ArrowLeft, CalendarDays, Hash, CheckCircle,
    LayoutGrid, AlertCircle, Home, Pencil, Check, UserCheck,
    XCircle, ChevronRight, Loader2, AlertTriangle, Info, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from '../lib/api';
import { useNotification } from '../context/NotificationContext';

// ─────────────────────────────────────────────────────────────────
// TIPE
// ─────────────────────────────────────────────────────────────────
interface Rute {
    rute_id: number;
    asal: string;
    tujuan: string;
    waktu_berangkat: string;
    kuota_total: number;
    kuota_terisi: number;
    kuota_fix: number;
    kuota_menunggu: number;
    total_daftar: number;
    sisa_kuota: number;
    is_portal_open: boolean;
    tanggal_raw?: any;
}

interface Bus {
    id: number;
    nama_armada: string;
    jenis_kendaraan: string;
    plat_nomor: string;
    kapasitas_total: number;
    terisi: number;
    nama_supir: string;
    kontak_supir: string;
    rute_id: number;
}

interface Peserta {
    id: number;
    nama_peserta: string;
    nik_peserta: string;
    kategori: string;
    status: string;
    no_hp_target: string;
    nama_bus: string;
    nama_kepala_keluarga: string;
    id_keluarga: number;
}

interface KelompokKeluarga {
    id_keluarga: number;
    nama_kepala: string;
    anggota: Peserta[];
    nama_bus: string;
    kendaraan_id: number | null;
    sudah_plotting: boolean;
    jumlah_anggota: number;
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
    'SIAP BERANGKAT': 'bg-green-100 text-green-700 border-green-200',
    'TERKONFIRMASI': 'bg-green-100 text-green-700 border-green-200',
    'DITERIMA H-3': 'bg-blue-100 text-blue-700 border-blue-200',
    'DITOLAK': 'bg-red-100 text-red-700 border-red-200',
    'DIBATALKAN': 'bg-slate-100 text-slate-500 border-slate-200',
};

const getStatusBadge = (s: string) => {
    const key = Object.keys(STATUS_BADGE).find(k => (s || '').toUpperCase().replace(/_/g, ' ').includes(k));
    return STATUS_BADGE[key || ''] || 'bg-amber-100 text-amber-700 border-amber-200';
};

function formatTanggalJam(tanggal_raw: any) {
    if (!tanggal_raw) return { tanggal: 'Belum diatur', jam: '-', full: 'Jadwal belum diatur' };
    try {
        let dt: Date;
        if (Array.isArray(tanggal_raw)) {
            const [y, m, d, h, min] = tanggal_raw;
            dt = new Date(y, m - 1, d, h, min);
        } else {
            dt = new Date(String(tanggal_raw));
        }
        const pad = (n: number) => String(n).padStart(2, '0');
        const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dt.getDay()];
        const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'][dt.getMonth()];
        const tanggal = `${hari}, ${pad(dt.getDate())} ${bulan} ${dt.getFullYear()}`;
        const jam = `${pad(dt.getHours())}:${pad(dt.getMinutes())} WIB`;
        return { tanggal, jam, full: `${tanggal} · ${jam}` };
    } catch {
        return { tanggal: 'Format error', jam: '-', full: '-' };
    }
}

function getToken() { return localStorage.getItem('token') || ''; }

// ─────────────────────────────────────────────────────────────────
// QUICK EDIT BAR
// ─────────────────────────────────────────────────────────────────
function QuickEditBar({ rute, onSave, onClose }: { rute: Rute; onSave: () => void; onClose: () => void }) {
    const [tgl, setTgl] = useState(() => {
        if (!rute.tanggal_raw) return '';
        if (Array.isArray(rute.tanggal_raw)) {
            const [y, m, d, h, min] = rute.tanggal_raw;
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
        }
        return String(rute.tanggal_raw).slice(0, 16);
    });
    const [kuota, setKuota] = useState(rute.kuota_total);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API.RUTE}/${rute.rute_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ asal: rute.asal, tujuan: rute.tujuan, kuota_total: kuota, tanggal_keberangkatan: tgl ? `${tgl}:00` : '' })
            });
            if (res.ok) { onSave(); onClose(); }
            else { const j = await res.json(); alert('Gagal: ' + (j.error || 'Coba lagi')); }
        } catch { alert('Gagal terhubung ke server'); }
        finally { setSaving(false); }
    };

    return (
        <tr>
            <td colSpan={4} className="bg-yellow-50/60 border-y border-yellow-200 px-6 py-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-bold text-yellow-800 mb-1.5 flex items-center gap-1"><CalendarDays size={12} /> Tanggal & Waktu Berangkat</label>
                        <input type="datetime-local" value={tgl} onChange={e => setTgl(e.target.value)} className="p-2.5 border-2 border-yellow-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-yellow-400 outline-none font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-yellow-800 mb-1.5 flex items-center gap-1"><Hash size={12} /> Total Kuota Kursi</label>
                        <input type="number" min={rute.kuota_terisi} value={kuota} onChange={e => setKuota(parseInt(e.target.value) || 0)} className="p-2.5 border-2 border-yellow-300 rounded-xl text-sm bg-white w-32 focus:ring-2 focus:ring-yellow-400 outline-none font-bold text-lg text-center" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-60">
                            {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle size={15} />} Simpan
                        </button>
                        <button onClick={onClose} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                    </div>
                    <p className="text-xs text-yellow-700 opacity-70">Min kuota = {rute.kuota_terisi} (peserta sudah DITERIMA H-3 ke atas)</p>
                </div>
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────────
// MODAL FORM BUS (Tambah / Edit)
// ─────────────────────────────────────────────────────────────────
const BUS_FORM_BLANK = { nama_armada: '', jenis_kendaraan: 'Bus Besar', plat_nomor: '', kapasitas_total: 40, nama_supir: '', kontak_supir: '' };

function BusFormModal({
    ruteId, bus, onSaved, onClose
}: {
    ruteId: number;
    bus: Bus | null;
    onSaved: () => void;
    onClose: () => void;
}) {
    const isEdit = !!bus;
    const [form, setForm] = useState(bus ? {
        nama_armada: bus.nama_armada || '',
        jenis_kendaraan: bus.jenis_kendaraan || 'Bus Besar',
        plat_nomor: bus.plat_nomor || '',
        kapasitas_total: bus.kapasitas_total || 40,
        nama_supir: bus.nama_supir || '',
        kontak_supir: bus.kontak_supir || '',
    } : { ...BUS_FORM_BLANK });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.nama_armada.trim()) { setErr('Nama armada wajib diisi'); return; }
        if (form.kapasitas_total < 1) { setErr('Kapasitas minimal 1'); return; }
        setSaving(true); setErr('');
        try {
            const url = isEdit
                ? `${API.ADMIN_KENDARAAN}/${bus!.id}?rute_id=${ruteId}`
                : `${API.ADMIN_KENDARAAN}?rute_id=${ruteId}`;
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(form)
            });
            if (res.ok) { onSaved(); onClose(); }
            else { const j = await res.json(); setErr(j.error || 'Gagal menyimpan'); }
        } catch { setErr('Gagal terhubung ke server'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between ${isEdit ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white/20 p-2 rounded-xl"><Bus size={18} /></div>
                        <div>
                            <h3 className="font-extrabold text-base">{isEdit ? 'Edit Bus' : 'Tambah Bus Baru'}</h3>
                            <p className="text-white/70 text-xs">{isEdit ? 'Perbarui data armada' : 'Daftarkan armada ke rute ini'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition text-white"><X size={18} /></button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    {err && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                            <AlertCircle size={15} className="shrink-0" /> {err}
                        </div>
                    )}

                    {/* Nama Armada */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Nama Armada <span className="text-red-400">*</span></label>
                        <input value={form.nama_armada} onChange={e => set('nama_armada', e.target.value)} placeholder="Contoh: BUS 01, BUS MAJU JAYA" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-300" />
                    </div>

                    {/* Jenis + Plat */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Jenis Kendaraan</label>
                            <select value={form.jenis_kendaraan} onChange={e => set('jenis_kendaraan', e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                                {['Bus Besar', 'Bus Sedang', 'Mini Bus', 'HiAce', 'Avanza', 'Lainnya'].map(j => <option key={j}>{j}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Plat Nomor</label>
                            <input value={form.plat_nomor} onChange={e => set('plat_nomor', e.target.value.toUpperCase())} placeholder="BL 1234 AB" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-300" />
                        </div>
                    </div>

                    {/* Kapasitas */}
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                        <label className="text-xs font-bold text-purple-800 block mb-2 flex items-center gap-1"><Users size={12} /> Kapasitas Kursi <span className="text-red-400">*</span></label>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => set('kapasitas_total', Math.max(1, form.kapasitas_total - 5))} className="w-9 h-9 rounded-xl bg-white border-2 border-purple-300 text-purple-700 font-bold text-lg hover:bg-purple-100 transition flex items-center justify-center"><Minus size={16} /></button>
                            <input type="number" min={1} value={form.kapasitas_total} onChange={e => set('kapasitas_total', parseInt(e.target.value) || 1)} className="flex-1 border-2 border-purple-300 rounded-xl px-3 py-2 text-2xl font-black text-center text-slate-800 bg-white outline-none focus:ring-2 focus:ring-purple-400" />
                            <button type="button" onClick={() => set('kapasitas_total', form.kapasitas_total + 5)} className="w-9 h-9 rounded-xl bg-white border-2 border-purple-300 text-purple-700 font-bold text-lg hover:bg-purple-100 transition flex items-center justify-center"><Plus size={16} /></button>
                        </div>
                        <div className="flex gap-2 mt-2.5">
                            {[20, 30, 40, 50].map(n => (
                                <button key={n} type="button" onClick={() => set('kapasitas_total', n)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${form.kapasitas_total === n ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}>{n}</button>
                            ))}
                        </div>
                    </div>

                    {/* Supir */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Nama Supir</label>
                            <input value={form.nama_supir} onChange={e => set('nama_supir', e.target.value)} placeholder="Nama supir" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-300" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Kontak Supir</label>
                            <input value={form.kontak_supir} onChange={e => set('kontak_supir', e.target.value)} placeholder="08xxxxxxxxxx" className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-300" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Batal</button>
                        <button onClick={handleSubmit} disabled={saving} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition disabled:opacity-60 ${isEdit ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isEdit ? 'Simpan Perubahan' : 'Tambah Bus'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// SUB-MODAL: CHECKLIST SPLIT INDIVIDU KE BUS LAIN
// ─────────────────────────────────────────────────────────────────
function SplitIndividuModal({
    kel, busList, busKuotaLive, onSaved, onClose
}: {
    kel: KelompokKeluarga;
    busList: Bus[];
    busKuotaLive: Record<number, number>;
    onSaved: () => void;
    onClose: () => void;
}) {
    // checked = set pendaftaran_id yang dipilih untuk dipindah
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [targetBusId, setTargetBusId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const toggle = (id: number) => setChecked(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleAll = () => {
        if (checked.size === kel.anggota.length) setChecked(new Set());
        else setChecked(new Set(kel.anggota.map(a => a.id)));
    };

    const targetBus = busList.find(b => b.id === targetBusId);
    const sisBusTarget = targetBus ? (targetBus.kapasitas_total || 0) - (busKuotaLive[targetBus.id] ?? targetBus.terisi ?? 0) : 0;
    const checkedCount = checked.size;
    const cukup = targetBus ? sisBusTarget >= checkedCount : false;

    // Tampilkan bus selain bus saat ini anggota (bisa berbeda-beda)
    const busOptions = busList.filter(b => {
        // Exclude bus yang SEMUA anggota terpilih sudah ada di sana
        const terpilih = kel.anggota.filter(a => checked.has(a.id));
        return terpilih.some(a => a.nama_bus !== b.nama_armada) || terpilih.length === 0;
    });

    const handleSplit = async () => {
        if (checked.size === 0) { setErr('Pilih minimal 1 anggota untuk dipindah'); return; }
        if (!targetBusId) { setErr('Pilih bus tujuan terlebih dahulu'); return; }
        if (!cukup) { setErr(`Bus tujuan tidak cukup — sisa ${sisBusTarget} kursi, butuh ${checkedCount}`); return; }
        setSaving(true); setErr('');
        try {
            const res = await fetch(`${API.BASE_URL}/api/admin/assign-bus-individual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ pendaftaran_ids: Array.from(checked), kendaraan_id: targetBusId })
            });
            const j = await res.json();
            if (res.ok) { onSaved(); onClose(); }
            else setErr(j.error || 'Gagal memindah peserta');
        } catch { setErr('Gagal terhubung ke server'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-base">Split Anggota Keluarga</h3>
                            <p className="text-white/70 text-xs">Pindahkan sebagian anggota ke bus lain</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition text-white"><X size={18} /></button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Info KK */}
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Home size={16} className="text-orange-600 shrink-0" />
                        <div>
                            <p className="font-bold text-orange-900 text-sm">{kel.nama_kepala}</p>
                            <p className="text-orange-600 text-xs">{kel.jumlah_anggota} anggota keluarga</p>
                        </div>
                        {kel.sudah_plotting && (
                            <span className="ml-auto flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">
                                <Bus size={10} />{kel.nama_bus}
                            </span>
                        )}
                    </div>

                    {/* Checklist anggota */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilih anggota yang akan dipindah</p>
                            <button onClick={toggleAll} className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition">
                                {checked.size === kel.anggota.length ? 'Batal semua' : 'Pilih semua'}
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {kel.anggota.map((a) => {
                                const isChecked = checked.has(a.id);
                                return (
                                    <label key={a.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${isChecked ? 'bg-orange-50' : 'bg-white hover:bg-slate-50'}`}>
                                        {/* Custom checkbox */}
                                        <div onClick={() => toggle(a.id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${a.kategori === 'DEWASA' ? 'bg-blue-500' : a.kategori === 'ANAK' ? 'bg-purple-500' : 'bg-pink-400'}`}>
                                            {(a.nama_peserta || '?').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">{a.nama_peserta}</p>
                                            <p className="text-[10px] text-slate-400">{a.kategori} · {a.nik_peserta}</p>
                                        </div>
                                        {/* Bus sekarang */}
                                        <div className="shrink-0 text-right">
                                            {a.nama_bus && a.nama_bus !== 'Belum Plotting'
                                                ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200"><Bus size={9}/>{a.nama_bus}</span>
                                                : <span className="text-[10px] text-slate-300 italic">Belum</span>
                                            }
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        {checkedCount > 0 && (
                            <p className="text-xs font-bold text-orange-600 mt-1.5">
                                {checkedCount} anggota dipilih untuk dipindah
                            </p>
                        )}
                    </div>

                    {/* Pilih bus tujuan */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Bus Tujuan</p>
                        {busList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Belum ada bus tersedia</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {busList.map(b => {
                                    const terisi = busKuotaLive[b.id] ?? b.terisi ?? 0;
                                    const sisa = (b.kapasitas_total || 0) - terisi;
                                    const isSelected = targetBusId === b.id;
                                    const penuh = sisa <= 0;
                                    const tidakCukup = checkedCount > 0 && sisa < checkedCount;
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => !penuh && setTargetBusId(isSelected ? null : b.id)}
                                            disabled={penuh}
                                            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition text-left ${
                                                isSelected ? 'bg-purple-600 border-purple-600 text-white'
                                                : penuh ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                                : tidakCukup ? 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-purple-400 hover:bg-purple-50'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <Bus size={11} className="shrink-0" />
                                                    <span className="truncate">{b.nama_armada}</span>
                                                </div>
                                                <p className={`text-[10px] mt-0.5 font-normal ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>{b.jenis_kendaraan}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className={`font-black text-sm ${isSelected ? 'text-white' : penuh ? 'text-red-500' : tidakCukup ? 'text-orange-600' : 'text-green-600'}`}>{sisa}</p>
                                                <p className={`text-[9px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>sisa kursi</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Ringkasan */}
                    {checkedCount > 0 && targetBusId && (
                        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${cukup ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                            {cukup
                                ? <><CheckCircle size={15} className="text-green-600 shrink-0" /> Siap memindah <b>{checkedCount} orang</b> ke <b>{targetBus?.nama_armada}</b> (sisa {sisBusTarget} kursi)</>
                                : <><AlertCircle size={15} className="text-red-500 shrink-0" /> Tidak cukup — butuh <b>{checkedCount}</b> kursi, tersedia <b>{sisBusTarget}</b></>
                            }
                        </div>
                    )}

                    {err && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
                            <AlertCircle size={14} className="shrink-0" /> {err}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Batal</button>
                        <button
                            onClick={handleSplit}
                            disabled={saving || checkedCount === 0 || !targetBusId || !cukup}
                            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                            Pindah {checkedCount > 0 ? `(${checkedCount} orang)` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// MODAL PLOTTING UTAMA
// ─────────────────────────────────────────────────────────────────
function PlottingModal({ rute, onClose }: { rute: Rute; onClose: () => void }) {
    const [busList, setBusList] = useState<Bus[]>([]);
    const [peserta, setPeserta] = useState<Peserta[]>([]);
    const [loadingBus, setLoadingBus] = useState(true);
    const [loadingPeserta, setLoadingPeserta] = useState(true);

    // UI states
    const [searchKK, setSearchKK] = useState('');
    const [filterPlotting, setFilterPlotting] = useState<'semua' | 'sudah' | 'belum'>('semua');
    const [busFormOpen, setBusFormOpen] = useState(false);
    const [editingBus, setEditingBus] = useState<Bus | null>(null);
    const [assigningFamily, setAssigningFamily] = useState<number | null>(null); // id_keluarga yang sedang di-assign
    const [assignLoading, setAssignLoading] = useState<Record<number, boolean>>({});
    const [unassignLoading, setUnassignLoading] = useState<Record<number, boolean>>({});
    const [busDeleteLoading, setBusDeleteLoading] = useState<Record<number, boolean>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
    // ── State untuk modal split individu ──────────────────────────
    const [splitKel, setSplitKel] = useState<KelompokKeluarga | null>(null);

    const jadwal = formatTanggalJam(rute.tanggal_raw);

    const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchBus = useCallback(async () => {
        setLoadingBus(true);
        try {
            const res = await fetch(`${API.ADMIN_KENDARAAN}?rute_id=${rute.rute_id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            const d = await res.json();
            setBusList(Array.isArray(d) ? d : []);
        } catch { setBusList([]); }
        finally { setLoadingBus(false); }
    }, [rute.rute_id]);

    const fetchPeserta = useCallback(async () => {
        setLoadingPeserta(true);
        try {
            const res = await fetch(`${API.ADMIN_DATA}?rute_id=${rute.rute_id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            const d = await res.json();
            setPeserta(Array.isArray(d) ? d : []);
        } catch { setPeserta([]); }
        finally { setLoadingPeserta(false); }
    }, [rute.rute_id]);

    useEffect(() => { fetchBus(); fetchPeserta(); }, [fetchBus, fetchPeserta]);

    // ── Kelompokkan keluarga ──────────────────────────────────────
    const kelompok = useMemo<KelompokKeluarga[]>(() => {
        const map = new Map<number, KelompokKeluarga>();
        for (const p of peserta) {
            if (!map.has(p.id_keluarga)) {
                map.set(p.id_keluarga, {
                    id_keluarga: p.id_keluarga,
                    nama_kepala: p.nama_kepala_keluarga || p.nama_peserta,
                    anggota: [],
                    nama_bus: '',
                    kendaraan_id: null,
                    sudah_plotting: false,
                    jumlah_anggota: 0,
                });
            }
            const kel = map.get(p.id_keluarga)!;
            kel.anggota.push(p);
            if (p.nama_bus && p.nama_bus !== 'Belum Plotting') {
                kel.nama_bus = p.nama_bus;
                kel.sudah_plotting = true;
                // Cari kendaraan_id dari busList
                const foundBus = busList.find(b => b.nama_armada === p.nama_bus);
                if (foundBus) kel.kendaraan_id = foundBus.id;
            }
        }
        for (const kel of map.values()) kel.jumlah_anggota = kel.anggota.length;
        return Array.from(map.values());
    }, [peserta, busList]);

    const filtered = useMemo(() => {
        let k = kelompok;
        if (searchKK) k = k.filter(kel =>
            kel.nama_kepala.toLowerCase().includes(searchKK.toLowerCase()) ||
            kel.anggota.some(a => a.nama_peserta.toLowerCase().includes(searchKK.toLowerCase()))
        );
        if (filterPlotting === 'sudah') k = k.filter(kel => kel.sudah_plotting);
        if (filterPlotting === 'belum') k = k.filter(kel => !kel.sudah_plotting);
        return k;
    }, [kelompok, searchKK, filterPlotting]);

    // ── Stats ─────────────────────────────────────────────────────
    const totalKK = kelompok.length;
    const sudahPlot = kelompok.filter(k => k.sudah_plotting).length;
    const belumPlot = totalKK - sudahPlot;
    const totalPeserta = peserta.length;

    // ── Kuota bus: hitung dari peserta live ───────────────────────
    const busKuotaLive = useMemo(() => {
        const map: Record<number, number> = {};
        for (const b of busList) map[b.id] = 0;
        for (const p of peserta) {
            if (p.nama_bus && p.nama_bus !== 'Belum Plotting') {
                const b = busList.find(x => x.nama_armada === p.nama_bus);
                if (b) map[b.id] = (map[b.id] || 0) + 1;
            }
        }
        return map;
    }, [busList, peserta]);

    // ── Assign bus ke keluarga ────────────────────────────────────
    const handleAssign = async (idKeluarga: number, kendaraanId: number) => {
        setAssignLoading(prev => ({ ...prev, [idKeluarga]: true }));
        try {
            const res = await fetch(`${API.ADMIN_ASSIGN_BUS}?user_id=${idKeluarga}&kendaraan_id=${kendaraanId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const j = await res.json();
            if (res.ok) {
                showToast(`✅ ${j.pesan || 'Plotting berhasil!'}`);
                setAssigningFamily(null);
                await fetchPeserta(); await fetchBus();
            } else {
                showToast(j.error || 'Gagal assign bus', 'err');
            }
        } catch { showToast('Gagal terhubung ke server', 'err'); }
        finally { setAssignLoading(prev => ({ ...prev, [idKeluarga]: false })); }
    };

    // ── Batalkan plotting keluarga ────────────────────────────────
    const handleUnassign = async (idKeluarga: number) => {
        if (!confirm('Batalkan plotting keluarga ini?')) return;
        setUnassignLoading(prev => ({ ...prev, [idKeluarga]: true }));
        try {
            const res = await fetch(`${API.BASE_URL}/api/admin/batalkan-plotting/${idKeluarga}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const j = await res.json();
            if (res.ok) {
                showToast(`✅ ${j.pesan || 'Plotting dibatalkan'}`);
                await fetchPeserta(); await fetchBus();
            } else { showToast(j.error || 'Gagal batalkan', 'err'); }
        } catch { showToast('Gagal terhubung ke server', 'err'); }
        finally { setUnassignLoading(prev => ({ ...prev, [idKeluarga]: false })); }
    };

    // ── Hapus bus ─────────────────────────────────────────────────
    const handleDeleteBus = async (b: Bus) => {
        if (!confirm(`Hapus bus "${b.nama_armada}"? Semua plotting ke bus ini akan hilang.`)) return;
        setBusDeleteLoading(prev => ({ ...prev, [b.id]: true }));
        try {
            const res = await fetch(`${API.ADMIN_KENDARAAN}/${b.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) { showToast(`🗑️ Bus "${b.nama_armada}" dihapus`); await fetchBus(); await fetchPeserta(); }
            else { const j = await res.json(); showToast(j.error || 'Gagal hapus', 'err'); }
        } catch { showToast('Gagal hapus bus', 'err'); }
        finally { setBusDeleteLoading(prev => ({ ...prev, [b.id]: false })); }
    };

    const isLoading = loadingBus || loadingPeserta;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-6 overflow-y-auto">
                <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden mb-6">

                    {/* ── TOAST ── */}
                    {toast && (
                        <div className={`fixed top-5 right-5 z-[70] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold transition-all ${toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                            {toast.msg}
                        </div>
                    )}

                    {/* ── HEADER ── */}
                    <div className="bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 px-6 py-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="bg-white/20 p-3 rounded-xl shrink-0"><LayoutGrid size={22} className="text-white" /></div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-white flex flex-wrap items-center gap-2">
                                        Plotting Bus
                                        <span className="text-purple-300 font-normal">—</span>
                                        <span className="text-purple-200 font-medium">{rute.asal}</span>
                                        <ArrowRight size={14} className="text-purple-400" />
                                        <span className="text-white">{rute.tujuan}</span>
                                    </h2>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        <span className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-white text-xs font-semibold">
                                            <CalendarDays size={11} className="text-purple-300" />{jadwal.tanggal}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-white text-xs font-bold">
                                            <Clock size={11} className="text-purple-300" />{jadwal.jam}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition text-white shrink-0"><X size={20} /></button>
                        </div>

                        {/* Stats */}
                        {!isLoading && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { label: 'Total KK', val: totalKK, sub: 'keluarga', color: 'bg-white/10' },
                                    { label: 'Total Peserta', val: totalPeserta, sub: 'orang', color: 'bg-white/10' },
                                    { label: 'Sudah Plotting', val: sudahPlot, sub: 'KK', color: 'bg-green-500/30 border border-green-400/30' },
                                    { label: 'Belum Plotting', val: belumPlot, sub: 'KK', color: belumPlot > 0 ? 'bg-amber-500/30 border border-amber-400/30' : 'bg-white/10' },
                                ].map((s, i) => (
                                    <div key={i} className={`${s.color} rounded-xl px-3 py-2.5 text-center`}>
                                        <p className="text-2xl font-black text-white">{s.val}</p>
                                        <p className="text-purple-200 text-[10px] font-bold uppercase">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── BODY ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">

                        {/* ═══ PANEL KIRI: MANAJEMEN BUS ═══ */}
                        <div className="border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bus size={15} className="text-purple-600" />
                                    <span className="font-bold text-sm text-slate-700">Armada Bus</span>
                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full">{busList.length}</span>
                                </div>
                                <button
                                    onClick={() => { setEditingBus(null); setBusFormOpen(true); }}
                                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                >
                                    <Plus size={13} /> Tambah Bus
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 max-h-[420px] p-3 space-y-2">
                                {loadingBus ? (
                                    <div className="flex items-center justify-center h-24 text-slate-400">
                                        <Loader2 size={22} className="animate-spin text-purple-400" />
                                    </div>
                                ) : busList.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Bus size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs italic">Belum ada armada bus</p>
                                        <p className="text-xs text-slate-300 mt-1">Klik "Tambah Bus" untuk mulai</p>
                                    </div>
                                ) : busList.map(b => {
                                    const terisi = busKuotaLive[b.id] ?? b.terisi ?? 0;
                                    const kapasitas = b.kapasitas_total || 1;
                                    const pct = Math.min(100, Math.round((terisi / kapasitas) * 100));
                                    const penuh = terisi >= kapasitas;
                                    const hampirPenuh = pct >= 80 && !penuh;
                                    const sisa = kapasitas - terisi;
                                    return (
                                        <div key={b.id} className={`rounded-xl border-2 p-3 transition ${penuh ? 'border-red-200 bg-red-50/40' : hampirPenuh ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200 bg-white hover:border-purple-200'}`}>
                                            {/* Bus info baris 1 */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="font-black text-slate-800 text-sm">{b.nama_armada}</p>
                                                        {penuh && <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">PENUH</span>}
                                                        {hampirPenuh && <span className="text-[9px] font-bold bg-orange-400 text-white px-1.5 py-0.5 rounded-full">HAMPIR</span>}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{b.jenis_kendaraan} {b.plat_nomor ? `· ${b.plat_nomor}` : ''}</p>
                                                    {b.nama_supir && <p className="text-[10px] text-slate-400">👤 {b.nama_supir}{b.kontak_supir ? ` · ${b.kontak_supir}` : ''}</p>}
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => { setEditingBus(b); setBusFormOpen(true); }} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition" title="Edit bus">
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button onClick={() => handleDeleteBus(b)} disabled={busDeleteLoading[b.id]} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition disabled:opacity-50" title="Hapus bus">
                                                        {busDeleteLoading[b.id] ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress bar kuota */}
                                            <div className="mt-2.5 space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold">
                                                    <span className={penuh ? 'text-red-600' : hampirPenuh ? 'text-orange-600' : 'text-slate-500'}>
                                                        {terisi} terisi
                                                    </span>
                                                    <span className="text-slate-400">{kapasitas} kursi</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${penuh ? 'bg-red-500' : hampirPenuh ? 'bg-orange-400' : 'bg-purple-500'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className={`font-bold ${penuh ? 'text-red-500' : 'text-purple-600'}`}>{pct}%</span>
                                                    <span className={`font-bold ${sisa <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        {sisa > 0 ? `Sisa ${sisa} kursi` : 'Penuh'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total kuota ringkasan */}
                            {!loadingBus && busList.length > 0 && (
                                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div>
                                            <p className="font-black text-slate-700">{busList.reduce((s, b) => s + (b.kapasitas_total || 0), 0)}</p>
                                            <p className="text-slate-400 text-[10px]">Total Kursi</p>
                                        </div>
                                        <div>
                                            <p className="font-black text-blue-600">{Object.values(busKuotaLive).reduce((a, b) => a + b, 0)}</p>
                                            <p className="text-slate-400 text-[10px]">Terisi</p>
                                        </div>
                                        <div>
                                            <p className="font-black text-green-600">{busList.reduce((s, b) => s + (b.kapasitas_total || 0), 0) - Object.values(busKuotaLive).reduce((a, b) => a + b, 0)}</p>
                                            <p className="text-slate-400 text-[10px]">Sisa Kursi</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ PANEL KANAN: DAFTAR KELUARGA ═══ */}
                        <div className="flex flex-col min-h-0">
                            {/* Filter */}
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 items-center">
                                <div className="relative flex-1 min-w-[160px]">
                                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input type="text" placeholder="Cari nama KK / anggota..." value={searchKK} onChange={e => setSearchKK(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-purple-400" />
                                </div>
                                <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                                    {(['semua', 'sudah', 'belum'] as const).map(f => (
                                        <button key={f} onClick={() => setFilterPlotting(f)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${filterPlotting === f ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                                            {f === 'semua' ? 'Semua' : f === 'sudah' ? '✅ Sudah' : '⏳ Belum'}
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium ml-auto">{filtered.length} / {totalKK} KK</span>
                            </div>

                            {/* List keluarga */}
                            <div className="overflow-y-auto flex-1 max-h-[500px] p-3 space-y-2">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-32 text-slate-400 gap-3">
                                        <Loader2 size={22} className="animate-spin text-purple-400" />
                                        <span className="text-sm">Memuat data...</span>
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Users size={36} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm italic">{kelompok.length === 0 ? 'Belum ada peserta di rute ini' : 'Tidak ada yang cocok dengan filter'}</p>
                                    </div>
                                ) : filtered.map((kel) => {
                                    const isAssigning = assigningFamily === kel.id_keluarga;
                                    const isAssignLoading = assignLoading[kel.id_keluarga];
                                    const isUnassignLoading = unassignLoading[kel.id_keluarga];
                                    return (
                                        <div key={kel.id_keluarga} className={`rounded-xl border overflow-hidden ${kel.sudah_plotting ? 'border-green-200' : 'border-amber-200'}`}>
                                            {/* Header keluarga */}
                                            <div className={`px-3 py-2.5 flex items-center justify-between gap-2 ${kel.sudah_plotting ? 'bg-green-50' : 'bg-amber-50'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Home size={12} className={kel.sudah_plotting ? 'text-green-700 shrink-0' : 'text-amber-600 shrink-0'} />
                                                    <span className={`font-bold text-sm truncate ${kel.sudah_plotting ? 'text-green-900' : 'text-amber-900'}`}>{kel.nama_kepala}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${kel.sudah_plotting ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                                                        {kel.jumlah_anggota} org
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {kel.sudah_plotting ? (
                                                        <>
                                                            {/* Badge bus */}
                                                            <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                                                                <Bus size={10} />{kel.nama_bus}
                                                            </span>
                                                            {/* Tombol Split individu — muncul jika anggota > 1 */}
                                                            {kel.jumlah_anggota > 1 && (
                                                                <button
                                                                    onClick={() => setSplitKel(kel)}
                                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                                                                    title="Split: pindahkan sebagian anggota ke bus lain"
                                                                >
                                                                    <ArrowRight size={10} />Split
                                                                </button>
                                                            )}
                                                            {/* Ganti bus (semua anggota) */}
                                                            <button
                                                                onClick={() => setAssigningFamily(isAssigning ? null : kel.id_keluarga)}
                                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition"
                                                                title="Ganti bus untuk semua anggota"
                                                            >
                                                                <Pencil size={11} />
                                                            </button>
                                                            {/* Batalkan plotting */}
                                                            <button
                                                                onClick={() => handleUnassign(kel.id_keluarga)}
                                                                disabled={isUnassignLoading}
                                                                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-50"
                                                                title="Batalkan plotting seluruh keluarga"
                                                            >
                                                                {isUnassignLoading ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Tombol Split tersedia bahkan saat belum plotting */}
                                                            {kel.jumlah_anggota > 1 && (
                                                                <button
                                                                    onClick={() => setSplitKel(kel)}
                                                                    disabled={busList.length === 0}
                                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition disabled:opacity-40"
                                                                    title="Split: assign individu ke bus berbeda"
                                                                >
                                                                    <ArrowRight size={10} />Split
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setAssigningFamily(isAssigning ? null : kel.id_keluarga)}
                                                                disabled={busList.length === 0}
                                                                className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${isAssigning ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'}`}
                                                            >
                                                                {isAssigning ? <ChevronUp size={12} /> : <Bus size={12} />}
                                                                {isAssigning ? 'Tutup' : 'Assign'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Dropdown pilih bus */}
                                            {isAssigning && (
                                                <div className="bg-purple-50/80 border-t border-purple-100 px-3 py-2.5">
                                                    <p className="text-[10px] font-bold text-purple-700 mb-2 flex items-center gap-1"><Info size={10} /> Pilih bus tujuan ({kel.jumlah_anggota} peserta)</p>
                                                    {busList.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic">Belum ada bus — tambahkan bus dulu di panel kiri</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                            {busList.map(b => {
                                                                const terisi = busKuotaLive[b.id] ?? b.terisi ?? 0;
                                                                const sisa = (b.kapasitas_total || 0) - terisi;
                                                                const cukup = sisa >= kel.jumlah_anggota;
                                                                const isCurrent = kel.nama_bus === b.nama_armada;
                                                                return (
                                                                    <button
                                                                        key={b.id}
                                                                        onClick={() => cukup && !isCurrent && handleAssign(kel.id_keluarga, b.id)}
                                                                        disabled={!cukup || isCurrent || isAssignLoading}
                                                                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${isCurrent ? 'bg-green-100 border-green-300 text-green-700 cursor-default' : !cukup ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-400'} disabled:opacity-60`}
                                                                    >
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            {isAssignLoading ? <Loader2 size={11} className="animate-spin shrink-0" /> : isCurrent ? <Check size={11} className="text-green-600 shrink-0" /> : <Bus size={11} className="shrink-0" />}
                                                                            <span className="truncate">{b.nama_armada}</span>
                                                                        </div>
                                                                        <div className="shrink-0 text-right">
                                                                            <span className={`font-black ${sisa <= 0 ? 'text-red-500' : sisa < kel.jumlah_anggota ? 'text-orange-500' : 'text-green-600'}`}>
                                                                                {sisa > 0 ? `${sisa} sisa` : 'Penuh'}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Anggota keluarga */}
                                            <div className="divide-y divide-slate-50">
                                                {kel.anggota.map((a, i) => (
                                                    <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-white text-xs">
                                                        <span className="text-slate-300 font-mono w-4 shrink-0">{i + 1}</span>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 ${a.kategori === 'DEWASA' ? 'bg-blue-500' : a.kategori === 'ANAK' ? 'bg-purple-500' : 'bg-pink-400'}`}>
                                                            {(a.nama_peserta || '?').charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-slate-700 truncate flex-1">{a.nama_peserta}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${a.kategori === 'DEWASA' ? 'bg-blue-50 text-blue-600' : a.kategori === 'ANAK' ? 'bg-purple-50 text-purple-600' : 'bg-pink-50 text-pink-600'}`}>{a.kategori}</span>
                                                        {/* Bus individu — tampil jika berbeda antar anggota (hasil split) */}
                                                        {a.nama_bus && a.nama_bus !== 'Belum Plotting'
                                                            ? <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${a.nama_bus !== kel.nama_bus ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                                <Bus size={8}/>{a.nama_bus}
                                                                {a.nama_bus !== kel.nama_bus && <span className="ml-0.5 text-orange-400">✦</span>}
                                                              </span>
                                                            : <span className="text-[9px] text-slate-300 italic shrink-0">Belum</span>
                                                        }
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <CalendarDays size={12} className="text-purple-500" />
                            <span>Keberangkatan: <span className="font-bold text-slate-600">{jadwal.full}</span></span>
                        </div>
                        <button onClick={onClose} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm transition">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-modal form bus */}
            {busFormOpen && (
                <BusFormModal
                    ruteId={rute.rute_id}
                    bus={editingBus}
                    onSaved={() => { fetchBus(); fetchPeserta(); }}
                    onClose={() => { setBusFormOpen(false); setEditingBus(null); }}
                />
            )}

            {/* Sub-modal split individu */}
            {splitKel && (
                <SplitIndividuModal
                    kel={splitKel}
                    busList={busList}
                    busKuotaLive={busKuotaLive}
                    onSaved={async () => {
                        showToast('✅ Anggota berhasil dipindah ke bus lain');
                        await fetchPeserta(); await fetchBus();
                    }}
                    onClose={() => setSplitKel(null)}
                />
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function AdminRute() {
    const navigate = useNavigate();
    const { addNotif } = useNotification();
    const [rutes, setRutes] = useState<Rute[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [quickEditId, setQuickEditId] = useState<number | null>(null);
    const [expandedRute, setExpandedRute] = useState<number | null>(null);
    const [penumpangPerRute, setPenumpangPerRute] = useState<Record<number, any[]>>({});
    const [loadingPenumpang, setLoadingPenumpang] = useState<Record<number, boolean>>({});
    const [plottingRute, setPlottingRute] = useState<Rute | null>(null);
    const [search, setSearch] = useState('');
    const [filterPortal, setFilterPortal] = useState<'semua' | 'buka' | 'tutup'>('semua');
    const [filterKuota, setFilterKuota] = useState<'semua' | 'tersedia' | 'penuh'>('semua');
    const [sortBy, setSortBy] = useState<'tujuan' | 'tanggal' | 'sisa'>('tujuan');
    const [form, setForm] = useState({ rute_id: null as any, asal: 'Banda Aceh', tujuan: '', kuota_total: 40, kuota_terisi: 0, tanggal_keberangkatan: '' });
    const [formError, setFormError] = useState('');
    const [savingRoute, setSavingRoute] = useState(false);

    useEffect(() => { loadRutes(); }, []);

    const loadRutes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API.RUTE}/admin`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error(`Gagal memuat rute (${res.status})`);
            const d = await res.json();
            setRutes(Array.isArray(d) ? d : []);
        } catch (e) {
            console.error(e);
            setRutes([]);
        } finally { setLoading(false); }
    };

    const loadPenumpangRute = async (ruteId: number) => {
        setLoadingPenumpang(prev => ({ ...prev, [ruteId]: true }));
        try {
            const res = await fetch(`${API.ADMIN_DATA}?rute_id=${ruteId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            const data = await res.json();
            setPenumpangPerRute(prev => ({ ...prev, [ruteId]: Array.isArray(data) ? data : [] }));
        } catch { setPenumpangPerRute(prev => ({ ...prev, [ruteId]: [] })); }
        finally { setLoadingPenumpang(prev => ({ ...prev, [ruteId]: false })); }
    };

    const toggleExpandRute = (ruteId: number) => {
        if (expandedRute === ruteId) setExpandedRute(null);
        else { setExpandedRute(ruteId); loadPenumpangRute(ruteId); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus rute ini? Data akan hilang permanen!')) return;
        const ruteHapus = rutes.find(r => r.rute_id === id);
        const res = await fetch(`${API.RUTE}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            addNotif({ type: 'rute', title: '🗑️ Rute Dihapus', message: `Rute "${ruteHapus?.asal} → ${ruteHapus?.tujuan}" dihapus.`, link: '/admin/rute' });
            loadRutes();
        } else { const j = await res.json(); alert('Gagal hapus: ' + (j.error || 'Masih ada pendaftar')); }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(form.tanggal_keberangkatan)) {
            setFormError('Pilih tanggal dan jam keberangkatan secara lengkap.');
            return;
        }
        if (!Number.isInteger(form.kuota_total) || form.kuota_total < Math.max(1, form.kuota_terisi)) {
            setFormError(`Kuota minimal ${Math.max(1, form.kuota_terisi)} kursi karena sudah ada peserta terisi.`);
            return;
        }
        setSavingRoute(true);
        try {
            const payload = { ...form, tanggal_keberangkatan: `${form.tanggal_keberangkatan}:00` };
            const url = isEdit ? `${API.RUTE}/${form.rute_id}` : API.RUTE;
            const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(payload) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Gagal menyimpan rute.');
            addNotif({ type: 'rute', title: isEdit ? 'Rute Diperbarui' : 'Rute Ditambahkan', message: `Rute "${form.asal} → ${form.tujuan}" berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}.`, link: '/admin/rute' });
            setShowModal(false);
            await loadRutes();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Gagal menyimpan rute.');
        } finally {
            setSavingRoute(false);
        }
    };

    const openEdit = (r: Rute) => {
        let tglString = '';
        if (r.tanggal_raw) {
            if (Array.isArray(r.tanggal_raw)) {
                const [y, m, d, h, min] = r.tanggal_raw;
                const pad = (n: number) => String(n).padStart(2, '0');
                tglString = `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
            } else tglString = String(r.tanggal_raw).slice(0, 16);
        }
        setFormError('');
        setForm({ rute_id: r.rute_id, asal: r.asal, tujuan: r.tujuan, kuota_total: Math.max(r.kuota_total || 0, r.kuota_terisi || 0, 1), kuota_terisi: r.kuota_terisi || 0, tanggal_keberangkatan: tglString });
        setIsEdit(true); setShowModal(true);
    };

    const openAdd = () => {
        const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const localDate = new Date(nextDay.getTime() - nextDay.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setFormError('');
        setForm({ rute_id: null, asal: 'Banda Aceh', tujuan: '', kuota_total: 40, kuota_terisi: 0, tanggal_keberangkatan: `${localDate}T07:00` });
        setIsEdit(false); setShowModal(true);
    };

    const togglePortal = async (id: number, currentState: boolean) => {
        if (!confirm(`${!currentState ? 'BUKA' : 'TUTUP'} portal pendaftaran rute ini?`)) return;
        const res = await fetch(`${API.RUTE}/${id}/portal`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ is_portal_open: !currentState }) });
        if (res.ok) {
            const rt = rutes.find(r => r.rute_id === id);
            addNotif({ type: 'portal', title: `🔐 Portal ${!currentState ? 'DIBUKA' : 'DITUTUP'}`, message: `Portal "${rt?.asal} → ${rt?.tujuan}" ${!currentState ? 'dibuka' : 'ditutup'}.`, link: '/admin/rute' });
            loadRutes();
        } else alert('Gagal mengubah status portal');
    };

    const notifKuotaPenuh = async (id: number) => {
        if (!confirm('Kirim notifikasi WA kuota penuh?')) return;
        const res = await fetch(API.ADMIN_NOTIF_KUOTA_PENUH(id), { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
        const json = await res.json();
        if (res.ok) alert(`✅ ${json.pesan}`); else alert('❌ ' + (json.error || 'Gagal'));
    };

    const resyncKuota = async (ruteId?: number) => {
        if (!confirm(`Sinkronkan ulang kuota ${ruteId ? 'rute ini' : 'SEMUA rute'} dari database aktual?`)) return;
        const url = ruteId ? `${API.BASE_URL}/api/admin/resync-kuota?rute_id=${ruteId}` : `${API.BASE_URL}/api/admin/resync-kuota`;
        const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
        const json = await res.json();
        if (res.ok) {
            const detail = json.hasil?.map((h: any) => `${h.tujuan}: ${h.kuota_lama}→${h.kuota_baru}`).join('\n') || '';
            alert(`✅ Resync berhasil!\n\n${detail}`);
            loadRutes();
        } else alert('❌ ' + (json.error || 'Gagal resync'));
    };

    const filteredRutes = useMemo(() => {
        let r = rutes;
        if (search) r = r.filter(rt => rt.tujuan.toLowerCase().includes(search.toLowerCase()) || rt.asal.toLowerCase().includes(search.toLowerCase()));
        if (filterPortal === 'buka') r = r.filter(rt => rt.is_portal_open !== false);
        if (filterPortal === 'tutup') r = r.filter(rt => rt.is_portal_open === false);
        if (filterKuota === 'tersedia') r = r.filter(rt => (rt.sisa_kuota ?? 1) > 0);
        if (filterKuota === 'penuh') r = r.filter(rt => (rt.sisa_kuota ?? 1) <= 0);
        return [...r].sort((a, b) => sortBy === 'tujuan' ? a.tujuan.localeCompare(b.tujuan) : sortBy === 'sisa' ? b.sisa_kuota - a.sisa_kuota : 0);
    }, [rutes, search, filterPortal, filterKuota, sortBy]);

    const stats = useMemo(() => ({
        total: rutes.length,
        portalBuka: rutes.filter(r => r.is_portal_open !== false).length,
        penuh: rutes.filter(r => (r.sisa_kuota ?? 1) <= 0).length,
        totalKuota: rutes.reduce((s, r) => s + (r.kuota_total || 0), 0),
        totalTerisi: rutes.reduce((s, r) => s + (r.kuota_terisi || 0), 0),
    }), [rutes]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* TOP BAR */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-6 py-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-lg font-extrabold">Manajemen Rute</h1>
                        <p className="text-slate-400 text-xs">Kelola tujuan, jadwal, kuota, dan penumpang per rute</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadRutes} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition" title="Refresh"><RefreshCw size={18} /></button>
                    <button onClick={() => resyncKuota()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-yellow-500/90 hover:bg-yellow-400 transition shadow" title="Resync kuota semua rute">
                        <RefreshCw size={14} /> Resync Kuota
                    </button>
                    <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-400 transition shadow-lg">
                        <Plus size={18} /> Tambah Rute
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* STATS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Rute', value: stats.total, color: 'bg-slate-700', icon: <MapPin size={16} /> },
                        { label: 'Portal Buka', value: stats.portalBuka, color: 'bg-green-600', icon: <ToggleRight size={16} /> },
                        { label: 'Rute Penuh', value: stats.penuh, color: 'bg-red-500', icon: <Users size={16} /> },
                        { label: 'Total Kuota', value: stats.totalKuota, color: 'bg-blue-600', icon: <Hash size={16} /> },
                        { label: 'Kursi Terisi', value: stats.totalTerisi, color: 'bg-purple-600', icon: <Bus size={16} /> },
                    ].map((s, i) => (
                        <div key={i} className={`${s.color} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm`}>
                            <div className="bg-white/20 p-2 rounded-lg shrink-0">{s.icon}</div>
                            <div><p className="text-2xl font-black">{s.value}</p><p className="text-xs opacity-80">{s.label}</p></div>
                        </div>
                    ))}
                </div>

                {/* FILTER BAR */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider"><Filter size={14} /> Filter:</div>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input type="text" placeholder="Cari kota asal / tujuan..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" />
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {(['semua', 'buka', 'tutup'] as const).map(f => (
                            <button key={f} onClick={() => setFilterPortal(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterPortal === f ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                {f === 'semua' ? 'Semua Portal' : f === 'buka' ? '🟢 Buka' : '🔴 Tutup'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {(['semua', 'tersedia', 'penuh'] as const).map(f => (
                            <button key={f} onClick={() => setFilterKuota(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterKuota === f ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                {f === 'semua' ? 'Semua Kuota' : f === 'tersedia' ? '✅ Tersedia' : '🚫 Penuh'}
                            </button>
                        ))}
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="tujuan">Urut: Tujuan A-Z</option>
                        <option value="tanggal">Urut: Tanggal</option>
                        <option value="sisa">Urut: Sisa Kuota</option>
                    </select>
                    {(search || filterPortal !== 'semua' || filterKuota !== 'semua') && (
                        <button onClick={() => { setSearch(''); setFilterPortal('semua'); setFilterKuota('semua'); }} className="text-xs font-bold text-red-500 hover:text-red-700 px-2">✕ Reset</button>
                    )}
                    <span className="ml-auto text-xs text-slate-400 font-medium">{filteredRutes.length} dari {rutes.length} rute</span>
                </div>

                {/* TABEL RUTE */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b">
                            <tr>
                                <th className="px-6 py-4">Tujuan & Jadwal</th>
                                <th className="px-6 py-4 text-center">Statistik Kuota</th>
                                <th className="px-6 py-4 text-center">Status & Portal</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-400">
                                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-30" />Memuat data rute...
                                </td></tr>
                            ) : filteredRutes.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">
                                    {rutes.length === 0 ? 'Belum ada rute.' : 'Tidak ada rute yang cocok dengan filter.'}
                                </td></tr>
                            ) : filteredRutes.map((r) => (
                                <React.Fragment key={r.rute_id}>
                                    <tr className={`border-b border-slate-100 hover:bg-blue-50/30 transition ${expandedRute === r.rute_id ? 'bg-blue-50/20' : ''} ${quickEditId === r.rute_id ? 'bg-yellow-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0"><MapPin size={20} /></div>
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                                        {r.asal}<ArrowRight size={14} className="text-slate-400" /><span className="text-blue-700">{r.tujuan}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                        <Calendar size={11} className="shrink-0" />
                                                        {r.waktu_berangkat || <span className="italic text-slate-300">Belum diatur</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs text-slate-500 font-medium">
                                                    <span>{Math.max(0, r.kuota_terisi ?? 0)} diterima</span>
                                                    <span>{r.kuota_total ?? 0} total</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-2 rounded-full transition-all ${(r.sisa_kuota ?? 1) <= 0 ? 'bg-red-500' : (r.kuota_total ?? 0) > 0 && (r.kuota_terisi ?? 0) / r.kuota_total > 0.8 ? 'bg-orange-400' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(100, (r.kuota_total ?? 0) > 0 ? (Math.max(0, r.kuota_terisi ?? 0) / r.kuota_total) * 100 : 0)}%` }} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 text-xs mt-2">
                                                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-1.5 text-center">
                                                        <p className="font-black text-yellow-700">{r.total_daftar ?? ((r.kuota_menunggu ?? 0) + (r.kuota_terisi ?? 0))}</p>
                                                        <p className="text-yellow-600 text-[9px] font-bold uppercase">Total Daftar</p>
                                                    </div>
                                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-1.5 text-center">
                                                        <p className="font-black text-blue-700">{Math.max(0, r.kuota_terisi ?? 0)}</p>
                                                        <p className="text-blue-600 text-[9px] font-bold uppercase">Diterima</p>
                                                    </div>
                                                    <div className={`${(r.sisa_kuota ?? 0) <= 0 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} border rounded-lg p-1.5 text-center`}>
                                                        <p className={`font-black ${(r.sisa_kuota ?? 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>{Math.max(0, r.sisa_kuota ?? 0)}</p>
                                                        <p className={`${(r.sisa_kuota ?? 0) <= 0 ? 'text-red-500' : 'text-orange-500'} text-[9px] font-bold uppercase`}>Sisa</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${(r.sisa_kuota ?? 1) <= 0 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                    {(r.sisa_kuota ?? 1) <= 0 ? 'PENUH' : 'TERSEDIA'}
                                                </span>
                                                <button onClick={() => togglePortal(r.rute_id, r.is_portal_open !== false)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition ${r.is_portal_open !== false ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>
                                                    {r.is_portal_open !== false ? <><ToggleRight size={14} /> Portal Buka</> : <><ToggleLeft size={14} /> Portal Tutup</>}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5 flex-wrap">
                                                {/* TOMBOL PLOTTING */}
                                                <button onClick={() => setPlottingRute(r)} title="Plotting bus per keluarga" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100">
                                                    <LayoutGrid size={14} /><span>Plotting</span>
                                                </button>
                                                {/* Lihat penumpang */}
                                                <button onClick={() => toggleExpandRute(r.rute_id)} title="Lihat daftar penumpang" className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border transition ${expandedRute === r.rute_id ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}>
                                                    <Users size={14} />
                                                    {expandedRute === r.rute_id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                                {/* Quick edit */}
                                                <button onClick={() => setQuickEditId(quickEditId === r.rute_id ? null : r.rute_id)} title="Edit cepat tanggal & kuota" className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border transition ${quickEditId === r.rute_id ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-yellow-50 text-yellow-700 border-yellow-100 hover:bg-yellow-100'}`}>
                                                    <CalendarDays size={14} /><Hash size={12} />
                                                </button>
                                                {/* Edit lengkap */}
                                                <button onClick={() => openEdit(r)} title="Edit rute" className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition border border-slate-100"><Edit size={16} /></button>
                                                {/* Notif kuota penuh */}
                                                {(r.sisa_kuota ?? 1) <= 0 && (
                                                    <button onClick={() => notifKuotaPenuh(r.rute_id)} title="Notif WA kuota penuh" className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition border border-orange-100"><Bell size={16} /></button>
                                                )}
                                                {/* Resync */}
                                                <button onClick={() => resyncKuota(r.rute_id)} title="Resync kuota" className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition border border-yellow-100"><RefreshCw size={14} /></button>
                                                {/* Hapus */}
                                                <button onClick={() => handleDelete(r.rute_id)} title="Hapus rute" className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>

                                    {quickEditId === r.rute_id && (
                                        <QuickEditBar rute={r} onSave={loadRutes} onClose={() => setQuickEditId(null)} />
                                    )}

                                    {expandedRute === r.rute_id && (
                                        <tr>
                                            <td colSpan={4} className="bg-gradient-to-b from-blue-50/50 to-white px-6 py-4 border-b border-slate-200">
                                                <div className="bg-white rounded-2xl border border-blue-100 shadow-md overflow-hidden">
                                                    <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-white">
                                                            <Users size={16} />
                                                            <span className="font-bold text-sm">Penumpang: {r.asal} → {r.tujuan}</span>
                                                        </div>
                                                        <span className="bg-white/25 text-white text-xs font-bold px-3 py-1 rounded-full">{penumpangPerRute[r.rute_id]?.length || 0} orang aktif</span>
                                                    </div>
                                                    {loadingPenumpang[r.rute_id] ? (
                                                        <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-3">
                                                            <RefreshCw size={18} className="animate-spin text-blue-400" /> Memuat...
                                                        </div>
                                                    ) : !penumpangPerRute[r.rute_id]?.length ? (
                                                        <div className="p-10 text-center text-slate-400"><Users size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Belum ada penumpang</p></div>
                                                    ) : (
                                                        <>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b">
                                                                        <tr>
                                                                            <th className="px-4 py-3 w-8">#</th>
                                                                            <th className="px-4 py-3">Nama</th>
                                                                            <th className="px-4 py-3">NIK</th>
                                                                            <th className="px-4 py-3">Kategori</th>
                                                                            <th className="px-4 py-3">No. HP</th>
                                                                            <th className="px-4 py-3">Bus Plotting</th>
                                                                            <th className="px-4 py-3 text-center">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50">
                                                                        {penumpangPerRute[r.rute_id].map((p: any, idx: number) => (
                                                                            <tr key={p.id} className="hover:bg-blue-50/20 transition">
                                                                                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{idx + 1}</td>
                                                                                <td className="px-4 py-3">
                                                                                    <p className="font-semibold text-slate-800">{p.nama_peserta}</p>
                                                                                    {p.nama_kepala_keluarga && p.nama_kepala_keluarga !== p.nama_peserta && <p className="text-[10px] text-slate-400">KK: {p.nama_kepala_keluarga}</p>}
                                                                                </td>
                                                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.nik_peserta}</td>
                                                                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.kategori === 'DEWASA' ? 'bg-blue-50 text-blue-700' : p.kategori === 'ANAK' ? 'bg-purple-50 text-purple-700' : 'bg-pink-50 text-pink-700'}`}>{p.kategori}</span></td>
                                                                                <td className="px-4 py-3 text-xs text-slate-500">{p.no_hp_target ? <span className="flex items-center gap-1"><Phone size={11} className="text-slate-400" />{p.no_hp_target}</span> : '-'}</td>
                                                                                <td className="px-4 py-3 text-xs">{p.nama_bus && p.nama_bus !== 'Belum Plotting' ? <span className="flex items-center gap-1 text-purple-700 font-bold"><Bus size={12} />{p.nama_bus}</span> : <span className="text-slate-300 italic text-[11px]">Belum plotting</span>}</td>
                                                                                <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-[10px] font-bold border ${getStatusBadge(p.status)}`}>{(p.status || '').replace(/_/g, ' ')}</span></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                                                <p className="text-xs text-slate-400">Data realtime</p>
                                                                <button onClick={() => navigate('/admin/verifikasi')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100">
                                                                    <Eye size={13} /> Buka Verifikasi & Plotting
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL TAMBAH/EDIT RUTE */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className={`px-6 py-5 ${isEdit ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-extrabold">{isEdit ? '✏️ Edit Rute' : '➕ Tambah Rute Baru'}</h2>
                                    <p className="text-white/70 text-xs mt-0.5">{isEdit ? 'Perbarui detail rute yang ada' : 'Buat rute keberangkatan baru'}</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition"><X size={20} /></button>
                            </div>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kota Asal</label>
                                    <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" value={form.asal} onChange={e => setForm({ ...form, asal: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kota Tujuan</label>
                                    <input type="text" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" value={form.tujuan} onChange={e => setForm({ ...form, tujuan: e.target.value })} placeholder="Contoh: Medan" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5"><CalendarDays size={12} className="inline mr-1" /> Waktu Keberangkatan</label>
                                <input type="datetime-local" step="60" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" value={form.tanggal_keberangkatan} onChange={e => { setForm({ ...form, tanggal_keberangkatan: e.target.value }); setFormError(''); }} required />
                                <p className="mt-1.5 text-xs text-slate-500">Tanggal dan jam wajib dipilih. Jam awal otomatis 07:00 dan dapat diubah.</p>
                            </div>
                            {formError && (
                                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}
                            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border-2 border-yellow-200">
                                <label className="block text-xs font-bold text-yellow-800 mb-2 flex items-center gap-1"><Users size={14} /> Total Kuota Penumpang</label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setForm(f => ({ ...f, kuota_total: Math.max(Math.max(1, f.kuota_terisi), f.kuota_total - 10) }))} className="w-10 h-10 rounded-xl bg-white border-2 border-yellow-300 text-yellow-700 font-bold text-lg hover:bg-yellow-100 transition">−</button>
                                    <input type="number" className="flex-1 p-3 border-2 border-yellow-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-yellow-400 text-2xl font-black text-center text-slate-800" value={form.kuota_total} onChange={e => setForm({ ...form, kuota_total: parseInt(e.target.value) || 0 })} required />
                                    <button type="button" onClick={() => setForm(f => ({ ...f, kuota_total: f.kuota_total + 10 }))} className="w-10 h-10 rounded-xl bg-white border-2 border-yellow-300 text-yellow-700 font-bold text-lg hover:bg-yellow-100 transition">+</button>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {[40, 80, 120, 160].map(n => (
                                        <button key={n} type="button" onClick={() => setForm(f => ({ ...f, kuota_total: n }))} className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${form.kuota_total === n ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50'}`}>{n}</button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-yellow-700 mt-2">Contoh: 2 bus ×40 kursi = isi 80 | 3 bus ×40 = isi 120</p>
                            </div>
                            <button type="submit" disabled={savingRoute} className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${isEdit ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {savingRoute ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {savingRoute ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Rute Baru'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PLOTTING */}
            {plottingRute && (
                <PlottingModal rute={plottingRute} onClose={() => setPlottingRute(null)} />
            )}
        </div>
    );
}