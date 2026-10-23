import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, User, AlertTriangle, Loader2 } from 'lucide-react';
import { API } from '../lib/api';

export default function Konfirmasi() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [list, setList] = useState<any[]>([]);
    const [checkedIds, setCheckedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem("token");
        const loggedInUser = localStorage.getItem("userId")?.replace(/"/g, "");

        if(!token || !loggedInUser) {
            alert("Sesi habis. Silakan login kembali.");
            return navigate("/login");
        }

        try {
            const res = await fetch(API.RIWAYAT, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "userId": loggedInUser
                }
            });

            // 🔥 FIX 1: Tangani Error JSON (Biar gak blank putih)
            const textResponse = await res.text();
            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (err) {
                console.error("Server Response Error (Not JSON):", textResponse);
                setLoading(false);
                return; // Stop disini kalau bukan JSON
            }

            if (res.ok && Array.isArray(data)) {
                // 🔥 FIX 2: Filter Status yang LEBIH FLEKSIBEL (Pake .includes)
                // Ini akan menangkap: "DITERIMA", "DITERIMA H-3", "DITERIMA(H-3)", "TERVERIFIKASI/ SIAP BERANGKAT"
                const relevantData = data.filter((d:any) => {
                    const status = (d.status_pendaftaran || "").toUpperCase();
                    return status.includes('DITERIMA') ||
                           status.includes('TERKONFIRMASI') ||
                           status.includes('SIAP') ||
                           status.includes('VERIFIKASI');
                });

                if (relevantData.length === 0) {
                    // Jangan langsung navigate, kasih user liat pesan dulu atau stay di page
                    alert("Tidak ada tiket yang perlu dikonfirmasi saat ini (Status belum Diterima H-3).");
                    return navigate("/dashboard");
                }

                // 🔒 CEK: Apakah admin sudah kirim link konfirmasi?
                const sudahDikirim = relevantData.some((d: any) => d.link_konfirmasi_dikirim === true);
                if (!sudahDikirim) {
                    alert("⏳ Konfirmasi belum tersedia.\n\nAdmin belum mengirim link konfirmasi untuk akun Anda.\n\nSilakan tunggu link konfirmasi dikirim oleh Admin Dishub Aceh sesuai jadwal.");
                    return navigate("/dashboard");
                }

                setList(relevantData);

                // Auto-Checklist semua di awal
                const idsToSelect = relevantData.map((d:any) => d.pendaftaran_id);
                setCheckedIds(idsToSelect);
            } else {
                console.error("Gagal load data:", data);
            }
        } catch (error) {
            console.error("Error connection:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheck = (id: number) => {
        if(checkedIds.includes(id)) {
            setCheckedIds(checkedIds.filter(cid => cid !== id));
        } else {
            setCheckedIds([...checkedIds, id]);
        }
    };

    const handleSubmit = async () => {
        const idsYangAdaDiList = list.map(l => l.pendaftaran_id);
        const idsYangDicentang = checkedIds.filter(id => idsYangAdaDiList.includes(id));
        const countBatal = list.length - idsYangDicentang.length;

        const confirmMsg = countBatal > 0
            ? `⚠️ PERHATIAN!\nAnda akan membatalkan ${countBatal} tiket.\nKursi mereka akan HANGUS dan diberikan ke orang lain.\n\nLanjut simpan?`
            : `Konfirmasi kehadiran untuk ${idsYangDicentang.length} orang?`;

        if(!confirm(confirmMsg)) return;

        setSubmitting(true);
        const token = localStorage.getItem("token");
        const loggedInUser = localStorage.getItem("userId")?.replace(/"/g, "");

        try {
            // 🔥 FIX 3: Pastikan URL param pakai loggedInUser kalau userId dari URL kosong/undefined
            const targetId = userId && userId !== 'undefined' ? userId : loggedInUser;
            const url = `${API.PENDAFTARAN}/konfirmasi-kehadiran/${targetId}`;

            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ ids_konfirmasi: checkedIds })
            });

            // Handle response aman
            const textResponse = await res.text();
            let json: { message?: string; error?: string } = {};
            try { json = JSON.parse(textResponse); } catch(e) {}

            if(res.ok) {
                alert(`✅ BERHASIL!\n${json.message || "Data kehadiran tersimpan."}`);
                navigate('/dashboard');
            } else {
                alert(`❌ Gagal: ${json.error || textResponse || "Terjadi kesalahan server."}`);
            }
        } catch (error) {
            console.error(error);
            alert("❌ Gagal menghubungi server. Periksa koneksi internet.");
        } finally {
            setSubmitting(false);
        }
    };

    if(loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 gap-2">
                <Loader2 className="animate-spin" /> Memuat data konfirmasi...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center items-center font-sans">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-blue-600 p-6 text-white text-center">
                    <h1 className="text-2xl font-bold mb-1">Konfirmasi Keberangkatan</h1>
                    <p className="text-blue-100 text-sm">Wajib diisi H-3 Keberangkatan</p>
                </div>

                <div className="p-8">
                    <p className="text-slate-600 text-sm mb-6 text-center leading-relaxed">
                        Mohon ceklist nama anggota keluarga yang <strong>PASTI BERANGKAT</strong>.
                        <br/>
                        <span className="text-red-500 font-bold">PENTING:</span> Nama yang tidak dicentang otomatis dianggap <span className="text-red-600 font-bold underline">BATAL</span>.
                    </p>

                    <div className="space-y-3 mb-8">
                        {list.map(p => {
                            const isChecked = checkedIds.includes(p.pendaftaran_id);
                            return (
                                <div key={p.pendaftaran_id}
                                     onClick={() => handleCheck(p.pendaftaran_id)}
                                     className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all duration-200 group
                                     ${isChecked
                                        ? "border-green-500 bg-green-50 shadow-sm"
                                        : "border-slate-200 bg-slate-50 opacity-60 hover:opacity-80"}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isChecked ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400"}`}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${isChecked ? "text-slate-800" : "text-slate-500 line-through"}`}>{p.nama_peserta}</p>
                                            <p className="text-xs text-slate-500 font-mono">Kode: {p.kode_booking || "-"}</p>
                                            {/* Debugging: Tampilkan status biar tau kenapa gak muncul sebelumnya */}
                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">{p.status_pendaftaran}</span>
                                        </div>
                                    </div>

                                    <div className="transform transition-transform group-hover:scale-110">
                                        {isChecked
                                            ? <CheckCircle className="text-green-600 fill-green-100" size={28} />
                                            : <XCircle className="text-slate-400" size={28} />
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl text-xs text-amber-800 mb-8 border border-amber-100">
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                        <p>
                            <strong>Perhatian:</strong> Data yang sudah Anda batalkan (tidak dicentang) tidak dapat dipulihkan kembali. Kursi akan dialihkan ke pendaftar lain.
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition disabled:opacity-70 flex justify-center items-center gap-2"
                    >
                        {submitting ? <Loader2 className="animate-spin"/> : "Konfirmasi"}
                    </button>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full mt-3 text-slate-400 text-sm font-medium hover:text-slate-600 py-2"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}