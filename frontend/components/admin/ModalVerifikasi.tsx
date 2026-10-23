import { useState } from "react";
import { CheckSquare, Square, X, MessageSquare, Save, CheckCircle2 } from "lucide-react";
import { API } from "../../lib/api";

export default function ModalVerifikasi({ user, passengers, onClose, onSuccess }: any) {
    // ✅ Filter: yang DIBATALKAN tidak masuk verifikasi
    const activePassengers = (passengers || []).filter(
        (p: any) => (p.status || "").toUpperCase() !== "DIBATALKAN"
    );
    const cancelledPassengers = (passengers || []).filter(
        (p: any) => (p.status || "").toUpperCase() === "DIBATALKAN"
    );

    const [rejectedIds, setRejectedIds] = useState<number[]>([]);
    const [alasan, setAlasan] = useState("");
    const [loading, setLoading] = useState(false);

    const templates = [
        "Foto KTP/KK Buram/Tidak Terbaca",
        "NIK tidak terdaftar di Dukcapil",
        "KK bukan domisili Aceh/Salah Wilayah",
        "Data penumpang ganda/sudah terdaftar",
        "Foto dokumen tidak sesuai/Salah Upload",
        "Nama di form beda dengan KTP/KK",
        "Usia tidak sesuai kategori (Dewasa/Anak)",
        "Kuota Rute Penuh (Silakan pilih rute lain)"
    ];

    // --- LOGIC SELECT ALL (hanya activePassengers) ---
    const isAllSelected = activePassengers.length > 0 && rejectedIds.length === activePassengers.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setRejectedIds([]);
        } else {
            setRejectedIds(activePassengers.map((p: any) => p.id));
        }
    };

    const toggleCheck = (id: number) => {
        if (rejectedIds.includes(id)) {
            setRejectedIds(rejectedIds.filter(x => x !== id));
        } else {
            setRejectedIds([...rejectedIds, id]);
        }
    };

    const handleSubmit = async () => {
        if (rejectedIds.length > 0 && !alasan) {
            alert("⚠️ Karena ada peserta yang DITOLAK, Alasan Wajib Diisi!");
            return;
        }

        const countTerima = activePassengers.length - rejectedIds.length;
        const countTolak = rejectedIds.length;

        let confirmMsg = "";
        if (countTolak === activePassengers.length) {
            confirmMsg = `⚠️ PERINGATAN KERAS:\n\nAnda akan MENOLAK SELURUH KELUARGA ini (${countTolak} orang).\n\nApakah Anda yakin?`;
        } else if (countTolak === 0) {
            confirmMsg = `Konfirmasi:\n\n✅ DITERIMA SEMUA (${countTerima} orang).\nTidak ada yang ditolak.\n\nLanjutkan?`;
        } else {
            confirmMsg = `Konfirmasi Proses:\n\n✅ Diterima: ${countTerima} orang\n❌ Ditolak: ${countTolak} orang\n\nPastikan data benar. Yakin simpan?`;
        }

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            const targetFamilyId = (user?.id_keluarga && String(user.id_keluarga) !== "null" && String(user.id_keluarga) !== "undefined")
                ? user.id_keluarga
                : (user?.id || user?.pendaftaran_id || (passengers?.[0]?.id_keluarga || passengers?.[0]?.id));

            const res = await fetch(`${API.ADMIN_VERIF_CUSTOM}/${targetFamilyId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    rejected_ids: rejectedIds,
                    alasan: alasan,
                    family_id: targetFamilyId,
                    id_keluarga: targetFamilyId,
                    passenger_ids: activePassengers.map((p: any) => p.id)
                })
            });

            const json = await res.json();

            if (res.ok) {
                // ✅ SAPA Blast API: Pesan WA dikirim otomatis dari backend.
                // Tidak perlu buka wa.me link lagi.
                alert("✅ Data Berhasil Disimpan!\n\nPesan WhatsApp telah dikirim otomatis ke peserta via SAPA Blast.");
                onSuccess();
                onClose();
            } else {
                alert("Gagal: " + (json.error || "Terjadi kesalahan server"));
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
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Verifikasi Detail</h3>
                        <p className="text-xs text-slate-500">Keluarga: <strong>{user.nama_kepala_keluarga}</strong></p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition"><X size={20}/></button>
                </div>

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* INFO BOX */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-xs mb-4 flex gap-2 items-start">
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-bold mb-1">Panduan:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Kotak KOSONG</strong> = Data Valid → <span className="text-green-700 font-bold">DITERIMA H-3</span> (jika semua OK).</li>
                                <li><strong>Kotak DICENTANG</strong> = Data Salah → <span className="text-red-700 font-bold">DITOLAK</span>.</li>
                                <li>Jika ada yang ditolak, sisanya otomatis → <span className="text-orange-700 font-bold">PENDING</span> sampai user perbaiki.</li>
                            </ul>
                        </div>
                    </div>

                    {/* TOMBOL PILIH SEMUA */}
                    <div
                        onClick={toggleSelectAll}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer mb-4 transition font-bold text-sm select-none ${
                            isAllSelected
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <span>{isAllSelected ? "Batalkan (Terima Semua)" : "Pilih Semua (Tolak Sekeluarga)"}</span>
                        {isAllSelected
                            ? <CheckSquare className="text-red-600" size={20} />
                            : <Square className="text-slate-400" size={20} />
                        }
                    </div>

                    {/* LIST PENUMPANG AKTIF */}
                    <div className="space-y-2 mb-4">
                        {activePassengers.map((p: any) => {
                            const isRejected = rejectedIds.includes(p.id);
                            const someRejected = rejectedIds.length > 0 && rejectedIds.length < activePassengers.length;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => toggleCheck(p.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                        isRejected
                                        ? "border-red-500 bg-red-50"
                                        : someRejected
                                            ? "border-orange-300 bg-orange-50/60"
                                            : "border-green-200 hover:border-green-400 bg-white"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {isRejected
                                            ? <CheckSquare className="text-red-600" size={24} />
                                            : <Square className={someRejected ? "text-orange-400" : "text-slate-300"} size={24} />
                                        }
                                        <div>
                                            <p className={`font-bold ${isRejected ? "text-red-700 line-through" : someRejected ? "text-orange-700" : "text-slate-700"}`}>{p.nama_peserta}</p>
                                            <p className="text-xs text-slate-400">NIK: {p.nik_peserta} • {p.kategori}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${
                                        isRejected ? "bg-red-200 text-red-800"
                                        : someRejected ? "bg-orange-200 text-orange-800"
                                        : "bg-green-100 text-green-700"
                                    }`}>
                                        {isRejected
                                            ? <><X size={12}/> DITOLAK</>
                                            : someRejected
                                                ? <>⏳ PENDING</>
                                                : <><CheckCircle2 size={12}/> DITERIMA H-3</>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* SECTION DIBATALKAN — read only */}
                    {cancelledPassengers.length > 0 && (
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"/>
                                Sudah Dibatalkan ({cancelledPassengers.length} orang) — Tidak Termasuk Verifikasi
                            </p>
                            <div className="space-y-2 opacity-60">
                                {cancelledPassengers.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 bg-slate-50 cursor-not-allowed select-none">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded border-2 border-slate-300 bg-slate-200 flex items-center justify-center">
                                                <span className="text-slate-400 text-[10px] font-black">—</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-400 line-through">{p.nama_peserta}</p>
                                                <p className="text-xs text-slate-400">NIK: {p.nik_peserta} • {p.kategori}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-500">
                                            🚫 DIBATALKAN
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ALASAN & TEMPLATE */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <MessageSquare size={16}/> Alasan Penolakan {rejectedIds.length > 0 && <span className="text-red-500">*</span>}
                        </label>

                        <div className="flex flex-wrap gap-2 mb-2">
                            {templates.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => setAlasan(t)}
                                    className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition text-left"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:bg-slate-100 disabled:text-slate-400"
                            rows={3}
                            placeholder={rejectedIds.length > 0 ? "Tulis alasan manual atau pilih template di atas..." : "Tidak perlu alasan jika semua diterima."}
                            value={alasan}
                            onChange={(e) => setAlasan(e.target.value)}
                            disabled={rejectedIds.length === 0}
                        />
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-5 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition">Batal</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center gap-2 disabled:opacity-70 ${
                            rejectedIds.length === activePassengers.length && activePassengers.length > 0
                            ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                        }`}
                    >
                        {loading ? "Memproses..." : <><Save size={18}/> {rejectedIds.length === activePassengers.length && activePassengers.length > 0 ? "Tolak Semua" : "Simpan & Proses"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}