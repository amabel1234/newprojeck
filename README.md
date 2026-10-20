# NIXX Products — source package Vercel

`api/` berisi Vercel Functions untuk katalog PostgreSQL. `public/` adalah output statis storefront yang siap deploy. `database/` berisi schema dan seed katalog.

Arsip source yang dikirim pengguna disimpan sebagai `legacy-source/`; API lama tetap disalin ke `api/`, dan aset lamanya tetap berada di `public/assets/`. Jalankan langkah di `DEPLOY.md` sebelum memakai database dan layanan lama pada production.

`.env.example` hanya berisi nama environment variables. Jangan mengisi secret ke file ini atau commit `.env`.
