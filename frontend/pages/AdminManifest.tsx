import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileSpreadsheet, Bus, MapPin, Users, Download, ChevronDown, ChevronUp,
    ArrowLeft, RefreshCw, User, Clock, BarChart2, Search,
    CheckCircle, AlertTriangle, XCircle, Phone, Filter, FileText
} from 'lucide-react';
import { API, apiRequest, downloadFile } from '../lib/api';
import { generateManifestPDF } from '../lib/manifestPdfGenerator';

// ── KOMPONEN: KARTU STATUS BUS (panel tersedia) ─────────────────
function BusAvailabilityPanel({ buses, onSelectBus }: { buses: any[]; onSelectBus: (b: any) => void }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'semua' | 'tersedia' | 'penuh'>('semua');

    const filtered = buses.filter(b => {
        const matchSearch = !search ||
            b.nama_armada.toLowerCase().includes(search.toLowerCase()) ||
            (b.plat_nomor || '').toLowerCase().includes(search.toLowerCase());
        const sisa = (b.kapasitas_total || 0) - (b.terisi || 0);
        if (filter === 'tersedia') return matchSearch && sisa > 0;
        if (filter === 'penuh') return matchSearch && sisa <= 0;
        return matchSearch;
    });

    const stats = {
        total: buses.length,
        tersedia: buses.filter(b => ((b.kapasitas_total || 0) - (b.terisi || 0)) > 0).length,
        penuh: buses.filter(b => ((b.kapasitas_total || 0) - (b.terisi || 0)) <= 0).length,
        totalKursi: buses.reduce((s, b) => s + (b.kapasitas_total || 0), 0),
        totalTerisi: buses.reduce((s, b) => s + (b.terisi || 0), 0),
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <Bus size={16} /> Status Armada Bus
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Ketersediaan kursi real-time semua unit</p>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
                {[
                    { label: 'Total Bus', value: stats.total, color: 'text-slate-700' },
                    { label: 'Tersedia', value: stats.tersedia, color: 'text-green-600' },
                    { label: 'Penuh', value: stats.penuh, color: 'text-red-500' },
                    { label: 'Sisa Kursi', value: stats.totalKursi - stats.totalTerisi, color: 'text-blue-600' },
                ].map((s, i) => (
                    <div key={i} className="px-4 py-3 text-center">
                        <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filter + Search */}
            <div className="px-4 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[140px]">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari bus / plat..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                </div>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {(['semua', 'tersedia', 'penuh'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-1.5 rounded-md text-[10px] font-bold transition ${filter === f ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                        >
                            {f === 'semua' ? 'Semua' : f === 'tersedia' ? '✅ Ada' : '🚫 Penuh'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bus List */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Tidak ada bus ditemukan.</div>
                ) : filtered.map((b) => {
                    const sisa = (b.kapasitas_total || 0) - (b.terisi || 0);
                    const persen = b.kapasitas_total > 0 ? Math.round((b.terisi / b.kapasitas_total) * 100) : 0;
                    const penuh = sisa <= 0;
                    const hampirPenuh = !penuh && sisa <= 5;

                    return (
                        <div
                            key={b.id}
                            onClick={() => onSelectBus(b)}
                            className="px-4 py-3 hover:bg-blue-50/40 cursor-pointer transition group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${penuh ? 'bg-red-400' : hampirPenuh ? 'bg-orange-400' : 'bg-green-400'}`} />
                                        <p className="font-bold text-sm text-slate-800 truncate group-hover:text-blue-700 transition">{b.nama_armada}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 ml-4">
                                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{b.plat_nomor || '—'}</span>
                                        <span className="text-[10px] text-purple-600 font-bold">{b.jenis_kendaraan}</span>
                                    </div>
                                    {b.nama_supir && (
                                        <div className="flex items-center gap-1 mt-1 ml-4 text-[10px] text-slate-400">
                                            <User size={9} /> {b.nama_supir}
                                            {b.kontak_supir && <><Phone size={9} className="ml-1" /> {b.kontak_supir}</>}
                                        </div>
                                    )}
                                    {b.rute_tujuan && (
                                        <div className="flex items-center gap-1 mt-1 ml-4 text-[10px] text-blue-500">
                                            <MapPin size={9} /> {b.rute_asal || '?'} → {b.rute_tujuan}
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 text-right">
                                    {penuh ? (
                                        <div className="flex items-center gap-1 text-red-500">
                                            <XCircle size={14} />
                                            <span className="text-xs font-bold">PENUH</span>
                                        </div>
                                    ) : hampirPenuh ? (
                                        <div className="flex items-center gap-1 text-orange-500">
                                            <AlertTriangle size={14} />
                                            <span className="text-xs font-bold">Sisa {sisa}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle size={14} />
                                            <span className="text-xs font-bold">Sisa {sisa}</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-0.5">{b.terisi}/{b.kapasitas_total}</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-2 ml-4 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${penuh ? 'bg-red-400' : hampirPenuh ? 'bg-orange-400' : 'bg-green-400'}`}
                                    style={{ width: `${Math.min(100, persen)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function AdminManifest() {
    const navigate = useNavigate();
    const [allManifest, setAllManifest] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRutes, setExpandedRutes] = useState<Record<number, boolean>>({});
    const [viewMode, setViewMode] = useState<'rute' | 'bus'>('rute');
    const [allBuses, setAllBuses] = useState<any[]>([]);
    const [busManifests, setBusManifests] = useState<Record<number, any>>({});
    const [loadingBus, setLoadingBus] = useState<Record<number, boolean>>({});
    const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
    const [showPanel, setShowPanel] = useState(true);
    const [loadingPdf, setLoadingPdf] = useState<Record<number, boolean>>({});

    useEffect(() => {
        loadAll();
        loadBuses();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const data = await apiRequest<any[]>(API.MANIFEST);
            setAllManifest(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadBuses = async () => {
        try {
            const data = await apiRequest<any[]>(API.ADMIN_KENDARAAN);
            setAllBuses(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const loadBusManifest = async (busId: number) => {
        setLoadingBus(prev => ({ ...prev, [busId]: true }));
        try {
            const data = await apiRequest<any>(API.MANIFEST_BUS(busId));
            setBusManifests(prev => ({ ...prev, [busId]: data }));
        } catch (e) { console.error(e); }
        finally { setLoadingBus(prev => ({ ...prev, [busId]: false })); }
    };

    const handleSelectBus = (bus: any) => {
        setSelectedBusId(bus.id);
        setViewMode('bus');
        if (!busManifests[bus.id]) loadBusManifest(bus.id);
        // Scroll to bus section smoothly
        setTimeout(() => {
            document.getElementById(`bus-${bus.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const exportExcel = async (type: 'semua' | 'rute' | 'bus' | 'semua_plotting', id?: number, nama?: string) => {
        try {
            if (type === 'semua') await downloadFile(API.MANIFEST_EXPORT_SEMUA, 'Manifest_Semua_Rute.xlsx');
            else if (type === 'semua_plotting') await downloadFile(`${API.EXPORT}?hanya_plotting=true`, 'Rekap_Sudah_Plotting.xlsx');
            else if (type === 'rute' && id) await downloadFile(API.MANIFEST_EXPORT_RUTE(id), `Manifest_Rute_${nama || id}.xlsx`);
            else if (type === 'bus' && id) await downloadFile(API.MANIFEST_EXPORT_BUS(id), `Manifest_Bus_${nama || id}.xlsx`);
        } catch {
            alert('Export gagal. Coba lagi.');
        }
    };

    const exportPdf = async (bus: any) => {
        setLoadingPdf(prev => ({ ...prev, [bus.id]: true }));
        try {
            // Ambil data manifest bus (pastikan sudah include user_id & nama_user)
            const manifest = await apiRequest<any>(API.MANIFEST_BUS(bus.id));
            await generateManifestPDF({
                nama_bus: bus.nama_armada,
                plat_nomor: bus.plat_nomor,
                nama_supir: bus.nama_supir,
                kontak_supir: bus.kontak_supir,
                kapasitas_total: bus.kapasitas_total,
                terisi: bus.terisi,
                sisa_kursi: (bus.kapasitas_total || 0) - (bus.terisi || 0),
                rute_asal: manifest.rute_asal ?? bus.rute_asal,
                rute_tujuan: manifest.rute_tujuan ?? bus.rute_tujuan,
                waktu_berangkat: manifest.waktu_berangkat,
                total_penumpang: manifest.total_penumpang,
                jumlah_dewasa: manifest.jumlah_dewasa,
                jumlah_anak: manifest.jumlah_anak,
                jumlah_bayi: manifest.jumlah_bayi,
                penumpang: manifest.penumpang ?? [],
            });
        } catch (e) {
            alert('Gagal generate PDF. Pastikan data manifest sudah tersedia.');
            console.error(e);
        } finally {
            setLoadingPdf(prev => ({ ...prev, [bus.id]: false }));
        }
    };

    // Total stats
    const totalStats = allManifest.reduce((acc, r) => ({
        penumpang: acc.penumpang + (r.total_penumpang || 0),
        rute: acc.rute + 1,
    }), { penumpang: 0, rute: 0 });

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

            {/* ── TOP BAR ── */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-6 py-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-extrabold flex items-center gap-2">
                            <BarChart2 size={20} /> Manifest Penumpang
                        </h1>
                        <p className="text-slate-400 text-xs">Data penumpang per rute dan per bus</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { loadAll(); loadBuses(); }} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition" title="Refresh">
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => exportExcel('semua_plotting')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition"
                        title="Export hanya peserta yang sudah di-plotting (ada nomor bus)"
                    >
                        <FileSpreadsheet size={16} /> Export Sudah Plotting
                    </button>
                    <button
                        onClick={() => exportExcel('semua')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white font-bold text-sm transition"
                    >
                        <FileSpreadsheet size={16} /> Export Semua
                    </button>
                </div>
            </div>

            {/* ── STATS ── */}
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Rute', value: totalStats.rute, color: 'bg-slate-700', icon: <MapPin size={16} /> },
                    { label: 'Total Penumpang', value: totalStats.penumpang, color: 'bg-blue-600', icon: <Users size={16} /> },
                    { label: 'Total Bus', value: allBuses.length, color: 'bg-purple-600', icon: <Bus size={16} /> },
                    { label: 'Bus Tersedia', value: allBuses.filter(b => ((b.kapasitas_total || 0) - (b.terisi || 0)) > 0).length, color: 'bg-green-600', icon: <CheckCircle size={16} /> },
                ].map((s, i) => (
                    <div key={i} className={`${s.color} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm`}>
                        <div className="bg-white/20 p-2 rounded-lg shrink-0">{s.icon}</div>
                        <div><p className="text-2xl font-black">{s.value}</p><p className="text-xs opacity-80">{s.label}</p></div>
                    </div>
                ))}
            </div>

            <div className="px-6 pb-6 flex gap-5">

                {/* ── MAIN CONTENT ── */}
                <div className="flex-1 min-w-0 space-y-4">
                    {/* Tab Mode */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <button
                                onClick={() => setViewMode('rute')}
                                className={`px-5 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${viewMode === 'rute' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <MapPin size={15} /> Per Rute
                            </button>
                            <button
                                onClick={() => setViewMode('bus')}
                                className={`px-5 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 ${viewMode === 'bus' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Bus size={15} /> Per Bus
                            </button>
                        </div>
                        <button
                            onClick={() => setShowPanel(!showPanel)}
                            className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Filter size={13} /> {showPanel ? 'Sembunyikan' : 'Tampilkan'} Panel Bus
                        </button>
                    </div>

                    {/* VIEW: PER RUTE */}
                    {viewMode === 'rute' && (
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center p-12 text-slate-400 bg-white rounded-2xl border">
                                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 opacity-30" /> Memuat data...
                                </div>
                            ) : allManifest.length === 0 ? (
                                <div className="text-center p-12 bg-white rounded-2xl border text-slate-400">Belum ada data manifest.</div>
                            ) : allManifest.map((ruteData: any, idx: number) => (
                                <div key={ruteData.rute_id || idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Row header */}
                                    <div
                                        onClick={() => setExpandedRutes(p => ({ ...p, [ruteData.rute_id]: !p[ruteData.rute_id] }))}
                                        className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-100 p-3 rounded-xl">
                                                <MapPin size={22} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{ruteData.asal || 'Banda Aceh'} → {ruteData.tujuan}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span className="text-xs text-slate-500">{ruteData.waktu_berangkat || '—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="hidden md:flex gap-2 text-xs flex-wrap">
                                                <span className="bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-700">
                                                    <Users size={10} className="inline mr-1" />{ruteData.total_penumpang} orang
                                                </span>
                                                {ruteData.per_bus?.map((b: any) => (
                                                    <span key={b.nama_bus} className="bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full font-bold text-purple-700">
                                                        🚌 {b.nama_bus}: {b.jumlah_penumpang}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); exportExcel('rute', ruteData.rute_id, ruteData.tujuan); }}
                                                className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-100 transition"
                                            >
                                                <Download size={12} /> Export
                                            </button>
                                            {expandedRutes[ruteData.rute_id] ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                        </div>
                                    </div>

                                    {expandedRutes[ruteData.rute_id] && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                                            {ruteData.per_bus && ruteData.per_bus.length > 0 && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                                    {ruteData.per_bus.map((b: any) => (
                                                        <div key={b.nama_bus} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                                                            <p className="font-bold text-sm text-purple-700">{b.nama_bus}</p>
                                                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                                                <span>D: <b>{b.dewasa}</b></span>
                                                                <span>A: <b>{b.anak}</b></span>
                                                                <span>B: <b>{b.bayi}</b></span>
                                                            </div>
                                                            <p className="text-center font-bold text-slate-800 mt-1">{b.jumlah_penumpang} orang</p>
                                                        </div>
                                                    ))}
                                                    <div className="bg-blue-600 rounded-xl p-3 text-white">
                                                        <p className="font-bold text-sm">Total Rute</p>
                                                        <p className="text-2xl font-black">{ruteData.total_penumpang}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VIEW: PER BUS */}
                    {viewMode === 'bus' && (
                        <div className="space-y-3">
                            {allBuses.length === 0 ? (
                                <div className="text-center p-12 bg-white rounded-2xl border text-slate-400">Belum ada data bus.</div>
                            ) : allBuses.map((bus: any) => {
                                const manifest = busManifests[bus.id];
                                const isLoadingBus = loadingBus[bus.id];
                                const sisa = (bus.kapasitas_total || 0) - (bus.terisi || 0);
                                const isSelected = selectedBusId === bus.id;

                                return (
                                    <div
                                        key={bus.id}
                                        id={`bus-${bus.id}`}
                                        className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition ${isSelected ? 'border-purple-400 ring-2 ring-purple-200' : 'border-slate-200'}`}
                                    >
                                        <div className="p-5 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${sisa <= 0 ? 'bg-red-100' : sisa <= 5 ? 'bg-orange-100' : 'bg-purple-100'}`}>
                                                    <Bus size={22} className={sisa <= 0 ? 'text-red-600' : sisa <= 5 ? 'text-orange-600' : 'text-purple-600'} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{bus.nama_armada}</h3>
                                                    <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-slate-500">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{bus.plat_nomor || '—'}</span>
                                                        {bus.nama_supir && <span className="flex items-center gap-1"><User size={10} /> {bus.nama_supir}</span>}
                                                        <span className={`font-bold px-2 py-0.5 rounded ${sisa <= 0 ? 'bg-red-100 text-red-600' : 'bg-purple-50 text-purple-700'}`}>
                                                            {bus.terisi || 0}/{bus.kapasitas_total || 0} kursi
                                                        </span>
                                                        {sisa <= 0 && <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded">PENUH</span>}
                                                        {sisa > 0 && sisa <= 5 && <span className="text-orange-500 font-bold">⚠️ Sisa {sisa}</span>}
                                                        {bus.rute_tujuan && (
                                                            <span className="text-blue-500 flex items-center gap-1">
                                                                <MapPin size={10} /> {bus.rute_asal} → {bus.rute_tujuan}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => loadBusManifest(bus.id)}
                                                    disabled={isLoadingBus}
                                                    className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition"
                                                >
                                                    {isLoadingBus ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
                                                    {manifest ? 'Refresh' : 'Lihat'} Manifest
                                                </button>
                                                <button
                                                    onClick={() => exportExcel('bus', bus.id, bus.nama_armada)}
                                                    className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-100 transition"
                                                >
                                                    <Download size={13} /> Export
                                                </button>
                                                <button
                                                    onClick={() => exportPdf(bus)}
                                                    disabled={loadingPdf[bus.id]}
                                                    className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-100 transition disabled:opacity-50"
                                                    title="Export PDF Manifest (dengan checklist & grup per akun)"
                                                >
                                                    {loadingPdf[bus.id]
                                                        ? <RefreshCw size={13} className="animate-spin" />
                                                        : <FileText size={13} />}
                                                    PDF
                                                </button>
                                            </div>
                                        </div>

                                        {manifest && (
                                            <div className="border-t border-slate-100">
                                                <div className="bg-slate-50 px-5 py-3 flex flex-wrap gap-3 text-xs border-b border-slate-100">
                                                    <span className="font-bold text-slate-600">Rute: {manifest.rute_asal} → {manifest.rute_tujuan}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span>Dewasa: <b>{manifest.jumlah_dewasa}</b></span>
                                                    <span>Anak: <b>{manifest.jumlah_anak}</b></span>
                                                    <span>Bayi: <b>{manifest.jumlah_bayi}</b></span>
                                                    <span className="text-blue-700 font-bold">Total: {manifest.total_penumpang} orang</span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead className="bg-slate-100 text-slate-500 uppercase font-bold border-b">
                                                            <tr>
                                                                <th className="px-4 py-3 w-8">No</th>
                                                                <th className="px-4 py-3">Nama Peserta</th>
                                                                <th className="px-4 py-3">NIK</th>
                                                                <th className="px-4 py-3 text-center">Kat</th>
                                                                <th className="px-4 py-3 text-center">JK</th>
                                                                <th className="px-4 py-3">No HP</th>
                                                                <th className="px-4 py-3">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {manifest.penumpang?.map((p: any) => (
                                                                <tr key={p.kode_booking} className="hover:bg-blue-50/30 transition">
                                                                    <td className="px-4 py-3 font-bold text-slate-400">{p.no}</td>
                                                                    <td className="px-4 py-3 font-bold text-slate-800">{p.nama_peserta}</td>
                                                                    <td className="px-4 py-3 font-mono text-slate-500">{p.nik}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.kategori === 'DEWASA' ? 'bg-blue-100 text-blue-700' : p.kategori === 'ANAK' ? 'bg-yellow-100 text-yellow-700' : 'bg-pink-100 text-pink-700'}`}>
                                                                            {p.kategori}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center text-slate-600">{p.jenis_kelamin === 'LAKI-LAKI' ? 'L' : 'P'}</td>
                                                                    <td className="px-4 py-3 text-slate-500">{p.no_hp}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.status?.includes('SIAP') || p.status?.includes('TERKONFIRMASI') ? 'bg-green-100 text-green-700' : p.status?.includes('MENUNGGU') ? 'bg-yellow-100 text-yellow-700' : p.status?.includes('DITOLAK') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                            {p.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {(!manifest.penumpang || manifest.penumpang.length === 0) && (
                                                                <tr><td colSpan={7} className="p-6 text-center text-slate-400 italic">Belum ada penumpang di bus ini.</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── SIDE PANEL: STATUS BUS ── */}
                {showPanel && (
                    <div className="w-72 shrink-0 hidden xl:block">
                        <div className="sticky top-6">
                            <BusAvailabilityPanel buses={allBuses} onSelectBus={handleSelectBus} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}