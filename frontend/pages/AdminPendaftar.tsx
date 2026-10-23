import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import NotificationBell from '../components/admin/NotificationBell';
import {
    Search, CheckCircle, XCircle, Clock, LogOut, Printer,
    RefreshCw, Trash2, ChevronDown, ChevronUp, Bus, Users, Filter, MoreHorizontal,
    Send, MessageCircle, AlertTriangle, MapPin, Undo2, UserX, ArrowLeft, Info, LayoutDashboard,
    Lock, ShieldAlert, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, X,
    TrendingUp, BarChart3, CheckSquare
} from 'lucide-react';
import { AdminAPI, API, BASE_URL } from '../lib/api';
import ModalVerifikasi from '../components/admin/ModalVerifikasi';
import ModalBatal from '../components/admin/ModalBatal';

// --- TYPES ---
interface Pendaftar {
    id: number;
    uuid: string;
    nama_peserta: string;
    nik_peserta: string;
    no_hp_target: string;
    jenis_kelamin: string;
    kategori: string;
    rute_tujuan: string;
    rute_id?: number;
    tgl_berangkat: string;
    nama_bus: string;
    foto_bukti: string;
    status: string;
    kode_booking: string;
    id_keluarga: number;
    nama_kepala_keluarga: string;
    alasan_tolak?: string;
    created_at?: string;
    link_konfirmasi_dikirim?: boolean;
    konfirmasi_kirim_count?: number; // jumlah klik "Kirim Link Konfirmasi" oleh admin
}

interface PaginatedResponse {
    data: Pendaftar[];
    totalKeluarga: number;
    totalPages: number;
    currentPage: number;
}

// Urutan prioritas status anggota keluarga (index kecil = tampil duluan)
const STATUS_ORDER: Record<string, number> = {
    "TERVERIFIKASI/ SIAP BERANGKAT": 0,
    "TERKONFIRMASI": 0,
    "DITERIMA H-3": 1,
    "DITOLAK": 2,
    "PENDING": 2,
    "MENUNGGU VERIFIKASI": 3,
    "DIBATALKAN": 4,
};
const getStatusOrder = (status: string) => {
    const normalized = (status || "").replace(/_/g, " ").toUpperCase();
    for (const key of Object.keys(STATUS_ORDER)) {
        if (normalized.includes(key.toUpperCase())) return STATUS_ORDER[key];
    }
    return 99;
};

const groupData = (data: Pendaftar[]) => {
    const groups: Record<number, Pendaftar[]> = {};
    if (!Array.isArray(data)) return groups;
    data.forEach(item => {
        if (!item) return;
        const key = item.id_keluarga || item.id;
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    // Sort anggota per keluarga sesuai urutan prioritas status
    (Object.keys(groups) as any[]).forEach((k: any) => {
        if (!groups[k] || groups[k].length === 0) { delete groups[k]; return; }
        groups[k].sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));
    });
    return groups;
};

const LIMIT_OPTIONS = [20, 30, 50, 100];

// ── PAGINATION COMPONENT ──
const PaginationBar = ({ currentPage, totalPages, totalKeluarga, limit, onPageChange, onLimitChange, isLoading }: {
    currentPage: number;
    totalPages: number;
    totalKeluarga: number;
    limit: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    isLoading: boolean;
}) => {
    const startItem = (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalKeluarga);

    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>
                    Menampilkan <strong className="text-slate-700">{totalKeluarga === 0 ? 0 : startItem}–{endItem}</strong> dari <strong className="text-slate-700">{totalKeluarga}</strong> keluarga
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Per halaman:</span>
                    <select
                        value={limit}
                        onChange={e => onLimitChange(Number(e.target.value))}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {LIMIT_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onPageChange(1)} disabled={currentPage === 1 || isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-slate-600" title="Halaman Pertama"><ChevronsLeft size={16}/></button>
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-slate-600" title="Halaman Sebelumnya"><ChevronLeft size={16}/></button>
                {getPageNumbers().map((p, idx) =>
                    p === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-sm">•••</span>
                    ) : (
                        <button key={p} onClick={() => onPageChange(p as number)} disabled={isLoading} className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition ${p === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-blue-50 text-slate-600 hover:text-blue-700'}`}>{p}</button>
                    )
                )}
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-slate-600" title="Halaman Berikutnya"><ChevronRight size={16}/></button>
                <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages || isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition text-slate-600" title="Halaman Terakhir"><ChevronsRight size={16}/></button>
            </div>
        </div>
    );
};

export default function AdminPendaftar() {
    const navigate = useNavigate();
    const { addNotif } = useNotification();

    const [data, setData] = useState<Pendaftar[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalKeluarga, setTotalKeluarga] = useState(0);
    const [limit, setLimit] = useState(30);

    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [filterRute, setFilterRute] = useState("");
    const [filterRuteId, setFilterRuteId] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

    const [expandedFamilies, setExpandedFamilies] = useState<Record<number, boolean>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    const [showBatalWaModal, setShowBatalWaModal] = useState(false);
    const [batalWaTarget, setBatalWaTarget] = useState<{head: Pendaftar, familyId: number, members: Pendaftar[]} | null>(null);
    const [showBatalModal, setShowBatalModal] = useState(false);
    const [batalModalData, setBatalModalData] = useState<{user: any, passengers: any[]} | null>(null);
    const [globalStats, setGlobalStats] = useState<any>(null);

    // ── State modal pindah rute ──
    const [showPindahRuteModal, setShowPindahRuteModal] = useState(false);
    const [pindahRuteTarget, setPindahRuteTarget] = useState<{familyId: number, head: Pendaftar, members: Pendaftar[]} | null>(null);
    const [pindahRuteId, setPindahRuteId] = useState<string>("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Pendaftar | null>(null);
    const [showBusModal, setShowBusModal] = useState(false);
    const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
    const [selectedFamilyRuteId, setSelectedFamilyRuteId] = useState<number | null>(null);
    const [selectedBusId, setSelectedBusId] = useState<string>("");
    const [buses, setBuses] = useState<any[]>([]);
    const [allBuses, setAllBuses] = useState<any[]>([]);
    const [showVerifModal, setShowVerifModal] = useState(false);
    const [verifData, setVerifData] = useState<{user: any, passengers: any[]} | null>(null);

    const [allRuteObjects, setAllRuteObjects] = useState<any[]>([]);

    // ── State dropdown bertingkat untuk filter rute ──
    const [filterTujuan, setFilterTujuan] = useState("");
    const [filterTanggal, setFilterTanggal] = useState("");



    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setCurrentPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        fetch(`${API.RUTE}/admin`)
            .then(r => r.json())
            .then(json => { if (Array.isArray(json)) setAllRuteObjects(json); })
            .catch(() => {
                fetch(`${API.RUTE}`)
                    .then(r => r.json())
                    .then(json => { if (Array.isArray(json)) setAllRuteObjects(json); })
                    .catch(() => {});
            });

        const token = localStorage.getItem("token");
        fetch(`${API.BASE_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(json => setGlobalStats(json))
            .catch(() => {});
        fetch(`${API.ADMIN_KENDARAAN}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(json => { if (Array.isArray(json)) setAllBuses(json); })
            .catch(() => {});
    }, []);

    useEffect(() => { loadData(); }, [currentPage, limit, search, filterRute, filterRuteId, filterStatus, sortOrder]);

    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadData = async () => {
        setIsRefreshing(true);
        setExpandedFamilies({});
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            const params = new URLSearchParams({ page: String(currentPage), limit: String(limit), sort: sortOrder });
            if (search) params.append("search", search);
            if (filterRuteId) params.append("rute_id", filterRuteId);
            else if (filterRute) params.append("rute", filterRute);
            if (filterStatus) params.append("status", filterStatus);

            const [res, ruteRes] = await Promise.all([
                fetch(`${API.BASE_URL}/api/admin/pendaftar/paginated?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${API.RUTE}/admin`)
            ]);

            if (res.ok) {
                const json: PaginatedResponse = await res.json();
                if (json && Array.isArray(json.data)) {
                    setData(json.data.filter((d: any) => d && d.id));
                    setTotalPages(json.totalPages || 1);
                    setTotalKeluarga(json.totalKeluarga || 0);
                    setLastRefresh(new Date());
                }
            }
            if (ruteRes.ok) {
                const ruteJson = await ruteRes.json();
                if (Array.isArray(ruteJson)) setAllRuteObjects(ruteJson);
            }
        } catch(e) { console.error("Gagal load data:", e); }
        finally { setIsRefreshing(false); }
    };

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleLimitChange = (newLimit: number) => { setLimit(newLimit); setCurrentPage(1); };
    const handleFilterStatus = (val: string) => { setFilterStatus(val); setCurrentPage(1); };

    const clearFilters = () => {
        setSearchInput(""); setSearch(""); setFilterRute(""); setFilterRuteId("");
        setFilterTujuan(""); setFilterTanggal("");
        setFilterStatus(""); setSortOrder("ASC"); setCurrentPage(1);
    };

    const hasActiveFilter = search || filterRute || filterRuteId || filterStatus || sortOrder !== "ASC";

    const openWa = (head: Pendaftar, action: string) => {
        const noHp = head.no_hp_target;
        if (!noHp || noHp.length < 5) return;
        let hp = noHp.replace(/\D/g, "");
        if (hp.startsWith("0")) hp = "62" + hp.substring(1);
        const konfirmasiLink = `${window.location.origin}/konfirmasi/${head.uuid}`;
        let text = "";
        const nama = head.nama_kepala_keluarga || head.nama_peserta;
        if (action === 'DITERIMA H-3') {
            text = `Selamat Sdr/i *${nama}*!%0A%0APendaftaran Mudik Gratis Anda telah *DITERIMA* dan terverifikasi.%0A%0A📋 *Langkah Selanjutnya:*%0ASilakan pantau terus status tiket Anda di Dashboard aplikasi Seulamat.%0A%0A⏳ *Tunggu link konfirmasi kehadiran* yang akan dikirimkan oleh Admin Dishub Aceh sesuai jadwal (10-11 Maret 2026).%0A%0AJangan lakukan konfirmasi sebelum menerima link dari Admin.`;
        } else if (action === 'DITOLAK') {
            text = `Mohon Maaf Sdr/i *${nama}*.%0A%0APendaftaran Mudik Gratis Anda *DITOLAK* dikarenakan data tidak valid atau kuota penuh. Silakan hubungi panitia untuk informasi lebih lanjut.`;
        } else if (action === 'WA_BATAL') {
            text = `Mohon Maaf Sdr/i *${nama}*.%0A%0AKami memberitahukan bahwa pendaftaran Mudik Gratis Anda telah *DIBATALKAN* oleh Admin.%0A%0AJika ada pertanyaan, silakan hubungi panitia Mudik Gratis Dishub Aceh untuk informasi lebih lanjut.`;
        } else if (action === 'WA_H3') {
            text = `⚠️ *PENTING: KONFIRMASI KEHADIRAN* ⚠️%0A%0AHalo Sdr/i *${nama}*.%0AMengingat keberangkatan sudah mendekati jadwal. *KONFIRMASI KEHADIRAN* rombongan Anda.%0A%0AKlik link berikut untuk konfirmasi (Wajib):%0A${konfirmasiLink}%0A%0APeserta yang tidak dikonfirmasi akan dianggap batal.`;
        } else if (action === 'WA_VERIF') {
            text = `👋 *Salam Seulamat dari Dishub Aceh*%0A%0AYth. Sdr/i *${nama}*,%0AData pendaftaran Mudik Gratis Anda sedang *DALAM PROSES VERIFIKASI* oleh tim petugas.%0A%0AMohon bersabar. Anda akan mendapat notifikasi WhatsApp kembali setelah verifikasi selesai.%0A%0A📞 *Hotline:* 08217653093`;
        } else if (action === 'WA_TIKET') {
            text = `🎫 *INFORMASI TIKET MUDIK GRATIS* 🎫%0A%0AYth. Sdr/i *${nama}*,%0ASelamat! Rombongan Anda telah ditetapkan untuk keberangkatan Mudik Gratis.%0A%0ASilakan cek detail tiket dan info bus di aplikasi Seulamat atau hubungi panitia.%0A%0A📞 *Hotline:* 08217653093`;
        }
        if (text) window.open(`https://wa.me/${hp}?text=${text}`, "_blank");
        else window.open(`https://wa.me/${hp}`, "_blank");
    };

    const sendWaBlast = async (head: Pendaftar, action: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API.BASE_URL}/api/admin/kirim-wa/${action.toLowerCase()}/${head.id_keluarga}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            const nama = head.nama_kepala_keluarga || head.nama_peserta;

            if (res.ok && json.sapa_ok === true) {
                addNotif({
                    type: 'pendaftar',
                    title: '📱 WA Terkirim via SAPA Blast',
                    message: `✅ Pesan WA "${action}" berhasil dikirim ke ${nama} via SAPA.`,
                    link: '/admin/verifikasi'
                });
                return true;
            }

            if (res.ok && json.sapa_ok === false) {
                console.warn("[WA Blast] SAPA offline, fallback ke wa.me:", json.pesan);
                addNotif({
                    type: 'pendaftar',
                    title: '⚠️ SAPA Tidak Terhubung',
                    message: `SAPA Blast gagal untuk ${nama}. Membuka WA manual sebagai fallback...`,
                    link: '/admin/verifikasi'
                });
                return false;
            }

            console.warn("[WA Blast] HTTP error:", json.error || "unknown");
            return false;
        } catch (err) {
            console.warn("[WA Blast] Network error:", err);
            return false;
        }
    };

    const handleMenuAction = async (action: string, familyId: number, head: Pendaftar, members: Pendaftar[]) => {
        if (action === "CUSTOM_VERIF") { setVerifData({ user: head, passengers: members }); setShowVerifModal(true); return; }
        if (action === "PLOTTING") { openPlotting(familyId, head.rute_id); return; }
        if (action === "KIRIM_LINK_KONFIRMASI") {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API.BASE_URL}/api/admin/kirim-link-konfirmasi/${familyId}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const nama = head.nama_kepala_keluarga || head.nama_peserta;
                    const count = json.kirim_count || 1;
                    const sapaOk = json.sapa_ok !== false;

                    if (sapaOk) {
                        addNotif({
                            type: 'pendaftar',
                            title: `📩 Link Konfirmasi Terkirim (${count}x)`,
                            message: `Konfirmasi berhasil dikirim ke keluarga ${nama} via SAPA Blast. Total klik: ${count}x.`,
                            link: '/admin/verifikasi'
                        });
                    } else {
                        addNotif({
                            type: 'pendaftar',
                            title: `⚠️ SAPA Offline – WA Manual (${count}x klik)`,
                            message: `SAPA tidak terhubung. Link konfirmasi dibuka via WA manual. Total klik admin: ${count}x.`,
                            link: '/admin/verifikasi'
                        });
                        openWa(head, 'WA_H3');
                    }
                    await loadData();
                } else {
                    alert("❌ Gagal: " + (json.error || "Terjadi kesalahan"));
                }
            } catch (err) {
                alert("Gagal kirim link konfirmasi.");
            }
            return;
        }
        if (["WA_VERIF", "WA_H3", "WA_TIKET"].includes(action)) {
            const blastOk = await sendWaBlast(head, action);
            if (!blastOk) openWa(head, action);
            return;
        }
        let statusKirim = action;
        if (action === "RESET") statusKirim = "MENUNGGU VERIFIKASI";
        const confirmMsg = action === "RESET" ? `PULIHKAN data keluarga ini kembali ke status Menunggu Verifikasi?` : `Yakin ubah status menjadi ${statusKirim}?`;
        if (!window.confirm(confirmMsg)) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(`${API.ADMIN_VERIF_KELUARGA}/${familyId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: statusKirim }) });
            await loadData();
            if (statusKirim === 'DIBATALKAN') { setBatalWaTarget({ head, familyId, members }); setShowBatalWaModal(true); }
            const namaKeluarga = head.nama_kepala_keluarga || head.nama_peserta;
            if (statusKirim === 'DITERIMA H-3') addNotif({ type: 'pendaftar', title: '✅ Pendaftar Diterima', message: `Keluarga ${namaKeluarga} berhasil diterima (H-3).`, link: '/admin/verifikasi', meta: { familyId } });
            else if (statusKirim === 'DITOLAK') addNotif({ type: 'pendaftar', title: '❌ Pendaftar Ditolak', message: `Keluarga ${namaKeluarga} telah ditolak.`, link: '/admin/verifikasi', meta: { familyId } });
            else if (statusKirim === 'MENUNGGU VERIFIKASI') addNotif({ type: 'pendaftar', title: '🔄 Status Dipulihkan', message: `Keluarga ${namaKeluarga} dipulihkan ke Menunggu Verifikasi.`, link: '/admin/verifikasi', meta: { familyId } });
            else if (statusKirim === 'DIBATALKAN') addNotif({ type: 'pendaftar', title: '🗑️ Pendaftar Dibatalkan', message: `Data keluarga ${namaKeluarga} ditandai dibatalkan.`, link: '/admin/verifikasi', meta: { familyId } });
        } catch (err) { alert("Gagal update status."); }
    };

    const updateStatusIndividual = async (id: number, newStatus: string, namaPeserta?: string) => {
        let alasan = '';
        if (newStatus === 'DITOLAK') {
            alasan = window.prompt(`Tolak ${namaPeserta || 'peserta ini'}?\n\nMasukkan alasan penolakan (wajib):`, '') ?? '';
            if (alasan.trim() === '') { alert('Penolakan dibatalkan — alasan wajib diisi.'); return; }
        } else if (newStatus === 'MENUNGGU VERIFIKASI') {
            if (!window.confirm(`Pulihkan status peserta ini ke MENUNGGU VERIFIKASI?`)) return;
        } else {
            if (!window.confirm(`Ubah status peserta ini menjadi ${newStatus}?`)) return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.ADMIN_VERIF}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: newStatus, alasan }) });
            if (res.ok) { loadData(); setIsModalOpen(false); }
            else { const json = await res.json(); alert('Gagal: ' + (json.error || 'Terjadi kesalahan')); }
        } catch (err) { alert('Terjadi kesalahan jaringan.'); }
    };

    const openPlotting = async (famId: number, ruteId?: number) => {
        setSelectedFamilyId(famId);
        setSelectedFamilyRuteId(ruteId || null);
        setSelectedBusId("");   // reset pilihan dari sesi sebelumnya
        setBuses([]);
        try {
            const token = localStorage.getItem("token");
            const url = ruteId ? `${API.ADMIN_KENDARAAN}?rute_id=${ruteId}` : API.ADMIN_KENDARAAN;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
            const json = await res.json();
            setBuses(Array.isArray(json) ? json : []);
            setShowBusModal(true);
        } catch (e) { alert("Gagal load daftar bus."); }
    };

    const submitPlotting = async () => {
        if (!selectedBusId || !selectedFamilyId) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${API.ADMIN_ASSIGN_BUS}?user_id=${selectedFamilyId}&kendaraan_id=${selectedBusId}`,
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            const json = await res.json();
            if (res.ok) {
                const namaB = buses.find((b: any) => String(b.id) === selectedBusId)?.nama_armada || selectedBusId;
                setShowBusModal(false);
                setSelectedBusId("");
                await loadData();
                addNotif({ type: 'pendaftar', title: '🚌 Plotting Bus Berhasil', message: `Rombongan berhasil di-assign ke bus ${namaB}.`, link: '/admin/verifikasi' });
                alert("✅ Plotting Berhasil!");
            } else {
                alert("❌ Gagal: " + (json.error || "Terjadi kesalahan"));
            }
        } catch (err) {
            alert("❌ Terjadi kesalahan jaringan saat plotting bus.");
        }
    };

    const handleKonfirmasiManual = async (familyId: number, members: Pendaftar[]) => {
        const eligible = members.filter(m => m.status === 'DITERIMA H-3' || m.status.includes('DITERIMA'));
        if (eligible.length === 0) { alert('Tidak ada peserta dengan status DITERIMA H-3 untuk dikonfirmasi.'); return; }
        if (!window.confirm(`⚠️ KONFIRMASI MANUAL DARURAT\n\nIni akan mengkonfirmasi ${eligible.length} peserta langsung.\n\nLanjutkan?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.BASE_URL}/api/admin/konfirmasi-manual/${familyId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids_konfirmasi: eligible.map(m => m.id) }) });
            const json = await res.json();
            if (res.ok) { alert(`✅ Konfirmasi manual berhasil!\n${json.pesan}`); loadData(); }
            else { alert('Gagal: ' + (json.error || 'Terjadi kesalahan')); }
        } catch { alert('Terjadi kesalahan jaringan.'); }
    };

    const handleBatalkanPlotting = async (familyId: number, head: Pendaftar) => {
        if (!window.confirm(`Batalkan plotting bus untuk keluarga "${head.nama_kepala_keluarga || head.nama_peserta}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.BASE_URL}/api/admin/batalkan-plotting/${familyId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (res.ok) { alert(`✅ ${json.pesan}`); loadData(); addNotif({ type: 'pendaftar', title: '🚌 Plotting Dibatalkan', message: `Plotting bus keluarga ${head.nama_kepala_keluarga || head.nama_peserta} berhasil dibatalkan.`, link: '/admin/verifikasi' }); }
            else { alert('Gagal: ' + (json.error || 'Terjadi kesalahan')); }
        } catch { alert('Terjadi kesalahan jaringan.'); }
    };

    const handleBatalkanPeserta = async (m: Pendaftar) => {
        if (m.status === 'DIBATALKAN') { alert('Peserta sudah dibatalkan.'); return; }
        if (!window.confirm(`Batalkan peserta "${m.nama_peserta}"?\n\nAnggota keluarga lain TIDAK terpengaruh.`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.BASE_URL}/api/admin/batalkan-peserta/${m.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (res.ok) { alert(`✅ ${json.pesan}`); loadData(); }
            else { alert('Gagal: ' + (json.error || 'Terjadi kesalahan')); }
        } catch { alert('Terjadi kesalahan jaringan.'); }
    };

    const handleTerimaDarurat = async (familyId: number, head: Pendaftar) => {
        const nama = head.nama_kepala_keluarga || head.nama_peserta;
        if (!window.confirm(`⚡ TERIMA DARURAT keluarga "${nama}"?\n\nIni akan langsung set status DITERIMA H-3 tanpa cek kuota.\n\nLanjutkan?`)) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API.BASE_URL}/api/admin/terima-darurat/${familyId}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) { alert(`✅ ${json.pesan}`); loadData(); }
            else { alert("Gagal: " + (json.error || "Terjadi kesalahan")); }
        } catch { alert("Terjadi kesalahan jaringan."); }
    };

    const handleHapusPermanenKeluarga = async (familyId: number, head: Pendaftar) => {
        const namaKeluarga = head.nama_kepala_keluarga || head.nama_peserta;
        if (!window.confirm(`⚠️ HAPUS PERMANEN semua data DIBATALKAN keluarga "${namaKeluarga}"?\n\nIni akan:\n• Menghapus data dari database\n• Membebaskan NIK agar bisa daftar ulang ke rute lain\n\nData TIDAK bisa dipulihkan. Lanjutkan?`)) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API.BASE_URL}/api/admin/hapus-pendaftaran/keluarga/${familyId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (res.ok) { alert(`✅ ${json.pesan}`); loadData(); }
            else { alert("Gagal: " + (json.error || "Terjadi kesalahan")); }
        } catch { alert("Terjadi kesalahan jaringan."); }
    };

    const handleKonfirmasiPindahRute = async () => {
        if (!pindahRuteTarget || !pindahRuteId) return;
        const { familyId, head, members } = pindahRuteTarget;
        const ruteBaruObj = allRuteObjects.find((r: any) => String(r.rute_id) === pindahRuteId);
        const namaRuteBaru = ruteBaruObj ? `${ruteBaruObj.asal} → ${ruteBaruObj.tujuan} (${ruteBaruObj.waktu_berangkat || ""})` : `ID ${pindahRuteId}`;
        if (!window.confirm(`Pindahkan keluarga "${head.nama_kepala_keluarga || head.nama_peserta}" ke rute baru?\n\n${namaRuteBaru}\n\nSemua anggota (${members.length} orang) akan dipindah. Lanjutkan?`)) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API.BASE_URL}/api/admin/pindah-rute/${familyId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ rute_id: parseInt(pindahRuteId) })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`✅ ${json.pesan}`);
                setShowPindahRuteModal(false);
                setPindahRuteTarget(null);
                setPindahRuteId("");
                loadData();
            } else {
                alert("Gagal: " + (json.error || "Terjadi kesalahan"));
            }
        } catch { alert("Terjadi kesalahan jaringan."); }
    };

    const downloadTiket = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API.TIKET}/download/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error("Gagal");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Tiket-Mudik-${id}.pdf`; document.body.appendChild(a); a.click(); a.remove();
        } catch (e) { alert("Tiket belum tersedia."); }
    };

    // ── Kirim link konfirmasi ke semua DITERIMA H-3 (1 klik, 1 endpoint) ──
    const handleKirimKonfirmasiSemuaH3 = async () => {
        if (!window.confirm(`Kirim link konfirmasi ke SEMUA keluarga berstatus DITERIMA H-3?\n\nPastikan SAPA sudah terhubung sebelum melanjutkan.`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API.BASE_URL}/api/admin/kirim-konfirmasi-semua-h3`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                addNotif({ type: 'pendaftar', title: '📩 Konfirmasi Massal Terkirim', message: json.pesan || 'Link konfirmasi berhasil dikirim ke semua DITERIMA H-3.', link: '/admin/verifikasi' });
                alert(`✅ ${json.pesan || 'Berhasil dikirim!'}`);
                loadData();
            } else {
                alert('❌ Gagal: ' + (json.error || 'Terjadi kesalahan'));
            }
        } catch {
            alert('Terjadi kesalahan jaringan.');
        }
    };

    const groupedList = groupData(data);
    const groupedKeys = Object.keys(groupedList).filter(k => { const m = groupedList[Number(k)]; return Array.isArray(m) && m.length > 0 && !!m[0]; });

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: any = {
            'DITERIMA H-3': 'bg-blue-100 text-blue-700 border-blue-200',
            'PENDING': 'bg-orange-100 text-orange-700 border-orange-200',
            'TERVERIFIKASI/ SIAP BERANGKAT': 'bg-green-100 text-green-700 border-green-200',
            'DITOLAK': 'bg-red-100 text-red-700 border-red-200',
            'MENUNGGU VERIFIKASI': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'DIBATALKAN': 'bg-slate-200 text-slate-500 border-slate-300'
        };
        const normalizedStatus = (status || "-").replace(/_/g, " ");
        return <span className={`px-2 py-1 rounded text-[10px] font-bold border tracking-wide ${styles[normalizedStatus] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{normalizedStatus}</span>;
    };

    const groupedValues = Object.values(groupedList).filter(m => Array.isArray(m) && m.length > 0 && m[0]);
    const statsMenunggu = groupedValues.filter(m => (m[0]?.status || "").includes("MENUNGGU")).length;
    const statsSiapPlotting = groupedValues.filter(m => { const s = (m[0]?.status || "").replace(/_/g," "); return s.includes("SIAP BERANGKAT") || s.includes("TERKONFIRMASI"); }).length;
    const statsTotalOrang = data.length;

    const getKuotaRute = (ruteId: number | undefined, _ruteTujuan: string): { sisa: number; total: number; terisi: number; menunggu: number } | null => {
        if (!ruteId) return null;
        const r = allRuteObjects.find((x: any) => x.rute_id === ruteId);
        if (!r) return null;
        return {
            total:    r.kuota_total    ?? 0,
            terisi:   r.kuota_terisi   ?? 0,
            sisa:     r.sisa_kuota     ?? (r.kuota_total ?? 0) - (r.kuota_terisi ?? 0),
            menunggu: r.kuota_menunggu ?? 0,
        };
    };

    const uniqueTujuan = Array.from(new Set(allRuteObjects.map((r: any) => r.tujuan))).filter(Boolean).sort() as string[];
    const ruteByTujuan = filterTujuan ? allRuteObjects.filter((r: any) => r.tujuan === filterTujuan) : [];
    const uniqueTanggal = Array.from(new Set(ruteByTujuan.map((r: any) => r.tanggal_berangkat || "").filter(Boolean))).sort() as string[];
    const ruteByTanggal = filterTanggal ? ruteByTujuan.filter((r: any) => r.tanggal_berangkat === filterTanggal) : [];
    const uniqueJam = ruteByTanggal.map((r: any) => ({ rute_id: r.rute_id, jam: r.jam_berangkat || "–" }));

    const applyRuteFilter = (ruteId: string, tujuan: string) => {
        setFilterRuteId(ruteId);
        setFilterRute(tujuan);
        setCurrentPage(1);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

            {/* ── TOP BAR ── */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><ArrowLeft size={20}/></button>
                    <div>
                        <h1 className="text-lg font-extrabold">Verifikasi & Plotting Penumpang</h1>
                        <p className="text-slate-400 text-xs mt-0.5">Kelola status pendaftaran, konfirmasi H-3, dan assign bus</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <NotificationBell />
                    <button onClick={() => setShowInfo(!showInfo)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${showInfo ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                        <Info size={16}/> Panduan
                    </button>
                    <button
                        onClick={handleKirimKonfirmasiSemuaH3}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white transition shadow-lg border border-blue-400"
                    >
                        <Send size={16}/> Kirim Konfirmasi Semua H-3
                    </button>
                    <button onClick={() => navigate('/admin/kendaraan')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-purple-500 hover:bg-purple-600 text-white transition shadow-lg">
                        <Bus size={16}/> Kelola Bus
                    </button>
                </div>
            </div>

            <div className="p-6">

            {/* ── PANDUAN ── */}
            {showInfo && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
                    <h3 className="font-extrabold text-slate-800 mb-5 flex items-center gap-2 text-base"><LayoutDashboard size={20} className="text-blue-600"/> Alur Kerja Verifikasi & Plotting</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                        {[
                            { step:"01", color:"bg-amber-500", title:"Menunggu Verifikasi", icon:"⏳", desc:"Pendaftar baru masuk. Klik ⋯ → Verifikasi Detail (Checkbox) untuk memeriksa data satu per satu, atau Terima Darurat untuk bypass kuota." },
                            { step:"02", color:"bg-blue-500", title:"Diterima H-3", icon:"✅", desc:"Data valid. Klik Kirim Link Konfirmasi via WA. Peserta harus konfirmasi kehadiran mandiri sebelum H-3." },
                            { step:"03", color:"bg-green-500", title:"Siap Berangkat", icon:"🚌", desc:"Peserta sudah konfirmasi. Klik Plotting Bus untuk assign bus. Nomor bus akan muncul di tiket digital." },
                            { step:"04", color:"bg-indigo-500", title:"WA Tiket", icon:"🎫", desc:"Setelah plotting, kirim WA Info Tiket agar peserta tahu nomor bus dan lokasi keberangkatan." },
                        ].map(s => (
                            <div key={s.step} className="flex flex-col gap-2">
                                <div className={`${s.color} text-white text-xs font-black px-2 py-0.5 rounded-full w-fit`}>LANGKAH {s.step}</div>
                                <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">{s.icon} {s.title}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── FILTER BAR ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5">
                <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center border-b border-slate-100">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" placeholder="🔍  Cari nama, NIK, atau kepala keluarga..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 transition" value={searchInput} onChange={e => setSearchInput(e.target.value)}/>
                        {searchInput && <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15}/></button>}
                    </div>
                    <button onClick={() => setFilterPanelOpen(p => !p)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition shrink-0 ${filterPanelOpen || filterRute || filterRuteId || filterStatus ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <SlidersHorizontal size={15}/> Filter
                        {(filterRute || filterRuteId || filterStatus) && <span className="bg-white/30 text-white text-xs font-black px-1.5 py-0.5 rounded-full ml-0.5">{[filterRute || filterRuteId, filterStatus].filter(Boolean).length}</span>}
                    </button>
                    <button onClick={() => { setCurrentPage(1); loadData(); }} disabled={isRefreshing} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition shrink-0 ${isRefreshing ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''}/> {isRefreshing ? 'Memuat...' : 'Refresh'}
                    </button>
                    <button onClick={() => { setSortOrder(s => s === "ASC" ? "DESC" : "ASC"); setCurrentPage(1); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition shrink-0 ${sortOrder === "DESC" ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`} title={sortOrder === "ASC" ? "Urut dari pendaftar paling lama (jam masuk pertama kali)" : "Urut dari pendaftar paling baru"}>
                        {sortOrder === "ASC" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {sortOrder === "ASC" ? "Terlama" : "Terbaru"}
                    </button>
                </div>

                {/* Filter Panel */}
                {filterPanelOpen && (
                    <div className="border-b border-slate-100 bg-slate-50/60">
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin size={13} className="text-blue-500"/>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Filter Rute Keberangkatan</span>
                                {(filterTujuan) && (
                                    <button onClick={() => { setFilterTujuan(""); setFilterTanggal(""); applyRuteFilter("", ""); }} className="ml-auto text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1 font-bold">
                                        <X size={11}/> Reset Rute
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                                        <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-black">1</span>
                                        Kota Tujuan
                                    </p>
                                    <div className="relative">
                                        <select
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-sm appearance-none font-medium"
                                            value={filterTujuan}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFilterTujuan(val);
                                                setFilterTanggal("");
                                                if (!val) { applyRuteFilter("", ""); }
                                                else {
                                                    const ruteUntukTujuan = allRuteObjects.filter((r: any) => r.tujuan === val);
                                                    if (ruteUntukTujuan.length === 1) {
                                                        applyRuteFilter(String(ruteUntukTujuan[0].rute_id), val);
                                                    } else {
                                                        setFilterRute(val);
                                                        setFilterRuteId("");
                                                        setCurrentPage(1);
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="">-- Semua Tujuan --</option>
                                            {uniqueTujuan.map((t) => {
                                                const cnt = allRuteObjects.filter((r: any) => r.tujuan === t).length;
                                                return <option key={t} value={t}>Banda Aceh → {t} ({cnt} jadwal)</option>;
                                            })}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15}/>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${filterTujuan && uniqueTanggal.length > 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>2</span>
                                        Tanggal
                                    </p>
                                    <div className="relative">
                                        <select
                                            className={`w-full p-2.5 border rounded-xl outline-none cursor-pointer text-sm appearance-none font-medium transition ${filterTujuan && uniqueTanggal.length > 1 ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                                            value={filterTanggal}
                                            disabled={!filterTujuan || uniqueTanggal.length <= 1}
                                            onChange={(e) => {
                                                const tgl = e.target.value;
                                                setFilterTanggal(tgl);
                                                if (!tgl) { setFilterRuteId(""); setFilterRute(filterTujuan); setCurrentPage(1); return; }
                                                const rute = ruteByTujuan.filter((r: any) => r.tanggal_berangkat === tgl);
                                                if (rute.length === 1) applyRuteFilter(String(rute[0].rute_id), filterTujuan);
                                                else { setFilterRuteId(""); setFilterRute(filterTujuan); setCurrentPage(1); }
                                            }}
                                        >
                                            <option value="">{filterTujuan && uniqueTanggal.length > 1 ? '-- Semua Tanggal --' : '–'}</option>
                                            {uniqueTanggal.map((tgl) => {
                                                let label = tgl;
                                                try { label = new Date(tgl).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); } catch {}
                                                return <option key={tgl} value={tgl}>{label}</option>;
                                            })}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15}/>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${uniqueJam.length > 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>3</span>
                                        Jam
                                    </p>
                                    <div className="relative">
                                        <select
                                            className={`w-full p-2.5 border rounded-xl outline-none cursor-pointer text-sm appearance-none font-medium transition ${uniqueJam.length > 1 ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                                            value={filterRuteId}
                                            disabled={uniqueJam.length <= 1}
                                            onChange={(e) => { applyRuteFilter(e.target.value, filterTujuan); }}
                                        >
                                            <option value="">{uniqueJam.length > 1 ? '-- Semua Jam --' : '–'}</option>
                                            {uniqueJam.map((j) => (
                                                <option key={j.rute_id} value={String(j.rute_id)}>{j.jam}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15}/>
                                    </div>
                                </div>
                            </div>
                            {filterRute && (
                                <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                                    <CheckCircle size={13} className="text-blue-600 shrink-0"/>
                                    <span>
                                        <strong>Banda Aceh → {filterRute}</strong>
                                        {filterTanggal && <> • <strong>{(() => { try { return new Date(filterTanggal).toLocaleDateString("id-ID", {day:"numeric",month:"short",year:"numeric"}); } catch { return filterTanggal; } })()}</strong></>}
                                        {filterRuteId && uniqueJam.find(j => String(j.rute_id) === filterRuteId) && <> • <strong>{uniqueJam.find(j => String(j.rute_id) === filterRuteId)?.jam} WIB</strong></>}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mx-4 border-t border-slate-200"/>

                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter size={13} className="text-slate-400"/>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Status Pendaftaran</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: "Semua",          val: "",                      icon: "🗂️",  base: "bg-white text-slate-600 border-slate-200 hover:border-blue-300", active: "bg-blue-600 text-white border-blue-600" },
                                    { label: "Tunggu Verif",   val: "MENUNGGU VERIFIKASI",    icon: "⏳",  base: "bg-white text-amber-700 border-amber-200 hover:bg-amber-50",    active: "bg-amber-500 text-white border-amber-500" },
                                    { label: "Diterima H-3",   val: "DITERIMA H-3",           icon: "✅",  base: "bg-white text-blue-700 border-blue-200 hover:bg-blue-50",       active: "bg-blue-500 text-white border-blue-500" },
                                    { label: "Siap Berangkat", val: "SIAP BERANGKAT",         icon: "🚌",  base: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50", active: "bg-emerald-600 text-white border-emerald-600" },
                                    { label: "Pending",        val: "PENDING",                icon: "🔒",  base: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",    active: "bg-slate-600 text-white border-slate-600" },
                                    { label: "Ditolak",        val: "DITOLAK",                icon: "❌",  base: "bg-white text-red-700 border-red-200 hover:bg-red-50",          active: "bg-red-500 text-white border-red-500" },
                                    { label: "Dibatalkan",     val: "DIBATALKAN",             icon: "🗑️",  base: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",    active: "bg-slate-500 text-white border-slate-500" },
                                ].map(f => (
                                    <button key={f.val} onClick={() => handleFilterStatus(filterStatus === f.val ? "" : f.val)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filterStatus === f.val ? f.active : f.base}`}>
                                        <span>{f.icon}</span> {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {hasActiveFilter && (
                            <div className="px-4 pb-3 flex justify-end">
                                <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 transition">
                                    <X size={12}/> Hapus Semua Filter
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Status bar */}
                <div className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        {lastRefresh && <><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> Diperbarui: <strong>{lastRefresh.toLocaleTimeString('id-ID')}</strong></>}
                        <span className="ml-2"><strong className="text-slate-800">{totalKeluarga}</strong> total keluarga{hasActiveFilter && <span className="ml-1 text-blue-600 font-bold">(filtered)</span>}</span>
                    </div>
                    {hasActiveFilter && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {search && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">"{search}"<button onClick={() => { setSearch(""); setSearchInput(""); }}><X size={10}/></button></span>}
                            {filterRute && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">📍 → {filterRute}<button onClick={() => { setFilterTujuan(""); setFilterTanggal(""); applyRuteFilter("", ""); }}><X size={10}/></button></span>}
                            {filterStatus && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">{filterStatus}<button onClick={() => handleFilterStatus("")}><X size={10}/></button></span>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── GLOBAL STATS ── */}
            {globalStats && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={15} className="text-indigo-500"/>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Statistik Global Semua Pendaftar</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {[
                            { label: "Total Masuk",    value: globalStats.total_masuk,      color: "text-slate-700",  bg: "bg-slate-100" },
                            { label: "Menunggu",       value: globalStats.total_menunggu,   color: "text-amber-700",  bg: "bg-amber-50" },
                            { label: "Diterima H-3",   value: globalStats.total_diterima,   color: "text-blue-700",   bg: "bg-blue-50" },
                            { label: "Siap Berangkat", value: globalStats.total_siap,       color: "text-green-700",  bg: "bg-green-50" },
                            { label: "Ditolak",        value: globalStats.total_ditolak,    color: "text-red-700",    bg: "bg-red-50" },
                            { label: "Sisa Kuota",     value: globalStats.sisa_kuota_global, color: "text-purple-700", bg: "bg-purple-50" },
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                                <p className={`text-xl font-black ${s.color}`}>{s.value ?? "–"}</p>
                                <p className={`text-[10px] font-bold ${s.color} opacity-80 mt-0.5`}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                    {Array.isArray(globalStats.detail_rute) && globalStats.detail_rute.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sisa Kuota Per Rute</p>
                            <div className="relative">
                                <select
                                    className="w-full p-3 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none"
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const r = globalStats.detail_rute[Number(e.target.value)];
                                        if (r) {
                                            setFilterTujuan(r.tujuan);
                                            setFilterRute(r.tujuan);
                                            setFilterRuteId(r.rute_id ? String(r.rute_id) : "");
                                            setFilterTanggal(r.tanggal_berangkat || "");
                                            setCurrentPage(1);
                                            setFilterPanelOpen(false);
                                        }
                                    }}
                                >
                                    <option value="">— Pilih rute untuk melihat detail / langsung filter —</option>
                                    {globalStats.detail_rute.map((r: any, i: number) => {
                                        const terisiKuota = (r.total_kursi ?? 0) - (r.sisa_kuota ?? 0);
                                        const status = r.sisa_kuota <= 0 ? "PENUH" : r.sisa_kuota <= 5 ? "HAMPIR PENUH" : "Tersedia";
                                        const tglRaw = r.tanggal_berangkat || r.tgl_berangkat || r.waktu_berangkat || "";
                                        let tglLabel = "";
                                        try {
                                            if (tglRaw) {
                                                const tglParsed = new Date(tglRaw);
                                                const dateOnly = isNaN(tglParsed.getTime()) ? null : tglParsed;
                                                if (dateOnly) tglLabel = ` • ${dateOnly.toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"})}`;
                                                else tglLabel = ` • ${tglRaw.split("T")[0].split(" ")[0]}`;
                                            }
                                        } catch {}
                                        const jamLabel = r.jam_berangkat ? ` ${r.jam_berangkat} WIB` : "";
                                        return (
                                            <option key={i} value={i}>
                                                Banda Aceh → {r.tujuan}{tglLabel}{jamLabel} — Terisi: {terisiKuota}/{r.total_kursi} | Sisa {r.sisa_kuota} [{status}]
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats bar halaman ini */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                    { label: "Total Keluarga (Halaman Ini)", value: groupedKeys.length, color: "bg-slate-700", icon: <Users size={16}/> },
                    { label: "Menunggu Verifikasi",          value: statsMenunggu,      color: "bg-amber-500", icon: <Clock size={16}/> },
                    { label: "Siap Plotting",                value: statsSiapPlotting,  color: "bg-green-600", icon: <Bus size={16}/> },
                    { label: "Total Orang (Halaman Ini)",    value: statsTotalOrang,    color: "bg-blue-600",  icon: <Users size={16}/> },
                ].map((s, i) => (
                    <div key={i} className={`${s.color} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm`}>
                        <div className="bg-white/20 p-2 rounded-lg shrink-0">{s.icon}</div>
                        <div><p className="text-2xl font-black">{s.value}</p><p className="text-xs opacity-80 font-medium">{s.label}</p></div>
                    </div>
                ))}
            </div>

            {/* ── TABEL UTAMA ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <PaginationBar currentPage={currentPage} totalPages={totalPages} totalKeluarga={totalKeluarga} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} isLoading={isRefreshing}/>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3.5 w-10 font-bold">#</th>
                                <th className="px-5 py-3.5 font-bold">Kepala Keluarga</th>
                                <th className="px-5 py-3.5 font-bold">Rute & Jadwal</th>
                                <th className="px-5 py-3.5 text-center font-bold">Jml</th>
                                <th className="px-5 py-3.5 text-center font-bold">Status</th>
                                <th className="px-5 py-3.5 text-center font-bold">Plotting Bus</th>
                                <th className="px-5 py-3.5 text-right w-20 font-bold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isRefreshing ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-5"><div className="w-8 h-8 bg-slate-200 rounded-lg"/></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-40 mb-2"/><div className="h-3 bg-slate-100 rounded w-24"/></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-32 mb-2"/><div className="h-3 bg-slate-100 rounded w-20"/></td>
                                        <td className="px-6 py-5 text-center"><div className="h-6 bg-slate-200 rounded-full w-12 mx-auto"/></td>
                                        <td className="px-6 py-5 text-center"><div className="h-6 bg-slate-200 rounded w-28 mx-auto"/></td>
                                        <td className="px-6 py-5 text-center"><div className="h-6 bg-slate-100 rounded w-24 mx-auto"/></td>
                                        <td className="px-6 py-5 text-right"><div className="h-8 w-8 bg-slate-200 rounded-lg ml-auto"/></td>
                                    </tr>
                                ))
                            ) : groupedKeys.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Search size={36} className="opacity-30"/>
                                            <p className="font-bold text-slate-500">Data tidak ditemukan</p>
                                            {hasActiveFilter && <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Hapus filter dan coba lagi</button>}
                                        </div>
                                    </td>
                                </tr>
                            ) : groupedKeys.map((key, rowIndex) => {
                                const familyId = Number(key);
                                const members = groupedList[familyId];
                                if (!members || members.length === 0 || !members[0]) return null;
                                const head = members[0];
                                const isExp = expandedFamilies[familyId];
                                const currentStatus = (head.status || "").replace(/_/g, " ");
                                const isDiterima = currentStatus === "DITERIMA H-3";
                                const isSiapBerangkat = currentStatus.includes("SIAP BERANGKAT") || currentStatus.includes("TERKONFIRMASI");
                                const isDibatalkan = currentStatus === "DIBATALKAN";
                                const isMenunggu = members.some(m => m.status === "MENUNGGU VERIFIKASI" || m.status === "PENDING");
                                const isDitolak = currentStatus === "DITOLAK";
                                const bolehPindahRute = !isDiterima && !isSiapBerangkat && !isDibatalkan;
                                const isDropdownOpen = activeDropdown === familyId;
                                const adaYangDitolak = members.some(m => (m.status || "") === 'DITOLAK');
                                const adaYangDitunda = members.some(m => (m.status || "") === 'PENDING');
                                const isFamilyLocked = adaYangDitunda && adaYangDitolak;
                                const namaDitolak = members.filter(m => (m.status || "") === 'DITOLAK').map(m => m.nama_peserta).join(', ');
                                const globalIndex = (currentPage - 1) * limit + rowIndex + 1;

                                // ── Hitung max kirim count untuk keluarga ini ──
                                const maxKirimCount = Math.max(...members.map(m => m.konfirmasi_kirim_count || 0), 0);
                                const sudahKirimLink = head.link_konfirmasi_dikirim || maxKirimCount > 0;

                                return (
                                    <React.Fragment key={familyId}>
                                        <tr className={`hover:bg-blue-50/50 transition ${isExp ? "bg-blue-50/30" : ""} ${isDibatalkan ? "opacity-60 bg-slate-50" : ""} ${isFamilyLocked ? "bg-orange-50/40" : ""}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-xs text-slate-400 font-mono font-bold">{globalIndex}</span>
                                                    <button onClick={() => setExpandedFamilies(p => ({...p, [familyId]: !p[familyId]}))} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                                                        {isExp ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-bold text-base ${isDibatalkan ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{head.nama_kepala_keluarga || head.nama_peserta}</div>
                                                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><span className="bg-slate-100 px-1.5 py-0.5 rounded">{head.no_hp_target}</span></div>
                                                {head.created_at && (
                                                    <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
                                                        <Clock size={11} className="text-blue-400 shrink-0"/>
                                                        <span>{new Date(head.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}</span>
                                                        <span className="text-slate-400">·</span>
                                                        <span className="text-slate-400">{new Date(head.created_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-700"><span className="text-slate-400 text-xs">Banda Aceh →</span> <span>{head.rute_tujuan}</span></div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Clock size={10}/> {head.tgl_berangkat}</div>
                                                {(() => {
                                                    const kq = getKuotaRute(head.rute_id, head.rute_tujuan);
                                                    if (!kq) return null;
                                                    const pctRute = kq.total > 0 ? Math.round((kq.terisi / kq.total) * 100) : 0;
                                                    return (
                                                        <div className="mt-2">
                                                            <div className="flex gap-1.5 text-[10px] font-bold mb-1 flex-wrap">
                                                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Total: {kq.total}</span>
                                                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Diterima: {kq.terisi}</span>
                                                                {kq.menunggu > 0 && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">Menunggu: {kq.menunggu}</span>}
                                                                <span className={`px-1.5 py-0.5 rounded ${kq.sisa <= 0 ? "bg-red-100 text-red-700" : kq.sisa <= 5 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>Sisa: {kq.sisa}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                                                <div className={`h-full rounded-full ${pctRute >= 100 ? "bg-red-500" : pctRute >= 80 ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${Math.min(pctRute, 100)}%` }}/>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-center"><span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full text-xs"><Users size={12}/> {members.length}</span></td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <StatusBadge status={head.status} />
                                                    {isFamilyLocked && <span className="flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-bold"><Lock size={10}/> TERKUNCI</span>}
                                                </div>
                                            </td>

                                            {/* ── KOLOM PLOTTING BUS ── */}
                                            <td className="px-5 py-4 text-center">
                                                {isFamilyLocked ? (
                                                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-left max-w-[220px] mx-auto">
                                                        <p className="flex items-center gap-1 text-orange-700 font-bold text-[11px] mb-0.5"><ShieldAlert size={12}/> Keluarga Terkunci</p>
                                                        <p className="text-[10px] text-orange-600 leading-tight">Anggota ditolak: <b>{namaDitolak}</b>. Selesaikan dulu sebelum diproses.</p>
                                                    </div>
                                                ) : isSiapBerangkat ? (
                                                    head.nama_bus === "Belum Plotting" ?
                                                    <span className="text-orange-500 text-xs font-bold flex items-center justify-center gap-1 animate-pulse"><AlertTriangle size={12}/> Wajib Plotting!</span> :
                                                    (() => {
                                                        const busData = allBuses.find((b: any) => b.nama_armada === head.nama_bus);
                                                        const sisaBus = busData ? (busData.kapasitas_total - busData.terisi) : null;
                                                        const pctBus = busData && busData.kapasitas_total > 0 ? Math.round((busData.terisi / busData.kapasitas_total) * 100) : 0;
                                                        return (
                                                            <div className="flex flex-col items-center gap-1.5 w-full">
                                                                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm flex items-center justify-center gap-1 w-full">🚌 {head.nama_bus}</span>
                                                                {busData && (
                                                                    <div className="w-full">
                                                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5 px-0.5">
                                                                            <span>Terisi: <span className="text-slate-700">{busData.terisi}</span></span>
                                                                            <span>Total: <span className="text-slate-700">{busData.kapasitas_total}</span></span>
                                                                            <span className={sisaBus !== null && sisaBus <= 5 ? "text-orange-600 font-bold" : "text-green-600 font-bold"}>Sisa: {sisaBus}</span>
                                                                        </div>
                                                                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                                                            <div className={`h-full rounded-full ${pctBus >= 100 ? "bg-red-500" : pctBus >= 80 ? "bg-orange-400" : "bg-green-500"}`} style={{ width: `${Math.min(pctBus, 100)}%` }}/>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                ) : isDiterima ? (
                                                    // ── ENHANCED: Selalu tampil reminder kirim count untuk DITERIMA H-3 ──
                                                    <div className="flex flex-col items-center gap-2 w-full min-w-[180px]">
                                                        {/* Status pengiriman link */}
                                                        {sudahKirimLink ? (
                                                            <span className="text-blue-500 text-xs font-bold flex items-center justify-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 animate-pulse w-full">
                                                                <Send size={12}/> Menunggu Konfirmasi User
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs flex items-center justify-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full">
                                                                <Send size={12}/> Belum Kirim Link
                                                            </span>
                                                        )}

                                                        {/* Reminder box: jumlah kirim konfirmasi */}
                                                        <div className={`w-full rounded-xl border px-3 py-2 flex flex-col gap-1.5 ${
                                                            maxKirimCount === 0
                                                                ? 'bg-amber-50 border-amber-200'
                                                                : maxKirimCount >= 3
                                                                ? 'bg-red-50 border-red-200'
                                                                : 'bg-indigo-50 border-indigo-200'
                                                        }`}>
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-[10px] font-black uppercase tracking-wide ${
                                                                    maxKirimCount === 0 ? 'text-amber-600' : maxKirimCount >= 3 ? 'text-red-600' : 'text-indigo-600'
                                                                }`}>
                                                                    📨 Link Terkirim
                                                                </span>
                                                                <span className={`text-base font-black leading-none ${
                                                                    maxKirimCount === 0 ? 'text-amber-700' : maxKirimCount >= 3 ? 'text-red-700' : 'text-indigo-700'
                                                                }`}>
                                                                    {maxKirimCount}<span className="text-[10px] font-bold ml-0.5">×</span>
                                                                </span>
                                                            </div>

                                                            {/* Dot progress indicator */}
                                                            <div className="flex items-center gap-1">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <span
                                                                        key={i}
                                                                        className={`flex-1 h-1.5 rounded-full transition-all ${
                                                                            i < maxKirimCount
                                                                                ? maxKirimCount >= 3
                                                                                    ? 'bg-red-400'
                                                                                    : maxKirimCount >= 2
                                                                                    ? 'bg-amber-400'
                                                                                    : 'bg-indigo-400'
                                                                                : 'bg-slate-200'
                                                                        }`}
                                                                    />
                                                                ))}
                                                                {maxKirimCount > 5 && (
                                                                    <span className="text-[9px] font-black text-red-500 ml-0.5">+{maxKirimCount - 5}</span>
                                                                )}
                                                            </div>

                                                            {/* Pesan kontekstual */}
                                                            <p className={`text-[10px] leading-tight font-medium ${
                                                                maxKirimCount === 0 ? 'text-amber-600' : maxKirimCount >= 3 ? 'text-red-600' : 'text-indigo-500'
                                                            }`}>
                                                                {maxKirimCount === 0
                                                                    ? '⚠️ Belum pernah dikirim'
                                                                    : maxKirimCount === 1
                                                                    ? '✅ Dikirim 1×, tunggu konfirmasi'
                                                                    : maxKirimCount === 2
                                                                    ? '🔔 Sudah 2× — cek respons user'
                                                                    : `🚨 Sudah ${maxKirimCount}× dikirim, belum respons!`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : "-"}
                                            </td>

                                            <td className="px-6 py-4 text-right relative">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(isDropdownOpen ? null : familyId); }} className={`p-2 rounded-lg transition ${isDropdownOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                                    <MoreHorizontal size={20} />
                                                </button>
                                                {isDropdownOpen && (
                                                    <div className="absolute right-8 top-12 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden text-left">
                                                        <div className="p-2 space-y-1">
                                                            {isFamilyLocked && (
                                                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
                                                                    <p className="flex items-center gap-1.5 text-orange-700 font-bold text-xs mb-1"><Lock size={13}/> Ada Anggota PENDING</p>
                                                                    <p className="text-[11px] text-orange-600 leading-snug">Anggota <b>{namaDitolak}</b> ditolak → anggota lain berstatus <b>PENDING</b>.</p>
                                                                </div>
                                                            )}
                                                            {isDibatalkan && <MenuButton icon={<RefreshCw size={16}/>} label="Pulihkan (Reset)" onClick={() => handleMenuAction('RESET', familyId, head, members)} color="text-blue-600 hover:bg-blue-50" />}
                                                            {isDibatalkan && (
                                                                <>
                                                                    <div className="border-t border-red-100 my-1"></div>
                                                                    <MenuButton icon={<Trash2 size={16}/>} label="🗑️ Hapus Permanen (Bebaskan NIK)" onClick={() => handleHapusPermanenKeluarga(familyId, head)} color="text-red-600 hover:bg-red-50 font-bold" />
                                                                </>
                                                            )}
                                                            {(isMenunggu || isDitolak) && (
                                                                <>
                                                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mb-1 border-b">VERIFIKASI</div>
                                                                    <MenuButton icon={<CheckCircle size={16}/>} label={isDitolak ? "Revisi / Verifikasi Ulang" : "Verifikasi Detail (Checkbox)"} onClick={() => handleMenuAction('CUSTOM_VERIF', familyId, head, members)} color="text-blue-600 hover:bg-blue-50 font-bold" />
                                                                </>
                                                            )}
                                                            {isMenunggu && (
                                                                <>
                                                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mt-1 mb-1 border-b border-t">AKSI CEPAT</div>
                                                                    <MenuButton icon={<Send size={16}/>} label="📱 Blast WA: Sedang Diverifikasi (SAPA)" onClick={() => handleMenuAction('WA_VERIF', familyId, head, members)} />
                                                                    <MenuButton icon={<MessageCircle size={16}/>} label="💬 WA Manual: Sedang Diverifikasi" onClick={() => openWa(head, 'WA_VERIF')} color="text-green-700 hover:bg-green-50" />
                                                                    <MenuButton icon={<CheckSquare size={16}/>} label="⚡ Terima Darurat (Bypass Kuota)" onClick={() => handleTerimaDarurat(familyId, head)} color="text-orange-600 hover:bg-orange-50 font-bold" />
                                                                </>
                                                            )}
                                                            {bolehPindahRute && (
                                                                <>
                                                                    {!isMenunggu && <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mt-1 mb-1 border-b border-t">AKSI CEPAT</div>}
                                                                    <MenuButton icon={<MapPin size={16}/>} label="🔀 Pindah Rute" onClick={() => { setPindahRuteTarget({ familyId, head, members }); setPindahRuteId(""); setShowPindahRuteModal(true); setActiveDropdown(null); }} color="text-indigo-600 hover:bg-indigo-50 font-bold" />
                                                                </>
                                                            )}
                                                            {isDiterima && (
                                                                <>
                                                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mb-1 border-b">KIRIM NOTIFIKASI WA</div>
                                                                    {/* Badge count di menu dropdown juga */}
                                                                    {maxKirimCount > 0 && (
                                                                        <div className="mx-2 mb-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
                                                                            <span className="text-[10px] text-indigo-600 font-bold">📨 Sudah kirim link</span>
                                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${maxKirimCount >= 3 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>{maxKirimCount}×</span>
                                                                        </div>
                                                                    )}
                                                                    <MenuButton icon={<Send size={16}/>} label="📩 Kirim Link Konfirmasi (SAPA)" onClick={() => handleMenuAction('KIRIM_LINK_KONFIRMASI', familyId, head, members)} color="text-blue-600 hover:bg-blue-50" />
                                                                    <MenuButton icon={<MessageCircle size={16}/>} label="💬 WA Manual: Link Konfirmasi H-3" onClick={() => openWa(head, 'WA_H3')} color="text-green-700 hover:bg-green-50" />
                                                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mt-1 mb-1 border-b border-t">AKSI VERIFIKASI</div>
                                                                    <MenuButton icon={<CheckCircle size={16}/>} label="✅ Konfirmasi Manual (Darurat)" onClick={() => handleKonfirmasiManual(familyId, members)} color="text-green-600 hover:bg-green-50 font-bold" />
                                                                    <MenuButton icon={<Undo2 size={16}/>} label="Batalkan Penerimaan" onClick={() => handleMenuAction('RESET', familyId, head, members)} color="text-orange-600 hover:bg-orange-50" />
                                                                    <MenuButton icon={<XCircle size={16}/>} label="Tolak Permanen" onClick={() => handleMenuAction('DITOLAK', familyId, head, members)} color="text-red-600 hover:bg-red-50" />
                                                                </>
                                                            )}
                                                            {isSiapBerangkat && (
                                                                <>
                                                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mb-1 border-b">KIRIM INFO TIKET</div>
                                                                    <MenuButton icon={<Send size={16}/>} label="📱 Blast WA Info Tiket (SAPA)" onClick={() => handleMenuAction('WA_TIKET', familyId, head, members)} />
                                                                    <MenuButton icon={<MessageCircle size={16}/>} label="💬 WA Manual: Info Tiket" onClick={() => openWa(head, 'WA_TIKET')} color="text-green-700 hover:bg-green-50" />
                                                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 mt-1 mb-1 border-b border-t">PLOTTING BUS</div>
                                                                    <MenuButton icon={<Bus size={16}/>} label="Plotting Bus" onClick={() => handleMenuAction('PLOTTING', familyId, head, members)} color="text-purple-600 hover:bg-purple-50" />
                                                                    {head.nama_bus !== "Belum Plotting" && <MenuButton icon={<Undo2 size={16}/>} label="Batalkan Plotting Bus" onClick={() => handleBatalkanPlotting(familyId, head)} color="text-orange-600 hover:bg-orange-50" />}
                                                                    <MenuButton icon={<RefreshCw size={16}/>} label="Reset ke Menunggu" onClick={() => handleMenuAction('RESET', familyId, head, members)} />
                                                                </>
                                                            )}
                                                            {!isDibatalkan && (
                                                                <>
                                                                    <div className="border-t border-slate-100 my-1"></div>
                                                                    <MenuButton icon={<Trash2 size={16}/>} label="Hapus Data (Batal)" onClick={() => { setBatalModalData({ user: head, passengers: members }); setShowBatalModal(true); setActiveDropdown(null); }} color="text-slate-400 hover:text-red-600 hover:bg-red-50" />
                                                                </>
                                                            )}
                                                            <div className="border-t border-slate-100 my-1"></div>
                                                            <MenuButton icon={<MessageCircle size={16}/>} label="💬 Buka Chat WA (Kosong)" onClick={() => { const hp = head.no_hp_target; if (!hp || hp.length < 5) { alert("Nomor HP tidak tersedia."); return; } let hpClean = hp.replace(/\D/g, ""); if (hpClean.startsWith("0")) hpClean = "62" + hpClean.substring(1); window.open(`https://wa.me/${hpClean}`, "_blank"); }} color="text-green-600 hover:bg-green-50" />
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {isExp && (
                                            <tr>
                                                <td colSpan={7} className="bg-slate-50 p-4 shadow-inner border-b">
                                                    <div className="ml-12 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                        <div className="bg-slate-100/50 px-4 py-3 text-xs font-bold text-slate-500 flex justify-between items-center border-b border-slate-100">
                                                            <span>ANGGOTA KELUARGA (DETAIL)</span>
                                                            <span className="bg-white border px-2 py-0.5 rounded text-slate-600">{members.length} Orang</span>
                                                        </div>
                                                        <table className="w-full text-xs">
                                                            <tbody className="divide-y divide-slate-50">
                                                                {members.map(m => (
                                                                    <tr key={m.id} className={`hover:bg-blue-50/30 transition ${(m.status || "") === 'PENDING' ? 'bg-orange-50/30' : ''}`}>
                                                                        <td className="p-3 font-medium text-slate-700 w-1/4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">{(m.nama_peserta || "?").charAt(0)}</div>
                                                                                <span>{m.nama_peserta}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3 text-slate-500 font-mono w-1/4">{m.nik_peserta}</td>
                                                                        <td className="p-3 text-slate-500 w-1/6">{m.kategori}</td>
                                                                        <td className="p-3 w-1/6"><StatusBadge status={m.status} /></td>
                                                                        <td className="p-3 text-right">
                                                                            <div className="flex justify-end gap-3">
                                                                                {(m.status || "").includes("MENUNGGU") && <button onClick={() => updateStatusIndividual(m.id, 'DITOLAK', m.nama_peserta)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 text-xs font-bold border border-red-200 hover:border-red-300 transition"><UserX size={13}/> Tolak</button>}
                                                                                {(m.status || "") === 'PENDING' && <span className="text-orange-400 p-1"><Lock size={14}/></span>}
                                                                                {(m.status || "") === "DITOLAK" && <button onClick={() => updateStatusIndividual(m.id, 'MENUNGGU VERIFIKASI')} className="text-blue-500 hover:bg-blue-50 p-1 rounded flex items-center gap-1 text-xs font-bold"><RefreshCw size={13}/> Pulihkan</button>}
                                                                                {(m.status || "") !== 'DIBATALKAN' && (m.status || "") !== 'DITOLAK' && <button onClick={() => handleBatalkanPeserta(m)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 text-xs font-bold border border-slate-200 hover:border-red-200 transition"><UserX size={13}/> Batalkan</button>}
                                                                                {(m.status || "") === 'DIBATALKAN' && <button onClick={async () => { if (!window.confirm(`Hapus permanen data "${m.nama_peserta}"?\nNIK akan dibebaskan untuk daftar ulang.`)) return; const token = localStorage.getItem('token'); const res = await fetch(`${API.BASE_URL}/api/admin/hapus-pendaftaran/${m.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); const json = await res.json(); if (res.ok) { alert(`✅ ${json.pesan}`); loadData(); } else { alert('Gagal: ' + (json.error || 'Error')); } }} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 text-xs font-bold border border-red-200 hover:border-red-300 transition"><Trash2 size={13}/> Hapus NIK</button>}
                                                                                <button onClick={() => { setSelectedItem(m); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 transition px-2 py-1 rounded hover:bg-blue-50 text-xs">📄 Lihat Data</button>
                                                                                {(m.status || "").includes('SIAP BERANGKAT') && <button onClick={() => downloadTiket(m.id)} className="text-green-600 hover:text-green-800 flex items-center gap-1.5 font-bold px-2 py-1 rounded hover:bg-green-50 transition text-xs"><Printer size={14}/> Tiket</button>}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <PaginationBar currentPage={currentPage} totalPages={totalPages} totalKeluarga={totalKeluarga} limit={limit} onPageChange={handlePageChange} onLimitChange={handleLimitChange} isLoading={isRefreshing}/>
            </div>

            {/* ── MODAL DETAIL PESERTA ── */}
            {isModalOpen && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
                        <div className="bg-slate-900 p-8 flex items-center justify-center md:w-1/2 relative group">
                            {selectedItem.foto_bukti ?
                                <><img src={`${BASE_URL}${selectedItem.foto_bukti}`} className="max-h-[300px] object-contain border-4 border-white/20 rounded-lg shadow-lg relative z-10"/>
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-20"><a href={`${BASE_URL}${selectedItem.foto_bukti}`} target="_blank" rel="noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition">Buka Full Size</a></div></>
                                : <span className="text-white/50 flex flex-col items-center gap-2"><XCircle size={32}/> Tidak ada foto</span>
                            }
                        </div>
                        <div className="p-8 md:w-1/2 flex flex-col bg-white">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{selectedItem.nama_peserta}</h3>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded mt-1 inline-block font-mono">BOOKING: {selectedItem.kode_booking}</span>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition"><XCircle size={20}/></button>
                            </div>
                            <div className="space-y-5 text-sm text-slate-600 flex-1 overflow-y-auto pr-2">
                                <DetailRow label="NIK" value={selectedItem.nik_peserta} mono />
                                <DetailRow label="Nomor HP" value={selectedItem.no_hp_target} />
                                <div className="grid grid-cols-2 gap-4"><DetailRow label="Jenis Kelamin" value={selectedItem.jenis_kelamin} /><DetailRow label="Kategori" value={selectedItem.kategori} /></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-start gap-3 mb-3"><MapPin className="text-red-500 mt-0.5" size={16}/><div><p className="text-xs font-bold text-slate-400 uppercase">Rute Tujuan</p><p className="font-bold text-slate-800"><span className="text-slate-400 font-normal">Banda Aceh → </span>{selectedItem.rute_tujuan}</p></div></div>
                                    <div className="flex items-start gap-3"><Clock className="text-blue-500 mt-0.5" size={16}/><div><p className="text-xs font-bold text-slate-400 uppercase">Jadwal</p><p className="font-medium text-slate-800">{selectedItem.tgl_berangkat}</p></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL PLOTTING BUS ── */}
            {showBusModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100 mb-5">
                            <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shrink-0"><Bus size={24}/></div>
                            <div><h3 className="font-extrabold text-slate-800 text-lg">Plotting Bus</h3><p className="text-xs text-slate-500 mt-0.5">Assign armada bus untuk rombongan ini</p></div>
                        </div>
                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Armada Bus</label>
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                {buses.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm"><Bus size={28} className="mx-auto mb-2 opacity-30"/>Belum ada bus terdaftar.</div>
                                ) : buses.map((b: any) => {
                                    const terisi = b.terisi ?? 0;          // null-safe
                                    const kapasitas = b.kapasitas_total ?? 0;
                                    const sisa = kapasitas - terisi;
                                    const penuh = kapasitas > 0 && sisa <= 0;
                                    const pctBus = kapasitas > 0 ? Math.round((terisi / kapasitas) * 100) : 0;
                                    const isSelected = selectedBusId === String(b.id);
                                    return (
                                        <button key={b.id} onClick={() => !penuh && setSelectedBusId(String(b.id))} disabled={penuh} className={`w-full flex flex-col p-3.5 rounded-xl border-2 text-left transition gap-2.5 ${penuh ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed" : isSelected ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-purple-300 hover:bg-purple-50/30"}`}>
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"}`}><Bus size={16}/></div>
                                                    <div>
                                                        <p className={`font-bold text-sm ${isSelected ? "text-purple-700" : "text-slate-800"}`}>{b.nama_armada}</p>
                                                        <p className="text-xs text-slate-400">{b.plat_nomor || "–"}{b.nama_supir ? ` · ${b.nama_supir}` : ""}</p>
                                                    </div>
                                                </div>
                                                {penuh
                                                    ? <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg shrink-0">🚫 PENUH</span>
                                                    : <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${sisa <= 5 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>Sisa {sisa}</span>
                                                }
                                            </div>
                                            <div className="w-full">
                                                <div className="flex justify-between text-[10px] font-bold mb-1">
                                                    <span className="text-slate-400">Terisi: <span className="text-slate-700">{terisi}</span></span>
                                                    <span className="text-slate-400">Total: <span className="text-slate-700">{kapasitas}</span></span>
                                                    <span className="text-slate-400">Sisa: <span className={sisa <= 5 ? "text-orange-600" : "text-green-600"}>{sisa}</span></span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${pctBus >= 100 ? "bg-red-500" : pctBus >= 80 ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${Math.min(pctBus, 100)}%` }}/>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowBusModal(false); setSelectedBusId(""); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition">Batal</button>
                            <button onClick={submitPlotting} disabled={!selectedBusId} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle size={16}/> Simpan Plotting</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL VERIFIKASI ── */}
            {showVerifModal && verifData && <ModalVerifikasi user={verifData.user} passengers={verifData.passengers} onClose={() => setShowVerifModal(false)} onSuccess={() => { loadData(); }}/>}

            {/* ── MODAL BATAL ── */}
            {showBatalModal && batalModalData && (
                <ModalBatal user={batalModalData.user} passengers={batalModalData.passengers}
                    onClose={() => { setShowBatalModal(false); setBatalModalData(null); }}
                    onSuccess={() => { loadData(); if (batalModalData) { setBatalWaTarget({ head: batalModalData.user, familyId: batalModalData.user.id_keluarga, members: batalModalData.passengers }); setShowBatalWaModal(true); } setShowBatalModal(false); setBatalModalData(null); }}
                />
            )}

            {/* ── MODAL WA PEMBATALAN ── */}
            {showBatalWaModal && batalWaTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b bg-red-50"><h3 className="font-bold text-lg text-red-800">Data Berhasil Dibatalkan</h3><p className="text-xs text-red-600 mt-1">Keluarga: <strong>{batalWaTarget.head.nama_kepala_keluarga || batalWaTarget.head.nama_peserta}</strong></p></div>
                        <div className="p-5">
                            <p className="text-sm text-slate-600 mb-4">Kirim notifikasi <strong>WhatsApp</strong> ke peserta bahwa pendaftaran mereka telah dibatalkan?</p>
                            <div className="bg-slate-50 border rounded-xl p-3 text-xs text-slate-500 mb-5"><p><strong>No. HP:</strong> {batalWaTarget.head.no_hp_target || "–"}</p><p><strong>Nama:</strong> {batalWaTarget.head.nama_kepala_keluarga}</p></div>
                            <div className="flex gap-3">
                                <button onClick={() => { setShowBatalWaModal(false); setBatalWaTarget(null); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition">Tidak Perlu</button>
                                <button onClick={async () => { const blastOk = await sendWaBlast(batalWaTarget.head, 'WA_BATAL'); if (!blastOk) openWa(batalWaTarget.head, 'WA_BATAL'); setShowBatalWaModal(false); setBatalWaTarget(null); }} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2"><MessageCircle size={16}/> Kirim WA</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL PINDAH RUTE ── */}
            {showPindahRuteModal && pindahRuteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-white text-base">🔀 Pindah Rute</h3>
                                <p className="text-indigo-200 text-xs mt-0.5">Keluarga: <strong className="text-white">{pindahRuteTarget.head.nama_kepala_keluarga || pindahRuteTarget.head.nama_peserta}</strong> ({pindahRuteTarget.members.length} orang)</p>
                            </div>
                            <button onClick={() => { setShowPindahRuteModal(false); setPindahRuteTarget(null); setPindahRuteId(""); }} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                                <p className="font-bold mb-1">⚠️ Rute saat ini:</p>
                                <p>{pindahRuteTarget.head.rute_tujuan || "–"}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Pilih Rute Tujuan Baru</label>
                                <select
                                    value={pindahRuteId}
                                    onChange={e => setPindahRuteId(e.target.value)}
                                    className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none"
                                >
                                    <option value="">-- Pilih rute --</option>
                                    {allRuteObjects
                                        .filter((r: any) => String(r.rute_id) !== String(pindahRuteTarget.head.rute_id))
                                        .map((r: any) => (
                                            <option key={r.rute_id} value={String(r.rute_id)}>
                                                {r.asal} → {r.tujuan} | {r.waktu_berangkat || r.tanggal_berangkat || ""} | Sisa: {r.sisa_kuota ?? "?"}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            {pindahRuteId && (() => {
                                const r = allRuteObjects.find((x: any) => String(x.rute_id) === pindahRuteId);
                                return r ? (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-700">
                                        <p className="font-bold mb-1">✅ Rute tujuan baru:</p>
                                        <p><strong>{r.asal} → {r.tujuan}</strong></p>
                                        <p className="mt-1">📅 {r.waktu_berangkat || r.tanggal_berangkat || "–"}</p>
                                        <p className="mt-1">💺 Sisa kursi: <strong className={r.sisa_kuota <= 0 ? 'text-red-600' : 'text-green-600'}>{r.sisa_kuota ?? "?"}</strong></p>
                                    </div>
                                ) : null;
                            })()}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => { setShowPindahRuteModal(false); setPindahRuteTarget(null); setPindahRuteId(""); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition">Batal</button>
                                <button
                                    onClick={handleKonfirmasiPindahRute}
                                    disabled={!pindahRuteId}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <MapPin size={16}/> Pindahkan Rute
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            </div>
        </div>
    );
}

const MenuButton = ({ icon, label, onClick, color = "text-slate-600 hover:bg-slate-50" }: any) => (
    <button onClick={onClick} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${color}`}>{icon} {label}</button>
);
const DetailRow = ({ label, value, mono = false }: any) => (
    <div><p className="text-xs font-bold text-slate-400 uppercase mb-0.5">{label}</p><p className={`font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || "-"}</p></div>
);