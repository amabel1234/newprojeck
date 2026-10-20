# Deploy NIXX Products ke Vercel

Paket ini berisi storefront baru, API katalog PostgreSQL, serta API dan panel lama (license, key, Roblox access, script store, announcement, raw code, dan obfuscator). API lama tetap memakai penyimpanan dan kontrak yang sama; katalog baru memakai tabel PostgreSQL terpisah.

## 1. Buat database PostgreSQL

Gunakan Neon PostgreSQL atau penyedia PostgreSQL yang kompatibel dengan Vercel Functions. Buat database/branch baru untuk katalog, lalu salin connection string yang memakai TLS.

Di SQL Editor database, jalankan berurutan:

1. `database/schema.sql`
2. `database/seed.sql` untuk memasukkan empat paket VVIP dari situs lama.

Jangan jalankan seed jika Anda sengaja tidak ingin memasukkan produk awal. Baris seed menggunakan ID tetap dan `ON CONFLICT DO NOTHING`, sehingga aman dijalankan ulang tanpa menimpa perubahan produk.

## 2. Deploy folder ini

Import folder hasil ekstrak ZIP ini ke Vercel. Root project berisi `api/`, `public/`, `package.json`, dan `vercel.json`; Vercel akan melayani halaman statis dari `public/` dan menjalankan fungsi serverless dari `api/`.

Periksa:

- `/` — storefront NIXX baru
- `/admin` — studio untuk katalog PostgreSQL
- `/legacy/` — storefront lama beserta fitur obfuscator
- `/admin.html` — panel lama untuk license key, script, dan announcement
- `/api/health` — pemeriksaan API lama

## 3. Environment variables di Vercel

Tambahkan melalui **Vercel → Project → Settings → Environment Variables**. Masukkan nilainya di dashboard Vercel, bukan ke source code atau `.env.example`.

### Wajib untuk katalog baru

- `DATABASE_URL` — connection string PostgreSQL/Neon.
- `ADMIN_TOKEN` — token rahasia yang dipakai studio katalog dan panel admin lama. Buat token acak yang panjang.

### Wajib agar fitur lama tetap aktif

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Gunakan database Upstash Redis yang sama dengan situs lama agar license, akses Roblox 24 jam, script metadata, announcement, dan raw code lama tetap tersedia.

### Untuk fitur lama tertentu

- `GITHUB_TOKEN` — wajib untuk upload/edit cover dan script pada panel lama.
- `GITHUB_REPO` — default `amabel1234/nixxabl`, ubah bila repositori penyimpanan file berbeda.
- `GITHUB_BRANCH` — default `main`.
- `PUBLIC_SITE_URL` — alamat publik situs, default `https://nixcooll.biz.id`.
- `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` — opsional, hanya untuk pengiriman archive obfuscator.
- `RESELLER_TOKEN` — opsional bila fitur role reseller lama digunakan.

Set environment variables untuk **Production**, dan juga Preview/Development bila fitur itu diperlukan di sana. Setelah mengubah nilai, redeploy project.

## 4. Verifikasi setelah deploy

1. Buka `/api/health`; respons seharusnya menunjukkan layanan license lama aktif.
2. Buka `/`; pastikan produk VVIP dan kategori katalog tampil.
3. Buka `/admin`, masukkan `ADMIN_TOKEN`, lalu uji tambah/edit/nonaktifkan/hapus produk.
4. Buka `/admin.html` untuk panel lama dan uji validasi license menggunakan key yang memang sudah ada.
5. Buka `/legacy/` untuk storefront/obfuscator lama.

Katalog baru menolak request tanpa `ADMIN_TOKEN`. License dan akses Roblox lama membaca Redis yang sudah digunakan situs lama; data tidak disalin atau dihapus saat deployment.

## Source frontend

`frontend-source/` menyimpan source React dan style storefront baru. `public/` sudah berisi hasil build untuk deploy statis. Source proyek Replit lengkap dan source asli yang disertakan pengguna juga ada pada arsip ini. Setelah perubahan UI, rebuild artifact NIXX dan salin isi `dist/public/` ke `public/` sebelum deploy ulang.
