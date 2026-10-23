# Database

## Provider aktif

Schema Prisma project ini menggunakan:

```prisma
datasource db {
  provider = "postgresql"
}
```

Jadi database yang benar adalah **PostgreSQL**, bukan MySQL/MariaDB.

- Database default: `mudik_db`
- Port default: `5432`
- Connection string berada di `backend/.env` sebagai `DATABASE_URL`
- Nilai rahasia tidak boleh disimpan di GitHub

Frontend tidak terhubung langsung ke PostgreSQL. Hanya backend yang memakai Prisma untuk mengakses database.

## Model utama

- `User` — akun peserta/admin
- `Terminal` — terminal asal/tujuan
- `Rute` — rute, jadwal, dan kuota
- `Kendaraan` — armada/bus per rute
- `Pendaftaran` — peserta dan relasi keluarga
- `PortalSetting` — kontrol portal
- `Feedback` — ulasan peserta

## Menyiapkan PostgreSQL

Pastikan service berjalan:

```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

Jika database dan user belum ada, buat menggunakan administrator PostgreSQL. Ganti placeholder password secara lokal dan jangan menaruhnya di dokumentasi atau commit:

```sql
CREATE USER mudik_app WITH PASSWORD 'YOUR_DB_PASSWORD';
CREATE DATABASE mudik_db OWNER mudik_app;
```

Lalu isi `backend/.env`:

```dotenv
DATABASE_URL="postgresql://mudik_app:YOUR_DB_PASSWORD@localhost:5432/mudik_db?schema=public"
```

## Prisma

```bash
cd backend
npm install
npx prisma generate
```

Untuk database baru atau database yang memang diotorisasi untuk diselaraskan dengan schema:

```bash
npx prisma db push
```

`db push` dapat mengubah schema database. Backup dan pastikan target database benar sebelum menjalankannya pada data existing.
