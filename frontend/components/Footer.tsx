import {
  Globe, Phone, MapPin, Mail, Globe2
} from "lucide-react"

// 🔥 IMPORT ASET SESUAI PERMINTAAN LU
import logoDishub from "../assets/LOGO 26-29.png"
import logoseulamat from "../assets/Seulamat Logo-04.png"
import logoPemprov from "../assets/pemprov aceh.png"

// Bikin custom icon untuk TikTok karena lucide-react tidak punya icon TikTok bawaan
const TikTokIcon = ({ size = 20 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v3a3 3 0 0 1-3-3 5 5 0 0 1-5 5z"/>
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-blue-950 text-white pt-20 pb-10 mt-auto">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

            {/* Branding */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-6 bg-white/5 p-3 rounded-xl w-fit backdrop-blur-sm">
                <img src={logoPemprov} alt="Aceh" className="h-10 w-auto" />
                <div className="w-px h-8 bg-white/20"></div>
                <img src={logoDishub} alt="Dishub" className="h-10 w-auto" />
              </div>
              <p className="text-blue-200 text-sm leading-relaxed">
                Program Mudik Gratis Pemerintah Aceh melalui Dinas Perhubungan Aceh untuk memfasilitasi masyarakat pulang kampung dengan aman, nyaman, dan berkesan.
              </p>
            </div>

            {/* Navigasi */}
            <div>
              <h5 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Globe size={18} className="text-yellow-400" /> Navigasi
              </h5>
              <ul className="space-y-4 text-blue-200 text-sm font-medium">
                <li><a href="/" className="hover:text-yellow-400 transition flex items-center gap-2">Beranda</a></li>
                <li><a href="/login" className="hover:text-yellow-400 transition flex items-center gap-2">Login Peserta</a></li>
                <li><a href="/register" className="hover:text-yellow-400 transition flex items-center gap-2">Pendaftaran</a></li>
                <li><a href="/admin/login" className="hover:text-yellow-400 transition flex items-center gap-2">Portal Admin</a></li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <h5 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Phone size={18} className="text-yellow-400" /> Kontak Kami
              </h5>
              <ul className="space-y-4 text-blue-200 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="shrink-0 text-yellow-400 mt-1" />
                  <span className="leading-relaxed"> Jalan Mayjend T. Hamzah Bendahara No.52, Kuta Alam, Banda Aceh 23121</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-yellow-400 shrink-0" />
                  <span>dishub@acehprov.go.id</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-yellow-400 shrink-0" />
                  <span>(0651) 22110</span>
                </li>
              </ul>
            </div>

            {/* Social Media & Powered By */}
            <div>
              <h5 className="font-bold text-lg mb-6 flex items-center gap-2">
              </h5>
              <div className="flex gap-4 mb-8">
                <SocialLink icon={<TikTokIcon size={20} />} href="https://www.tiktok.com/@dishub_aceh?is_from_webapp=1&sender_device=pc" />
              </div>

              <div className="p-4 bg-gradient-to-br from-white/10 to-transparent rounded-xl border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] text-blue-300 uppercase tracking-widest font-bold mb-3">Powered By</p>
                <img src={logoseulamat} alt="Seulamat" className="h-10 w-auto brightness-200 grayscale hover:grayscale-0 transition duration-300 filter drop-shadow-lg" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-10 text-center">
            <p className="text-blue-400 text-xs">
              © {new Date().getFullYear()} Dinas Perhubungan Aceh. Hak Cipta Dilindungi Undang-Undang.
            </p>
          </div>
        </div>
      </footer>
  )
}

function SocialLink({ icon, href }: { icon: React.ReactNode, href: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-yellow-400 hover:text-blue-900 transition-all hover:-translate-y-1 shadow-lg border border-white/10"
        >
            {icon}
        </a>
    )
}
