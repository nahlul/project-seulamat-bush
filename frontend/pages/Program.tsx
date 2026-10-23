import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Calendar, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UserAPI } from "../lib/api"; // Import API

interface Rute {
    rute_id: number;
    asal: string;
    tujuan: string;
    kuota_tersisa: number;
    tanggal_keberangkatan: string;
    nama_bus?: string;
}

export default function Program() {
    const navigate = useNavigate();
    const [listRute, setListRute] = useState<Rute[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ambil data rute real-time dari database
        UserAPI.getRute()
            .then((data) => setListRute(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header Image / Banner */}
            <div className="bg-blue-900 py-12 px-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 relative z-10">Program Mudik Gratis 2026</h1>
                <p className="text-blue-200 relative z-10">Dinas Perhubungan Aceh</p>
            </div>

            <div className="max-w-4xl mx-auto p-6 -mt-8 relative z-20">
                {/* Tombol Kembali ke Dashboard */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-white hover:bg-slate-100 text-slate-700 px-6 py-3 rounded-full font-bold shadow-md flex items-center gap-2 mb-8 transition w-fit"
                >
                    <ArrowLeft size={20} /> Kembali ke Dashboard
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Kolom Kiri: Info Program */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Info className="text-blue-600"/> Tentang Program
                            </h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                Pemerintah Aceh melalui Dinas Perhubungan kembali menyelenggarakan program Mudik Gratis untuk membantu masyarakat, mahasiswa, dan pekerja yang ingin merayakan hari raya di kampung halaman.
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                                Program ini menyediakan transportasi bus yang aman dan nyaman dengan berbagai rute tujuan di seluruh Aceh.
                            </p>

                            <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Syarat & Ketentuan</h3>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
                                <li>Wajib memiliki KTP domisili Aceh atau Kartu Mahasiswa aktif.</li>
                                <li>Satu NIK hanya dapat mendaftar untuk satu kursi.</li>
                                <li>Dilarang membawa barang berbahaya (sajam, narkoba, bahan mudah meledak).</li>
                                <li>Wajib melakukan daftar ulang 1 jam sebelum keberangkatan.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Kolom Kanan: Daftar Rute (Dinamis dari DB) */}
                    <div className="md:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <MapPin className="text-red-500" size={20}/> Rute Tersedia
                            </h3>

                            {loading ? (
                                <p className="text-slate-400 text-sm text-center py-4">Memuat data rute...</p>
                            ) : listRute.length > 0 ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {listRute.map((r) => (
                                        <div key={r.rute_id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-blue-400 transition group">
                                            <div className="font-bold text-slate-700 group-hover:text-blue-700 transition">
                                                {r.asal} ➝ {r.tujuan}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Calendar size={12}/> {r.tanggal_keberangkatan || "Jadwal Menyusul"}
                                            </div>
                                            {r.kuota_tersisa > 0 ? (
                                                <div className="text-[10px] font-bold text-green-600 mt-2 bg-green-50 px-2 py-1 rounded inline-block">
                                                    Sisa Kuota: {r.kuota_tersisa}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-red-600 mt-2 bg-red-50 px-2 py-1 rounded inline-block">
                                                    KUOTA PENUH
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm">Belum ada rute dibuka.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}