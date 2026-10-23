// src/lib/api.ts
// ================================================================
// KONFIGURASI BASE URL
// ================================================================
// Keep deployments configurable, while the standalone frontend defaults to
// the new backend rather than the legacy public service. Set this to an empty
// string when the frontend is reverse-proxied beside the API.
export const BASE_URL =
  // Use the Vite /api proxy in development and same-origin deployments;
  // an explicit VITE_API_BASE_URL remains available for standalone hosting.
  import.meta.env.VITE_API_BASE_URL ?? "";

if (import.meta.env.VITE_API_BASE_URL === undefined) {
  console.warn(
    "⚠️ VITE_API_BASE_URL tidak diset. Menggunakan backend baru default."
  );
}

// ================================================================
// DAFTAR ENDPOINT
// ================================================================
export const API = {
  BASE_URL,

  // --- AUTH ---
  LOGIN: `${BASE_URL}/api/auth/login`,
  REGISTER: `${BASE_URL}/api/auth/register`,
  REQUEST_RESET_PASSWORD: `${BASE_URL}/api/auth/request-reset-password`,

  // --- PUBLIC ---
  RUTE: `${BASE_URL}/api/rute`,

  // --- USER ---
  PENDAFTARAN: `${BASE_URL}/api/pendaftaran`,
  RIWAYAT: `${BASE_URL}/api/pendaftaran/riwayat`,
  KONFIRMASI: `${BASE_URL}/api/pendaftaran/konfirmasi-kehadiran`,
  TIKET: `${BASE_URL}/api/tiket`,
  PROFILE: `${BASE_URL}/api/user/profile`,
  // UPDATE_PROFILE: `${BASE_URL}/api/user/update-profile`, // 🔒 DIMATIKAN - fitur edit profil dalam pengerjaan
  // CHANGE_PASSWORD: `${BASE_URL}/api/user/change-password`, // 🔒 DIMATIKAN - fitur ganti password dalam pengerjaan

  // --- ADMIN: PENDAFTAR & VERIFIKASI ---
  ADMIN_DATA: `${BASE_URL}/api/admin/pendaftar`,
  ADMIN_VERIF: `${BASE_URL}/api/admin/verifikasi`,
  ADMIN_VERIF_CUSTOM: `${BASE_URL}/api/admin/verifikasi-custom`,
  ADMIN_VERIF_KELUARGA: `${BASE_URL}/api/admin/verifikasi-keluarga`,

  // --- ADMIN: BUS & RUTE ---
  ADMIN_KENDARAAN: `${BASE_URL}/api/admin/kendaraan`,
  ADMIN_ASSIGN_BUS: `${BASE_URL}/api/admin/assign-bus`,
  ADMIN_DUPLICATE_BUS: (busId: number) => `${BASE_URL}/api/admin/kendaraan/${busId}/duplicate`,

  // --- ADMIN: FITUR BARU ---
  ADMIN_TAMBAH_PENUMPANG: `${BASE_URL}/api/admin/tambah-penumpang`,
  ADMIN_NOTIF_KUOTA_PENUH: (ruteId: number) =>
    `${BASE_URL}/api/admin/notif-kuota-penuh/${ruteId}`,
  ADMIN_KONFIRMASI_MANUAL: (userId: number) =>
    `${BASE_URL}/api/admin/konfirmasi-manual/${userId}`,
  ADMIN_BATALKAN_PESERTA: (id: number) =>
    `${BASE_URL}/api/admin/batalkan-peserta/${id}`,
  ADMIN_HAPUS_PENDAFTARAN: (id: number) =>
    `${BASE_URL}/api/admin/hapus-pendaftaran/${id}`,
  ADMIN_HAPUS_KELUARGA_BATAL: (userId: number) =>
    `${BASE_URL}/api/admin/hapus-pendaftaran/keluarga/${userId}`,
  ADMIN_PINDAH_RUTE: (userId: number) =>
    `${BASE_URL}/api/admin/pindah-rute/${userId}`,
  ADMIN_TERIMA_DARURAT: (userId: number) =>
    `${BASE_URL}/api/admin/terima-darurat/${userId}`,
  ADMIN_HAPUS_USER: (userId: number) =>
    `${BASE_URL}/api/admin/hapus-user/${userId}`,
  RUTE_PORTAL: (ruteId: number) =>
    `${BASE_URL}/api/rute/${ruteId}/portal`,

  // --- MANIFEST ---
  MANIFEST: `${BASE_URL}/api/manifest`,
  MANIFEST_RUTE: (ruteId: number) =>
    `${BASE_URL}/api/manifest/rute/${ruteId}`,
  MANIFEST_BUS: (busId: number) =>
    `${BASE_URL}/api/manifest/bus/${busId}`,
  MANIFEST_EXPORT_RUTE: (ruteId: number) =>
    `${BASE_URL}/api/manifest/export/rute/${ruteId}`,
  MANIFEST_EXPORT_BUS: (busId: number) =>
    `${BASE_URL}/api/manifest/export/bus/${busId}`,
  MANIFEST_EXPORT_SEMUA: `${BASE_URL}/api/manifest/export/semua`,

  // --- PORTAL CONTROL ---
  PORTAL_STATUS: `${BASE_URL}/api/portal/status`,
  PORTAL_REGISTER: `${BASE_URL}/api/portal/register`,
  PORTAL_LOGIN: `${BASE_URL}/api/portal/login`,
  PORTAL_MUDIK: `${BASE_URL}/api/portal/mudik`,
  PORTAL_SESI: `${BASE_URL}/api/portal/sesi`,
  PORTAL_TIKET: `${BASE_URL}/api/portal/tiket`,
  PORTAL_SEMUA: `${BASE_URL}/api/portal/semua`,

  // --- LAINNYA ---
  PETA: `${BASE_URL}/api/peta/sebaran-pemudik`,
  EXPORT: `${BASE_URL}/api/admin/export`,
  ADMIN_STATS: `${BASE_URL}/api/admin/stats`,

  // --- TERMINAL ---
  TERMINAL: `${BASE_URL}/api/terminal`,
  TERMINAL_BY_ID: (id: number) => `${BASE_URL}/api/terminal/${id}`,
};

// ================================================================
// TIPE HELPER
// ================================================================
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// ================================================================
// HELPER: Bersihkan token dari tanda kutip yang kadang tersimpan
// sebagai JSON string (mis. `"eyJ..."` → `eyJ...`)
// ================================================================
function getCleanToken(): string | null {
  const raw = localStorage.getItem("token");
  return raw ? raw.replace(/['"]+/g, "") : null;
}

function getCleanUserId(): string | null {
  const raw = localStorage.getItem("userId");
  return raw ? raw.replace(/['"]+/g, "") : null;
}

// ================================================================
// FETCH WRAPPER UTAMA
// ================================================================
export async function apiRequest<T = any>(
  url: string,
  method: Method = "GET",
  body?: any,
  auth: boolean = true
): Promise<T> {
  // FIX: Selalu bersihkan token dari tanda kutip
  const token = getCleanToken();
  const userId = getCleanUserId();

  const headers: Record<string, string> = {};

  if (auth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (auth && userId) {
    headers["userId"] = userId;
    headers["userid"] = userId; // lowercase fallback
  }

  let finalBody: BodyInit | undefined;

  if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: finalBody,
  });

  if (res.status === 401 || res.status === 403) {
    if (!url.includes("/login") && !url.includes("/auth/")) {
      console.error("⛔ Sesi habis atau tidak punya akses.");
    }
  }

  if (!res.ok) {
    let errMsg = res.statusText || "Terjadi kesalahan";
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errJson.message || errMsg;
    } catch {
      // Biarkan pesan default
    }
    throw new Error(errMsg);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return res as unknown as T;
}

// ================================================================
// HELPER DOWNLOAD FILE (PDF / Excel)
// ================================================================
export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  const token = getCleanToken();
  const userId = getCleanUserId();

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (userId) {
    headers["userId"] = userId;
    headers["userid"] = userId;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    let errMsg = res.statusText;
    try {
      const text = await res.text();
      errMsg = text || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}

// ================================================================
// ADMIN API
// ================================================================
export const AdminAPI = {
  login: (payload: { email: string; password: string }) =>
    apiRequest<any>(API.LOGIN, "POST", payload, false),

  getPendaftar: (ruteId?: number) =>
    apiRequest<any[]>(
      ruteId ? `${API.ADMIN_DATA}?rute_id=${ruteId}` : API.ADMIN_DATA
    ),

  verifikasi: (id: number, status: string) =>
    apiRequest(`${API.ADMIN_VERIF}/${id}`, "PUT", { status }),

  verifikasiKeluarga: (userId: number, status: string, alasan?: string) =>
    apiRequest(`${API.ADMIN_VERIF_KELUARGA}/${userId}`, "PUT", {
      status,
      alasan_tolak: alasan,
    }),

  verifikasiCustom: (
    userId: number,
    rejectedIds: number[],
    alasan: string
  ) =>
    apiRequest(`${API.ADMIN_VERIF_CUSTOM}/${userId}`, "PUT", {
      rejected_ids: rejectedIds,
      alasan,
    }),

  assignBus: (userId: number, kendaraanId: number) =>
    apiRequest(
      `${API.ADMIN_ASSIGN_BUS}?user_id=${userId}&kendaraan_id=${kendaraanId}`,
      "POST"
    ),

  duplicateBus: (busId: number, ruteId: number) =>
    apiRequest(API.ADMIN_DUPLICATE_BUS(busId), "POST", { rute_id: ruteId }),

  getKendaraan: (ruteId?: number) =>
    apiRequest<any[]>(
      ruteId
        ? `${API.ADMIN_KENDARAAN}?rute_id=${ruteId}`
        : API.ADMIN_KENDARAAN
    ),

  tambahPenumpang: (payload: {
    rute_id: number;
    kendaraan_id?: number;
    user_id?: number;
    nama_peserta: string;
    nik_peserta: string;
    jenis_kelamin?: string;
    tanggal_lahir?: string;
    alamat_rumah?: string;
    no_hp_peserta?: string;
  }) => apiRequest(API.ADMIN_TAMBAH_PENUMPANG, "POST", payload),

  notifKuotaPenuh: (ruteId: number) =>
    apiRequest(API.ADMIN_NOTIF_KUOTA_PENUH(ruteId), "POST"),

  togglePortal: (ruteId: number, isOpen: boolean) =>
    apiRequest(API.RUTE_PORTAL(ruteId), "PUT", { is_portal_open: isOpen }),

  getStats: () => apiRequest<any>(API.ADMIN_STATS),

  exportExcel: (ruteId?: number) => {
    const url = ruteId ? `${API.EXPORT}?rute_id=${ruteId}` : API.EXPORT;
    return downloadFile(url, "Rekap_Mudik.xlsx");
  },
};

// ================================================================
// MANIFEST API
// ================================================================
export const ManifestAPI = {
  getAll: () => apiRequest<any[]>(API.MANIFEST),

  getPerRute: (ruteId: number) =>
    apiRequest<any>(API.MANIFEST_RUTE(ruteId)),

  getPerBus: (busId: number) =>
    apiRequest<any>(API.MANIFEST_BUS(busId)),

  exportRute: (ruteId: number, namaRute: string) =>
    downloadFile(
      API.MANIFEST_EXPORT_RUTE(ruteId),
      `Manifest_Rute_${namaRute.replace(/\s+/g, "_")}.xlsx`
    ),

  exportBus: (busId: number, namaBus: string) =>
    downloadFile(
      API.MANIFEST_EXPORT_BUS(busId),
      `Manifest_Bus_${namaBus.replace(/\s+/g, "_")}.xlsx`
    ),

  exportSemua: () =>
    downloadFile(API.MANIFEST_EXPORT_SEMUA, "Manifest_Semua_Rute.xlsx"),
};

// ================================================================
// USER API
// ================================================================
export const UserAPI = {
  daftar: (formData: FormData, ruteId: string) =>
    apiRequest<any>(
      `${API.PENDAFTARAN}?rute_id=${ruteId}`,
      "POST",
      formData
    ),

  perbaikiData: (pendaftaranId: number, formData: FormData) =>
    apiRequest<any>(
      `${API.PENDAFTARAN}/perbaiki-data/${pendaftaranId}`,
      "PUT",
      formData
    ),

  riwayat: () => apiRequest<any[]>(API.RIWAYAT),

  getRute: () => apiRequest<any[]>(API.RUTE, "GET", undefined, false),

  downloadTiket: (pendaftaranId: number, namaPeserta: string) =>
    downloadFile(
      `${API.TIKET}/download/${pendaftaranId}`,
      `Tiket_Mudik_${namaPeserta.replace(/\s+/g, "_")}.pdf`
    ),

  konfirmasi: (userId: string, ids: number[]) =>
    apiRequest(
      `${API.KONFIRMASI}/${userId}`,
      "PUT",
      { ids_konfirmasi: ids }
    ),

  getProfile: () => apiRequest<any>(API.PROFILE),

  // 🔒 DIMATIKAN - fitur edit profil dalam pengerjaan
  // updateProfile: (payload: any) =>
  //   apiRequest(API.UPDATE_PROFILE, "PUT", payload),

  // 🔒 DIMATIKAN - fitur ganti password dalam pengerjaan
  // FIX: Backend UserResource.java pakai @POST, bukan @PUT
  // changePassword: (payload: {
  //   password_lama: string;
  //   password_baru: string;
  // }) => apiRequest(API.CHANGE_PASSWORD, "POST", payload),
};

// ================================================================
// PORTAL API
// ================================================================
export const PortalAPI = {
  getStatus: () =>
    apiRequest<any>(API.PORTAL_STATUS, "GET", undefined, false),

  toggleRegister: (open: boolean, pesan?: string) =>
    apiRequest(API.PORTAL_REGISTER, "PUT", {
      open, pesan,
      admin: getCleanToken() ? localStorage.getItem("nama")?.replace(/"/g, "") || "Admin" : "Admin",
    }),

  toggleLogin: (open: boolean, pesan?: string) =>
    apiRequest(API.PORTAL_LOGIN, "PUT", {
      open, pesan,
      admin: localStorage.getItem("nama")?.replace(/"/g, "") || "Admin",
    }),

  toggleMudik: (open: boolean, pesan?: string) =>
    apiRequest(API.PORTAL_MUDIK, "PUT", {
      open, pesan,
      admin: localStorage.getItem("nama")?.replace(/"/g, "") || "Admin",
    }),

  toggleSesi: (open: boolean, pesan?: string) =>
    apiRequest(API.PORTAL_SESI, "PUT", {
      open, pesan,
      admin: localStorage.getItem("nama")?.replace(/"/g, "") || "Admin",
    }),

  toggleTiket: (open: boolean, pesan?: string) =>
    apiRequest(API.PORTAL_TIKET, "PUT", {
      open, pesan,
      admin: localStorage.getItem("nama")?.replace(/"/g, "") || "Admin",
    }),

  updateSemua: (payload: {
    sesi_aktif: boolean;
    portal_register_open: boolean;
    portal_mudik_open: boolean;
    pesan_sesi_berakhir?: string;
    pesan_register_tutup?: string;
    pesan_mudik_tutup?: string;
    pesan_home?: string;
    pesan_dashboard?: string;
    countdown_aktif?: boolean;
    countdown_target?: string | null;
    countdown_label?: string;
  }) =>
    apiRequest(API.PORTAL_SEMUA, "PUT", {
      ...payload,
      admin: localStorage.getItem("nama")?.replace(/"/g, "") || "Admin",
    }),
};

// ================================================================
// TERMINAL API
// ================================================================
export const TerminalAPI = {
  getAll: () =>
    apiRequest<any[]>(API.TERMINAL, "GET", undefined, false),

  getOne: (id: number) =>
    apiRequest<any>(API.TERMINAL_BY_ID(id)),

  tambah: (payload: { nama: string; kota: string; latitude: number; longitude: number }) =>
    apiRequest<any>(API.TERMINAL, "POST", payload),

  update: (id: number, payload: { nama?: string; kota?: string; latitude?: number; longitude?: number }) =>
    apiRequest<any>(API.TERMINAL_BY_ID(id), "PUT", payload),

  hapus: (id: number) =>
    apiRequest<any>(API.TERMINAL_BY_ID(id), "DELETE"),
};

// ================================================================
// FEEDBACK API
// ================================================================
export const FeedbackAPI = {
  getPublik: (limit = 10) =>
    apiRequest<any>(`${BASE_URL}/api/feedback/publik?limit=${limit}`, "GET", undefined, false),

  getStats: () =>
    apiRequest<any>(`${BASE_URL}/api/feedback/stats`, "GET", undefined, false),

  kirim: (payload: { rating: number; komentar?: string; nama_pengirim?: string }) =>
    apiRequest<any>(`${BASE_URL}/api/feedback`, "POST", payload),

  getAdmin: () =>
    apiRequest<any>(`${BASE_URL}/api/feedback/list-admin`),

  setujui: (id: number, disetujui: boolean) =>
    apiRequest<any>(`${BASE_URL}/api/feedback/${id}/setujui`, "PUT", { disetujui }),

  hapus: (id: number) =>
    apiRequest<any>(`${BASE_URL}/api/feedback/${id}`, "DELETE"),

  // Cek apakah user sudah pernah mengirim feedback (backend cek by user/NIK/session)
  sudahKirim: () =>
    apiRequest<{ sudah_kirim: boolean }>(`${BASE_URL}/api/feedback/sudah-kirim`).catch(() => ({ sudah_kirim: false })),
};