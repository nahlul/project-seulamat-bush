import { useState } from "react";
import { X, Send, Mail } from "lucide-react";
import { API } from '../lib/api';

export default function ModalLupaPassword({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 🔥 Mengarah ke endpoint AuthResource: request-reset-password
            const res = await fetch(API.REQUEST_RESET_PASSWORD, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const json = await res.json();

            if (res.ok) {
                alert("✅ Link terkirim! Silakan cek Inbox/Spam email Anda untuk mereset password.");
                onClose();
            } else {
                alert("❌ " + (json.error || "Gagal memproses permintaan. Pastikan email terdaftar."));
            }
        } catch (err) {
            alert("Terjadi kesalahan koneksi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Lupa Password?</h3>
                    <button onClick={onClose} className="p-1 hover:bg-red-100 rounded-full text-slate-400 hover:text-red-500 transition"><X size={20}/></button>
                </div>

                <form onSubmit={handleReset} className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start mb-2">
                        <Mail className="text-blue-600 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm text-blue-800 leading-snug">
                            Masukkan email yang terdaftar. Kami akan mengirimkan link untuk membuat password baru.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email Terdaftar</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                className="w-full p-3 pl-10 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition"
                                placeholder="nama@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        </div>
                    </div>

                    <button disabled={loading} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed">
                        {loading ? "Mengirim..." : <><Send size={18}/> Kirim Link Reset</>}
                    </button>
                </form>
            </div>
        </div>
    );
}