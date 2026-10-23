# Mudik Gratis Aceh 2026

Aplikasi web program Mudik Gratis Dinas Perhubungan Aceh.

## Stack yang dipakai

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + Prisma
- **Database:** PostgreSQL
- **Autentikasi:** JWT + bcrypt
- **Upload:** penyimpanan lokal backend dengan nama file acak

> Frontend dan backend adalah dua aplikasi terpisah. Frontend tidak mengakses database secara langsung; semua data melewati API backend. Project ini **tidak menggunakan MySQL**.

## Struktur

```text
project-mudik-gratis/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/server.ts
│   ├── test/smoke.test.ts
│   └── package.json
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── lib/api.ts
│   └── package.json
└── docs/
```

## Menjalankan di development

### 1. PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

Buat database/user hanya jika belum tersedia. Jangan mencetak password atau isi `.env` ke log/chat.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Isi DATABASE_URL dan JWT_SECRET di .env secara lokal
npm install
npx prisma generate
npm run dev
```

Backend aktif di `http://localhost:3000`.

Cek kesehatan API:

```bash
curl http://127.0.0.1:3000/health
```

### 3. Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Frontend aktif di `http://localhost:5173` atau port Vite berikutnya yang tersedia. Saat `VITE_API_BASE_URL` kosong, request `/api` diteruskan ke backend melalui proxy Vite.

## Build dan test

```bash
cd backend
npx tsc --noEmit
npm test
npm run build

cd ../frontend
npm run build
```

## Produksi

Build backend lalu jalankan hasil kompilasi:

```bash
cd backend
npm install
npx prisma generate
npm run build
node dist/src/server.js
```

Build frontend menghasilkan folder `frontend/dist/` yang dapat disajikan Nginx atau static hosting. Lihat `docs/DEPLOYMENT.md` untuk konfigurasi lebih lengkap.

## Environment

File `.env` tidak disimpan ke GitHub. Gunakan file contoh:

- `backend/.env.example`
- `frontend/.env.example`

Jangan commit password database, JWT secret, token, atau kredensial provider eksternal.
