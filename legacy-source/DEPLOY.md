# NIXX VIP — Vercel-ready

Project ini memakai Vercel Functions untuk API dan Upstash Redis untuk database license persisten.

## 1. Deploy

Import folder project ini ke Vercel.

Public pages:
- `/` — storefront
- `/admin.html` — admin key generator

API:
- `GET /api/health`
- `POST /api/licenses/issue`
- `POST /api/license/validate`

## 2. Database

Buat database Redis di Upstash, lalu ambil:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Tambahkan keduanya di Vercel → Project → Settings → Environment Variables.

## 3. Admin token

Buat environment variable:

`ADMIN_TOKEN`

Jangan masukkan token ini ke `admin.js`, `script.js`, HTML, atau file Lua.

## 4. Test

Setelah redeploy, buka:

`https://DOMAIN-KAMU/api/health`

Harus mendapat JSON seperti:

`{"ok":true,"service":"NIXX License API"}`

Kemudian buka:

`https://DOMAIN-KAMU/admin.html`

Masukkan Admin Token, username pembeli, pilih masa aktif, lalu Generate Key.

## 5. Validasi

Storefront memakai:

`POST /api/license/validate`

Body:

`{"key":"NIXX-...."}`

Key `issued` mulai menghitung masa aktif ketika pertama kali divalidasi.

## NIXXTEAM Script Library

Admin sekarang bisa upload cover JPG/PNG/WebP + file script dari halaman admin. Produk baru langsung muncul di storefront, dan produk yang sudah ada bisa diedit dari tombol **Edit Produk** tanpa upload ulang file. File yang dipilih disimpan di GitHub, sedangkan metadata disimpan di Upstash Redis; storefront mengambil data dari API sehingga tidak perlu menunggu deployment Vercel setelah publish.

Tambahkan Environment Variables di Vercel:

- `GITHUB_TOKEN` — Fine-grained GitHub token dengan akses **Contents: Read and write** ke repository.
- `GITHUB_REPO` — `amabel1234/nixxabl`
- `GITHUB_BRANCH` — `main`

Endpoint publik: `GET /api/scripts`  
Endpoint admin: `POST /api/scripts` untuk tambah, `PUT /api/scripts` untuk edit, dan `DELETE /api/scripts` untuk hapus.

Catatan upload:
- Cover dioptimalkan otomatis di browser lalu disimpan sebagai gambar JPEG agar aman terhadap batas body request Vercel.
- Saat edit, file cover dan file script boleh dikosongkan jika hanya ingin mengubah nama, harga, deskripsi, badge, link order, atau status unggulan.
