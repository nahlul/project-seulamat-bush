import React from "react"
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { NotificationProvider } from "./context/NotificationContext"
import { NotificationToastManager } from "./components/admin/NotificationBell"

// --- PAGES PUBLIC ---
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Program from "./pages/Program"
import Bantuan from "./pages/Bantuan"
import ResetPassword from "./pages/ResetPassword"

// --- PAGES USER ---
import Dashboard from "./pages/Dashboard"
import DaftarMudik from "./pages/DaftarMudik"
import Konfirmasi from "./pages/Konfirmasi"
import EditProfile from "./pages/EditProfile"
import TiketPage from "./pages/TiketPage"

// --- PAGES ADMIN ---
import LoginAdmin from "./pages/LoginAdmin"
import AdminDashboard from "./pages/AdminDashboard"
import AdminPendaftar from "./pages/AdminPendaftar"
import AdminKendaraan from "./pages/AdminKendaraan"
import AdminRute from "./pages/AdminRute"
import AdminUserPage from "./pages/AdminUserPage"
import AdminManifest from "./pages/AdminManifest"
import AdminTambahPenumpang from "./pages/AdminTambahPenumpang"
import AdminPortalControl from "./pages/AdminPortalControl"
import AdminFeedback from "./pages/AdminFeedback"
import AdminTerminal from "./pages/AdminTerminal"

// --- PORTAL GUARD (Tutup Portal) ---
import PortalGuard from "./components/PortalGuard"

// ==========================================
// 1. PROTEKSI ROUTE (Token Check)
// ==========================================
const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactNode
  role: "USER" | "ADMIN"
}) => {
  const token = localStorage.getItem("token")
  if (!token) {
    return <Navigate to={role === "ADMIN" ? "/admin/login" : "/login"} replace />
  }
  return <>{children}</>
}

// ==========================================
// 2. ANIMASI TRANSISI HALAMAN
// ==========================================
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full min-h-screen"
    >
      {children}
    </motion.div>
  )
}

// ==========================================
// 3. ROUTES
// ==========================================
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ===== PUBLIC ===== */}
        {/* Home: tidak diblokir portal — selalu tampil, PortalStatusBadge di dalamnya */}
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />

        {/* Login: selalu bisa diakses (user lama tetap perlu login) */}
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />

        {/* Register: diblokir jika portal_register_open = false */}
        <Route path="/register" element={
          <PortalGuard type="register">
            <PageWrapper><Register /></PageWrapper>
          </PortalGuard>
        } />

        <Route path="/program" element={<PageWrapper><Program /></PageWrapper>} />
        <Route path="/bantuan" element={<PageWrapper><Bantuan /></PageWrapper>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Konfirmasi H-3: publik via UUID, tidak perlu login */}
        <Route path="/konfirmasi/:uuid" element={<PageWrapper><Konfirmasi /></PageWrapper>} />

        {/* ===== USER (butuh login) ===== */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="USER">
            {/* Dashboard tetap bisa dibuka meski sesi berakhir */}
            <PageWrapper><Dashboard /></PageWrapper>
          </ProtectedRoute>
        } />

        {/* DaftarMudik: diblokir jika portal_mudik_open = false ATAU sesi tidak aktif */}
        <Route path="/daftar-mudik" element={
          <ProtectedRoute role="USER">
            <PortalGuard type="mudik">
              <PageWrapper><DaftarMudik /></PageWrapper>
            </PortalGuard>
          </ProtectedRoute>
        } />

        <Route path="/edit-profile" element={
          <ProtectedRoute role="USER">
            <PageWrapper><EditProfile /></PageWrapper>
          </ProtectedRoute>
        } />

        {/* Tiket: halaman preview & download e-tiket desain baru */}
        <Route path="/tiket" element={
          <ProtectedRoute role="USER">
            <PageWrapper><TiketPage /></PageWrapper>
          </ProtectedRoute>
        } />

        {/* ===== ADMIN (butuh login admin) ===== */}
        {/* NotificationProvider khusus admin — tidak aktif di halaman user/publik */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

        <Route path="/admin/login" element={<PageWrapper><LoginAdmin /></PageWrapper>} />

        <Route path="/admin/dashboard" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminDashboard /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/verifikasi" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminPendaftar /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/kendaraan" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminKendaraan /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/rute" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminRute /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminUserPage /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/manifest" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminManifest /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/tambah-penumpang" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminTambahPenumpang /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        {/* Portal Control */}
        <Route path="/admin/portal" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminPortalControl /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/feedback" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminFeedback /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        <Route path="/admin/terminal" element={
          <ProtectedRoute role="ADMIN">
            <NotificationProvider>
              <PageWrapper><AdminTerminal /></PageWrapper>
              <NotificationToastManager />
            </NotificationProvider>
          </ProtectedRoute>
        } />

        {/* ===== 404 ===== */}
        <Route path="*" element={
          <div className="h-screen flex flex-col items-center justify-center text-slate-500">
            <h1 className="text-6xl font-bold mb-3 text-slate-200">404</h1>
            <p className="font-medium mb-1">Halaman tidak ditemukan</p>
            <p className="text-sm text-slate-400 mb-6">URL yang kamu akses tidak tersedia.</p>
            <button
              onClick={() => window.history.back()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition"
            >
              ← Kembali
            </button>
          </div>
        } />

      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}