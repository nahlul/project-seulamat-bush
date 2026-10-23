import { useState } from "react";
import { CheckSquare, Square, X, MessageSquare, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { API } from "../../lib/api";

interface Props {
    user: any;
    passengers: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalBatal({ user, passengers, onClose, onSuccess }: Props) {
    // Hanya tampilkan peserta yang BELUM dibatalkan
    const activePassengers = passengers.filter((p: any) => p.status !== "DIBATALKAN");

    // ID yang akan DIBATALKAN (dicentang = dibatalkan)
    const [batalIds, setBatalIds] = useState<number[]>([]);
    const [alasan, setAlasan] = useState("");
    const [loading, setLoading] = useState(false);

    const templates = [
        "Mengundurkan diri",
        "Tidak bisa hadir pada jadwal keberangkatan",
        "Data tidak valid / tidak memenuhi syarat",
        "Permintaan peserta sendiri",
        "Peserta meninggal dunia",
        "Kuota diprioritaskan untuk peserta lain",
    ];

    const isAllSelected = activePassengers.length > 0 && batalIds.length === activePassengers.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setBatalIds([]);
        } else {
            setBatalIds(activePassengers.map((p: any) => p.id));
        }
    };

    const toggleCheck = (id: number) => {
        if (batalIds.includes(id)) {
            setBatalIds(batalIds.filter(x => x !== id));
        } else {
            setBatalIds([...batalIds, id]);
        }
    };

    const handleSubmit = async () => {
        if (batalIds.length === 0) {
            alert("⚠️ Pilih minimal 1 peserta yang akan dibatalkan.");
            return;
        }

        const countBatal = batalIds.length;
        const confirmMsg = batalIds.length === activePassengers.length
            ? `⚠️ PERINGATAN:\n\nAnda akan MEMBATALKAN SELURUH KELUARGA ini (${countBatal} orang).\n\nSemua peserta akan berstatus DIBATALKAN dan kuota dikembalikan.\n\nYakin?`
            : `Konfirmasi Pembatalan:\n\n🗑️ Dibatalkan: ${countBatal} orang\n✅ Tidak berubah: ${activePassengers.length - countBatal} orang\n\nYakin batalkan peserta yang dipilih?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // Batalkan satu per satu berdasarkan ID yang dipilih
            let successCount = 0;
            let errorMessages: string[] = [];

            for (const id of batalIds) {
                const res = await fetch(`${API.BASE_URL}/api/admin/batalkan-peserta/${id}`, {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (res.ok) {
                    successCount++;
                } else {
                    errorMessages.push(json.error || `ID ${id} gagal`);
                }
            }

            if (successCount > 0) {
                onSuccess();
                onClose();
                // Tidak langsung WA di sini — caller akan handle modal WA
            }
            if (errorMessages.length > 0) {
                alert(`⚠️ ${successCount} berhasil, ${errorMessages.length} gagal:\n${errorMessages.join("\n")}`);
            }
        } catch (e) {
            console.error(e);
            alert("Terjadi kesalahan koneksi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-5 border-b flex justify-between items-center bg-red-50 rounded-t-2xl">
                    <div>
                        <h3 className="font-bold text-lg text-red-800 flex items-center gap-2">
                            <Trash2 size={20} /> Batalkan Pendaftaran
                        </h3>
                        <p className="text-xs text-red-600 mt-0.5">Keluarga: <strong>{user.nama_kepala_keluarga}</strong></p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* INFO BOX */}
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 text-xs mb-4 flex gap-2 items-start">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                        <div>
                            <p className="font-bold mb-1">Panduan:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Kotak KOSONG</strong> = Tidak dibatalkan → tetap seperti semula.</li>
                                <li><strong>Kotak DICENTANG</strong> = Akan <span className="text-red-700 font-bold">DIBATALKAN</span>. Kuota rute dikembalikan.</li>
                                <li>Satu orang bisa dibatalkan tanpa mempengaruhi anggota lain.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Tombol Pilih Semua */}
                    <div
                        onClick={toggleSelectAll}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer mb-4 transition font-bold text-sm select-none ${
                            isAllSelected
                                ? "bg-red-50 border-red-300 text-red-700"
                                : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <span>{isAllSelected ? "Batalkan Pilihan (Tidak Ada)" : "Pilih Semua (Batalkan Sekeluarga)"}</span>
                        {isAllSelected
                            ? <CheckSquare className="text-red-600" size={20} />
                            : <Square className="text-slate-400" size={20} />
                        }
                    </div>

                    {/* Info peserta sudah dibatalkan sebelumnya */}
                    {passengers.length > activePassengers.length && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-slate-500 flex items-start gap-2">
                            <span className="shrink-0">ℹ️</span>
                            <span>
                                <strong>{passengers.length - activePassengers.length} peserta</strong> sudah berstatus <strong>DIBATALKAN</strong> sebelumnya dan tidak ditampilkan.
                            </span>
                        </div>
                    )}

                    {/* Jika semua sudah dibatalkan */}
                    {activePassengers.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm">
                            <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                            <p>Semua peserta sudah dibatalkan sebelumnya.</p>
                        </div>
                    )}

                    {/* LIST PENUMPANG */}
                    {activePassengers.length > 0 && (
                        <div className="space-y-2 mb-6">
                            {activePassengers.map((p: any) => {
                                const isBatal = batalIds.includes(p.id);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => toggleCheck(p.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                            isBatal
                                                ? "border-red-400 bg-red-50"
                                                : "border-slate-200 hover:border-red-300 bg-white hover:bg-red-50/30"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isBatal
                                                ? <CheckSquare className="text-red-500" size={22} />
                                                : <Square className="text-slate-300" size={22} />
                                            }
                                            <div>
                                                <p className={`font-bold text-sm ${isBatal ? "text-red-700 line-through" : "text-slate-700"}`}>
                                                    {p.nama_peserta}
                                                </p>
                                                <p className="text-xs text-slate-400">NIK: {p.nik_peserta} • {p.kategori}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Status saat ini: <span className="font-semibold">{p.status}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${
                                            isBatal ? "bg-red-200 text-red-800" : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {isBatal ? <><X size={12}/> DIBATALKAN</> : <>✓ TETAP</>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Alasan (opsional, untuk referensi internal) */}
                    {batalIds.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <MessageSquare size={16} /> Catatan / Alasan Pembatalan <span className="text-slate-400 text-xs font-normal">(opsional)</span>
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {templates.map((t, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setAlasan(t)}
                                        className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg hover:bg-red-50 hover:text-red-600 transition text-left"
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-400 outline-none text-sm"
                                rows={2}
                                placeholder="Catatan pembatalan (opsional)..."
                                value={alasan}
                                onChange={(e) => setAlasan(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-5 border-t bg-slate-50 rounded-b-2xl flex justify-between items-center gap-3">
                    <div className="text-xs text-slate-500">
                        {batalIds.length > 0
                            ? <span className="text-red-600 font-bold">{batalIds.length} peserta akan dibatalkan</span>
                            : <span>Pilih peserta yang akan dibatalkan</span>
                        }
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition text-sm">
                            Tutup
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || batalIds.length === 0}
                            className="px-6 py-2.5 text-white rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 shadow-red-200 text-sm"
                        >
                            {loading ? "Memproses..." : <><Trash2 size={16} /> Batalkan ({batalIds.length})</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}