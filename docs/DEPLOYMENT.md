# Deployment

Frontend dan backend dapat dijalankan terpisah, tetapi keduanya memakai API backend yang sama.

## Persyaratan

- Node.js 20 atau lebih baru
- PostgreSQL 14+ (provider Prisma project: `postgresql`)
- Nginx atau reverse proxy jika memakai domain/HTTPS

## Backend

```bash
cd backend
cp .env.example .env
# Isi DATABASE_URL, JWT_SECRET, PORT, dan CORS_ORIGIN secara lokal
npm install
npx prisma generate
npm run build
node dist/src/server.js
```

Port default: `3000`.

Verifikasi:

```bash
curl http://127.0.0.1:3000/health
```

Output sehat mengandung `{"ok":true}`.

Untuk menjalankan development watcher:

```bash
npm run dev
```

## Frontend

Development:

```bash
cd frontend
npm install
# VITE_API_BASE_URL boleh kosong jika memakai proxy Vite
npm run dev
```

Production static build:

```bash
npm run build
```

Hasilnya berada di `frontend/dist/`.

## Nginx same-origin

Dengan frontend dan API pada domain yang sama, biarkan `VITE_API_BASE_URL` kosong agar frontend memanggil `/api/...`. Contoh proxy API:

```nginx
server {
    server_name example.invalid;

    root /var/www/project-mudik-gratis/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Jangan commit `.env`, password PostgreSQL, JWT secret, token, atau kredensial provider.
