# NIXX Lua Obfuscator — Setup

Fitur obfuscator sudah ditambahkan ke web utama dan muncul di bagian bawah halaman.

## Environment Variables Vercel

Tambahkan dua Environment Variables berikut pada project Vercel yang sama:

- `TELEGRAM_BOT_TOKEN` = token BotFather milik kamu
- `TELEGRAM_CHAT_ID` = chat ID tujuan arsip source

Jangan memasukkan token ke `nixx-obfuscator.js`, HTML, atau file frontend.

## Cara kerja

1. Pengunjung paste/upload `.lua` atau `.luau`.
2. Pilih mode Clean, Light, Medium, atau Strong.
3. Pengunjung wajib menyetujui bahwa source asli dikirim ke bot Telegram pemilik.
4. Browser membuat output obfuscated secara lokal.
5. `/api/obfuscate` mengirim source asli sebagai file `.lua` ke Telegram menggunakan token server-side.
6. Output obfuscated bisa dicopy atau didownload.

## Catatan

- Batas source: 2 MB.
- Obfuscation ini adalah transformasi source, bukan enkripsi absolut.
- Mode Medium/Strong melakukan rename identifier `local` secara konservatif; source Luau yang sangat kompleks tetap perlu dites sebelum dipakai di production.
- Backup source asli tetap disarankan.


## NIXX Raw Link V2
Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, dan opsional `PUBLIC_SITE_URL=https://nixcooll.biz.id` di Vercel.
Setiap obfuscation yang sukses menyimpan protected output selama 30 hari dan menghasilkan URL `https://nixcooll.biz.id/raw/NIXX-XXXXXXXXXX`. Endpoint raw mengirim `text/plain`, sehingga link bisa dipakai sebagai raw source.
