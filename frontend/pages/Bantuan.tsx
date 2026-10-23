import { ArrowLeft, MessageCircle, HelpCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Bantuan() {
    const navigate = useNavigate();

    // Data FAQ
    const faqs = [
        { q: "Apakah program ini gratis?", a: "Benar, 100% gratis dan tidak dipungut biaya apa pun." },
        { q: "Kapan jadwal keberangkatan?", a: "15, 16, 17 Maret 2026" },
        { q: "Apakah kegiatan ini meliputi arus balik?", a: "Tidak. Kegiatan ini hanya melayani arus mudik (sekali jalan)." },
        { q: "Siapa yang dapat mendaftar?", a: "Masyarakat yang mempunyai tujuan mudik sesuai rute yang tersedia." },
        { q: "Apa saja dokumen yang perlu disiapkan?", a: "Foto/Scan KTP/KIA/KK calon peserta mudik." },
        { q: "Bagaimana cara mendaftar?", a: "Pendaftaran dilakukan secara online melalui laman seulamat.dishubaceh.com." },
        { q: "Bagaimana cara mengetahui status pendaftaran saya?", a: "Login ke akun anda dan cek di “Daftar & Status Tiket” di aplikasi Seulamat." },
        { q: "Apa yang harus dilakukan jika terjadi kesalahan penginputan alamat email atau nomor handphone pada saat pendaftaran akun?", a: "Silahkan menghubungi admin via chat wa." },
        { q: "Bagaimana jika email verifikasi tidak masuk setelah mendaftar akun?", a: "Periksa folder spam anda. Jika tidak ada, dapat menghubungi admin via chat wa." },
        { q: "Apakah satu akun dapat memilih beberapa rute?", a: "Tidak, satu akun hanya dapat mendaftar satu rute." },
        { q: "Berapa calon pemudik yang dapat didaftarkan?", a: "Maksimal 6 orang." },
        { q: "Bagaimana jika terjadi kesalahan pengisian data calon pemudik?", a: "Data yang salah tidak dapat diubah sebelum diverifikasi oleh admin." },
        { q: "Apa Beda arti 'Ditolak' dengan Dibatalkan?", a: "Status “Ditolak” disebabkan karena data tidak sesuai, dan masih dapat diperbaiki. sedangkan Status ”Dibatalkan” berarti kuota pemudik yang tersedia sudah habis." },
        { q: "Apabila data sudah diverifikasi oleh admin, apakah masih dapat menambah calon pemudik?", a: "Tidak dapat dilakukan penambahan." },
        { q: "Kapan saya bisa mengunduh tiket mudik?", a: "Setelah tombol klik “Download E-Ticket” aktif." },
        { q: "Apakah bisa mengubah rute setelah mendaftar?", a: "Tidak bisa. Pastikan pilih rute yang benar sebelum menekan tombol kirim." },
        { q: "Di mana lokasi keberangkatan?", a: "Depo Trans Koetaradja (belakang Terminal Tipe A Batoh), Banda Aceh" },
        { q: "Dimana peserta mudik turun?", a: "Tujuan akhir rute mudik adalah terminal di setiap Kabupaten/Kota tujuan pemudik." },
        { q: "Kapan harus hadir di lokasi keberangkatan?", a: "Datang maksimal 1 jam sebelum berangkat." },
        { q: "Apakah peserta mudik dapat digantikan dengan orang lain?", a: "Tidak bisa. Peserta mudik harus sesuai dengan data yang didaftarkan." },
        { q: "Barang apa saja yang boleh dibawa?", a: "Hanya barang kebutuhan pribadi (pakaian) maksimal 1 tas besar dan 1 tas kecil. Dilarang membawa hewan, benda berbaru menyengat, barang berbahaya/ilegal, dan senjata tajam." },
        { q: "Bagaimana jika saya terlambat hadir pada hari keberangkatan?", a: "Keberangkatan anda dibatalkan." }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <div className="max-w-2xl mx-auto p-6">

                {/* Header Back */}
                <button
                    onClick={() => {
                        const token = localStorage.getItem('token');
                        navigate(token ? '/dashboard' : '/');
                    }}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-8 font-bold transition"
                >
                    <ArrowLeft size={20} /> Kembali
                </button>

                <div className="text-center mb-10">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HelpCircle size={32} className="text-blue-600"/>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Pusat Bantuan</h1>
                    <p className="text-slate-500">Temukan jawaban atau hubungi panitia langsung.</p>
                </div>

                {/* FAQ List */}
                <div className="space-y-4 mb-12">
                    {faqs.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group cursor-default">
                            <h3 className="font-bold text-slate-800 flex justify-between items-center">
                                {item.q}
                            </h3>
                            <p className="text-slate-600 mt-3 text-sm leading-relaxed border-t border-slate-100 pt-3">
                                {item.a}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Contact Card */}
                <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-8 rounded-3xl text-center text-white shadow-xl relative overflow-hidden">
                    {/* Dekorasi */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

                    <h2 className="text-xl font-bold mb-2 relative z-10">Belum menemukan jawaban?</h2>
                    <p className="text-blue-200 mb-6 text-sm relative z-10">Tim kami siap membantu Anda via WhatsApp.</p>

                    <a
                        href="https://wa.me/628217653093?text=Halo%20Admin%20Sela%2C%20saya%20ingin%20menanyakan%20tentang%20program%20Mudik%20Gratis%20Aceh."
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold transition transform hover:scale-105 shadow-lg relative z-10"
                    >
                        <MessageCircle size={20}/> Chat WhatsApp Admin
                    </a>
                </div>

                <div className="text-center mt-8 text-xs text-slate-400">
                    &copy; 2026 Dinas Perhubungan Aceh.
                </div>
            </div>
        </div>
    );
}