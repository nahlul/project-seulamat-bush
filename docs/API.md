# API Ringkas

Base URL development: `http://localhost:3000`

Semua endpoint protected memakai header:

```text
Authorization: Bearer <JWT>
```

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/request-reset-password`
- `POST /api/auth/reset-password`
- `GET /api/user/profile`

## Public

- `GET /health`
- `GET /api/rute`
- `GET /api/terminal`
- `GET /api/portal/status`
- `GET /api/kendaraan`
- `GET /api/feedback`

## Peserta

- `GET /api/pendaftaran`
- `GET /api/pendaftaran/riwayat`
- `POST /api/pendaftaran?rute_id=:id` — multipart registration
- `PUT /api/pendaftaran/:id/koreksi`
- `POST /api/pendaftaran/:id/konfirmasi`
- `PUT /api/pendaftaran/konfirmasi-kehadiran/:id` — konfirmasi seluruh keluarga dari link
- `GET /api/tiket/:id`
- `GET /api/tiket/download/:id`
- `POST /api/upload`

## Admin

- `GET /api/admin/stats`
- `GET /api/admin/pendaftar`
- `GET /api/admin/pendaftar/paginated`
- `PUT /api/admin/verifikasi/:id`
- `PUT /api/admin/verifikasi-custom/:familyId`
- `PUT /api/admin/verifikasi-keluarga/:familyId`
- `PUT /api/admin/batalkan-peserta/:id`
- `PUT /api/admin/pindah-rute/:familyId`
- `POST /api/admin/assign-bus`
- `GET/POST /api/admin/kendaraan`
- `PUT/DELETE /api/admin/kendaraan/:id`
- `POST /api/admin/kirim-link-konfirmasi/:familyId`
- `POST /api/admin/kirim-konfirmasi-semua-h3`
- `GET /api/admin/export/pendaftar`

Detail payload dan validasi mengikuti implementasi `backend/src/server.ts` serta kontrak pemanggilan pada `frontend/lib/api.ts`.
