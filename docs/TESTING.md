# Testing dan verifikasi

Validasi yang dijalankan pada source yang dipasang ke repository ini:

## Backend

```bash
cd backend
npx tsc --noEmit
npm test
```

Hasil terakhir:

- TypeScript: **PASS**
- Smoke tests: **3/3 PASS**
  - health endpoint
  - admin route CRUD, validasi input, RBAC, dan persistence
  - multipart registration dengan array penumpang

## Frontend

```bash
cd frontend
npm run build
```

Hasil terakhir: **PASS**. Vite masih menampilkan warning ukuran chunk JavaScript besar; warning tersebut bukan error build.

## Live smoke check

```bash
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{"ok":true}
```

Endpoint protected harus menolak request tanpa JWT dengan HTTP `401`, bukan mengembalikan data.

## Catatan data

Pengujian tidak boleh memakai `db push`, update, delete, atau fixture pada database existing tanpa memastikan targetnya benar. Jika memakai data uji, gunakan ID yang jelas dan pulihkan perubahan setelah test. Jangan mencetak isi `.env`, password, token, atau connection string.
