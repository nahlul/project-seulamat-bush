import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, RefreshCcw, ShieldBan, CheckCircle, Trash2, Lock, Zap, AlertTriangle, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, BASE_URL } from '../lib/api';
import { useNotification } from '../context/NotificationContext';

// Tipe Data User
interface UserData {
  id: number;
  nama_lengkap: string;
  email: string;
  nik: string;
  no_hp: string;
  status_akun: string;
  role: string;
}

export default function AdminUserPage() {
  const navigate = useNavigate();
  const { addNotif } = useNotification();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalReset, setModalReset] = useState<{ show: boolean; id: number | null; email: string }>({
    show: false,
    id: null,
    email: ''
  });
  const [newPass, setNewPass] = useState('');

  // State modal verif cepat
  const [showVerifSemuaModal, setShowVerifSemuaModal] = useState(false);
  const [verifLoading, setVerifLoading] = useState(false);

  // State modal tambah user
  const [showTambahUserModal, setShowTambahUserModal] = useState(false);
  const [tambahUserLoading, setTambahUserLoading] = useState(false);
  const [showTambahPass, setShowTambahPass] = useState(false);
  const [showTambahConfirm, setShowTambahConfirm] = useState(false);
  const [tambahUserForm, setTambahUserForm] = useState({
    nama_lengkap: '',
    email: '',
    nik: '',
    no_hp: '',
    password: '',
    confirm_password: '',
    jenis_kelamin: '',
    role: 'USER',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/admin/users', 'GET');
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      alert('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    if (!confirm(`Yakin ubah status user ini jadi ${newStatus}?`)) return;
    const targetUser = users.find(u => u.id === id);
    try {
      await apiRequest(`/api/admin/users/${id}/status`, 'PUT', { status: newStatus });
      const nama = targetUser?.nama_lengkap || `User #${id}`;
      addNotif({ type: 'user', title: `👤 Status User Diubah`, message: `Status "${nama}" diubah menjadi ${newStatus}.`, link: '/admin/users' });
      loadUsers();
    } catch (err) {
      alert('Gagal mengubah status');
    }
  };

  const handleResetPassword = async () => {
    if (!newPass || newPass.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }
    try {
      await apiRequest(`/api/admin/users/${modalReset.id}/reset-password`, 'PUT', { password_baru: newPass });
      addNotif({ type: 'user', title: '🔑 Password Direset', message: `Password akun "${modalReset.email}" telah berhasil direset oleh admin.`, link: '/admin/users' });
      alert(`Password untuk ${modalReset.email} berhasil direset!`);
      setModalReset({ show: false, id: null, email: '' });
      setNewPass('');
    } catch (err) {
      alert('Gagal reset password');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('AWAS! User akan dihapus PERMANEN. Lanjutkan?')) return;
    const targetUser = users.find(u => u.id === id);
    try {
      await apiRequest(`/api/admin/users/${id}`, 'DELETE');
      const nama = targetUser?.nama_lengkap || `User #${id}`;
      addNotif({ type: 'user', title: '🗑️ User Dihapus', message: `Akun "${nama}" telah dihapus secara permanen.`, link: '/admin/users' });
      loadUsers();
    } catch (err) {
      alert('Gagal menghapus user');
    }
  };

  // =============================================
  // VERIF CEPAT — Verifikasi SEMUA user sekaligus
  // =============================================
  const handleVerifSemua = async () => {
    setVerifLoading(true);
    try {
      const res = await apiRequest('/api/admin/users/verif-semua', 'PUT');
      const jumlah = (res as any)?.jumlah_diverifikasi ?? '?';
      addNotif({
        type: 'user',
        title: '⚡ Verif Cepat Selesai',
        message: `${jumlah} akun berhasil diverifikasi sekaligus.`,
        link: '/admin/users'
      });
      setShowVerifSemuaModal(false);
      alert(`✅ Berhasil! ${jumlah} akun telah diverifikasi.`);
      loadUsers();
    } catch (err) {
      alert('Gagal melakukan verifikasi massal.');
    } finally {
      setVerifLoading(false);
    }
  };

  // =============================================
  // TAMBAH USER — Register via Admin
  // =============================================
  const handleTambahUser = async () => {
    const { nama_lengkap, email, nik, no_hp, password, confirm_password, jenis_kelamin, role } = tambahUserForm;

    if (!nama_lengkap || !email || !nik || !no_hp || !password || !confirm_password || !jenis_kelamin) {
      alert('Semua field wajib diisi!');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Format email tidak valid!');
      return;
    }
    if (!/^\d{16}$/.test(nik)) {
      alert('NIK harus 16 digit angka!');
      return;
    }
    if (password !== confirm_password) {
      alert('Password dan konfirmasi password tidak cocok!');
      return;
    }
    if (password.length < 6) {
      alert('Password minimal 6 karakter!');
      return;
    }

    setTambahUserLoading(true);
    try {
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_lengkap, email, nik, no_hp, password, jenis_kelamin, role }),
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Gagal membuat user');
        }
        return res.json();
      });

      addNotif({ type: 'user', title: '👤 User Baru Dibuat', message: `Akun "${nama_lengkap}" berhasil dibuat oleh admin.`, link: '/admin/users' });
      alert(`✅ Akun untuk "${nama_lengkap}" berhasil dibuat!`);
      setShowTambahUserModal(false);
      setTambahUserForm({ nama_lengkap: '', email: '', nik: '', no_hp: '', password: '', confirm_password: '', jenis_kelamin: '', role: 'USER' });
      loadUsers();
    } catch (err: any) {
      alert(`Gagal membuat user: ${err.message}`);
    } finally {
      setTambahUserLoading(false);
    }
  };

  const q = search.toLowerCase().trim();
  const filteredUsers = q
    ? users.filter(u =>
        (u.nama_lengkap ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.nik ?? '').includes(q) ||
        (u.no_hp ?? '').includes(q)
      )
    : users;

  const jumlahBelumVerif = users.filter(u => u.status_akun === 'BELUM_VERIF').length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
          title="Kembali ke Dashboard"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Manajemen Data User</h1>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari Nama / Email / NIK..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* ➕ TOMBOL TAMBAH USER */}
          <button
            onClick={() => setShowTambahUserModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold transition shadow-sm"
            title="Tambah user baru"
          >
            <UserPlus size={18} />
            Tambah User
          </button>
          <button
            onClick={() => setShowVerifSemuaModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-semibold transition shadow-sm"
            title="Verifikasi semua user yang belum terverifikasi"
          >
            <Zap size={18} />
            Verif Cepat
            {jumlahBelumVerif > 0 && (
              <span className="bg-white text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {jumlahBelumVerif}
              </span>
            )}
          </button>

          <button
            onClick={loadUsers}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 font-medium"
          >
            <RefreshCcw size={18} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-sm">
            <tr>
              <th className="p-4">Nama Lengkap</th>
              <th className="p-4">Email</th>
              <th className="p-4">NIK / No HP</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Memuat data...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Tidak ada data user.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition">

                  <td className="p-4">
                    <div className="font-medium text-slate-900">{user.nama_lengkap ?? '-'}</div>
                    <div className="text-xs text-slate-400">{user.role}</div>
                  </td>

                  <td className="p-4">
                    <div className="text-sm text-slate-700">{user.email ?? '-'}</div>
                  </td>

                  <td className="p-4">
                    <div className="font-medium">{user.nik ?? '-'}</div>
                    <div className="text-xs text-slate-500">{user.no_hp ?? '-'}</div>
                  </td>

                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      user.status_akun === 'AKTIF'
                        ? 'bg-green-100 text-green-700'
                        : user.status_akun === 'BANNED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {user.status_akun}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex justify-center gap-2 flex-wrap">

                      {/* Verif manual per user (jika belum aktif) */}
                      {user.status_akun === 'BELUM_VERIF' && (
                        <button
                          onClick={() => handleStatusChange(user.id, 'AKTIF')}
                          className="p-2 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100"
                          title="Verifikasi Akun"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => setModalReset({ show: true, id: user.id, email: user.email })}
                        className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                        title="Reset Password"
                      >
                        <Lock size={16} />
                      </button>

                      {user.status_akun !== 'BANNED' ? (
                        <button
                          onClick={() => handleStatusChange(user.id, 'BANNED')}
                          className="p-2 text-orange-600 bg-orange-50 rounded hover:bg-orange-100"
                          title="Banned User"
                        >
                          <ShieldBan size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user.id, 'AKTIF')}
                          className="p-2 text-green-600 bg-green-50 rounded hover:bg-green-100"
                          title="Aktifkan User"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100"
                        title="Hapus Permanen"
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================
          MODAL RESET PASSWORD
      ============================================ */}
      {modalReset.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Reset Password User</h3>
            <p className="text-sm text-slate-500 mb-4">
              Masukkan password baru untuk user <b>{modalReset.email}</b>.
            </p>
            <input
              type="text"
              placeholder="Password Baru..."
              className="w-full border border-slate-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalReset({ show: false, id: null, email: '' })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
              >
                Simpan Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          MODAL VERIF CEPAT (DARURAT)
      ============================================ */}
      {showVerifSemuaModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="text-amber-500" size={32} />
            </div>

            <h2 className="text-xl font-extrabold text-slate-800 text-center mb-2">
              Konfirmasi Verif Cepat
            </h2>

            <p className="text-slate-500 text-sm text-center leading-relaxed mb-2">
              Fitur ini akan memverifikasi{' '}
              <span className="font-bold text-slate-800">semua akun</span> yang berstatus{' '}
              <span className="font-bold text-yellow-600">BELUM_VERIF</span> sekaligus.
            </p>

            {jumlahBelumVerif > 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center mb-6">
                <p className="text-sm text-emerald-700 font-semibold">
                  {jumlahBelumVerif} akun akan diverifikasi sekarang
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center mb-6">
                <p className="text-sm text-slate-500">
                  Tidak ada akun yang perlu diverifikasi saat ini.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center mb-6">
              Gunakan fitur ini hanya dalam situasi darurat. Aksi ini tidak bisa dibatalkan.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleVerifSemua}
                disabled={verifLoading || jumlahBelumVerif === 0}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition ${
                  verifLoading || jumlahBelumVerif === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <Zap size={18} />
                {verifLoading ? 'Memproses...' : 'Ya, Verifikasi Semua Sekarang'}
              </button>

              <button
                onClick={() => setShowVerifSemuaModal(false)}
                disabled={verifLoading}
                className="w-full py-3.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================
          MODAL TAMBAH USER (REGISTER VIA ADMIN)
      ============================================ */}
      {showTambahUserModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <UserPlus className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Tambah User Baru</h2>
                <p className="text-xs text-slate-400">Buat akun user langsung dari panel admin</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Sesuai KTP"
                  value={tambahUserForm.nama_lengkap}
                  onChange={e => setTambahUserForm(f => ({ ...f, nama_lengkap: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Aktif <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="contoh@gmail.com"
                  value={tambahUserForm.email}
                  onChange={e => setTambahUserForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* NIK */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">NIK <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="16 digit NIK"
                  maxLength={16}
                  value={tambahUserForm.nik}
                  onChange={e => setTambahUserForm(f => ({ ...f, nik: e.target.value.replace(/\D/g, '') }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Kelamin <span className="text-red-500">*</span></label>
                <select
                  value={tambahUserForm.jenis_kelamin}
                  onChange={e => setTambahUserForm(f => ({ ...f, jenis_kelamin: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- Pilih Jenis Kelamin --</option>
                  <option value="LAKI_LAKI">Laki-laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>

              {/* No HP */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor HP <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={tambahUserForm.no_hp}
                  onChange={e => setTambahUserForm(f => ({ ...f, no_hp: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={tambahUserForm.role}
                  onChange={e => setTambahUserForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showTambahPass ? 'text' : 'password'}
                    placeholder="Min. 6 karakter"
                    value={tambahUserForm.password}
                    onChange={e => setTambahUserForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="button" onClick={() => setShowTambahPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                    {showTambahPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Konfirmasi Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showTambahConfirm ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    value={tambahUserForm.confirm_password}
                    onChange={e => setTambahUserForm(f => ({ ...f, confirm_password: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button type="button" onClick={() => setShowTambahConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                    {showTambahConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleTambahUser}
                disabled={tambahUserLoading}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition ${
                  tambahUserLoading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <UserPlus size={18} />
                {tambahUserLoading ? 'Memproses...' : 'Buat Akun User'}
              </button>
              <button
                onClick={() => {
                  setShowTambahUserModal(false);
                  setTambahUserForm({ nama_lengkap: '', email: '', nik: '', no_hp: '', password: '', confirm_password: '', jenis_kelamin: '', role: 'USER' });
                }}
                disabled={tambahUserLoading}
                className="w-full py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}