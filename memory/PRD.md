# PRD — Rekap Cadangan Lokomotif KAI

## Ringkasan
Aplikasi mobile (Expo React Native) untuk merekap data cadangan lokomotif, kereta, dan gerbong pada dua status operasional (TSO & TSGO), dipisahkan per akun regional Pusdal. Hasil rekap ditampilkan sebagai tabel plain-text yang dapat langsung disalin.

## Pengguna
13 akun preset (di-seed idempotent saat startup backend).
- **admin / admin123** — dapat melihat rekap semua Pusdal.
- **Pusdal1 – Pusdal9** — Jakarta, Bandung, Cirebon, Semarang, Purwokerto, Yogyakarta, Madiun, Surabaya, Jember (password `pusdal123`).
- **PusdalV1, PusdalV2, PusdalSS** — Medan, Padang, Sumatera Selatan (password `pusdal123`).

## Fitur Utama
1. **Login JWT** – username & password → token disimpan di SecureStore (native) / AsyncStorage (web).
2. **Dashboard** – 6 kartu kategori: TSO Lokomotif/Kereta/Gerbong, TSGO Lokomotif/Kereta/Gerbong.
3. **CRUD Data** – setiap entri terdiri dari `Nomor` + `Keterangan`. Data terikat pada akun pembuat (owner).
4. **Rekap Text** – hasil `GET /api/rekap` dirender client-side menjadi tabel plain-text monospace:
   - User biasa: hanya data miliknya.
   - Admin: dikelompokkan per Pusdal (owner + region) dan per kategori, urut mengikuti SEED_USERS.
5. **Copy to Clipboard** – tombol SALIN TEXT menyalin seluruh output ke clipboard (`expo-clipboard`).

## Arsitektur Teknis
- **Backend**: FastAPI + Motor MongoDB, JWT (PyJWT HS256), bcrypt password. Prefix `/api`.
- **Frontend**: Expo Router (file-based), React Native + `react-native-safe-area-context`, tema Brutalist Mobile (mono JetBrains Mono, KAI Orange #EA580C, radius 0, borders 1pt).
- **Env**: `JWT_SECRET`, `JWT_EXPIRE_MINUTES=1440`, `SEED_PASSWORD=pusdal123`, `ADMIN_PASSWORD=admin123` di `/app/backend/.env`.

## API Endpoints
| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/api/auth/login` | – | Login, kembalikan JWT |
| GET  | `/api/auth/me` | Bearer | Info user aktif |
| GET  | `/api/categories` | – | 6 kategori |
| GET  | `/api/entries/{category}` | Bearer | List (own / all utk admin) |
| POST | `/api/entries/{category}` | Bearer | Tambah entri |
| PUT  | `/api/entries/{category}/{id}` | Bearer | Ubah entri |
| DELETE | `/api/entries/{category}/{id}` | Bearer | Hapus entri |
| GET  | `/api/rekap` | Bearer | Data untuk rekap text |

## Status
MVP selesai, backend 7/7 pytest PASS, frontend end-to-end teruji.
