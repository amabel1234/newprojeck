# Sistem license key NIXX VIP

Frontend dipisah menjadi:

- `index.html` — struktur halaman.
- `style.css` — tema neon, responsive layout, reveal animation, hover dan modal.
- `script.js` — filter paket, order WhatsApp, particle effect, dan cek status key.

## Cara kerja key

1. Setelah pembayaran dikonfirmasi, admin memanggil `POST /api/licenses/issue`.
2. Server membuat key unik dan menyimpan paket durasinya.
3. Saat pertama kali dipakai, status `issued` berubah menjadi `active` dan server menghitung `expiresAt`.
4. Script atau website mengirim key ke `POST /api/license/validate`.
5. Jika waktu lewat `expiresAt`, API mengembalikan `EXPIRED`.
6. Client harus menghentikan akses dan meminta user order key baru.

Contoh membuat key:

```bash
# Jalankan npm start setelah ADMIN_TOKEN tersedia di environment
curl -X POST http://localhost:3000/api/licenses/issue \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"days":7,"customer":"username-pembeli"}'
```

## Catatan keamanan

Jangan menaruh `ADMIN_TOKEN` di frontend atau di dalam script client. Validasi yang hanya dilakukan di JavaScript browser atau key yang ditulis tetap di Lua bisa dilewati. Untuk production, pindahkan penyimpanan `licenses.json` ke database persisten seperti Postgres/Supabase/Neon dan tambahkan rate limit, logging, serta panel admin.

Client Lua yang dipakai pembeli perlu memanggil API ini melalui HTTP request yang aman. Saat API mengembalikan `EXPIRED` atau `INVALID`, tampilkan form key lagi; jangan menyimpan key sebagai satu nilai tetap di dalam script.

## Integrasi ke file Lua NIXX

File Lua yang dikirim sudah diarahkan ke validasi online. Ganti nilai berikut setelah API sudah dideploy:

```lua
LicenseAPI = "https://YOUR-API-DOMAIN.example.com/api/license/validate"
```

Perubahan pada file Lua:

- `CorrectKey` lokal dihapus.
- Key yang disimpan di `NixxKeyData.txt` selalu dicek ulang ke server saat script dijalankan.
- Expiry yang disimpan berasal dari `expiresAtUnix` milik server.
- Key `INVALID`, `EXPIRED`, `REVOKED`, atau API yang gagal tidak boleh membuka fitur utama.
- Saat script dijalankan kembali setelah expiry, panel key akan muncul lagi untuk meminta key baru.

Versi ini melakukan pengecekan pada saat startup dan saat tombol **VERIFY KEY** ditekan. Untuk memaksa panel muncul tepat di tengah sesi ketika waktu habis, key panel perlu dirapikan menjadi fungsi `ShowKeyGui()` lalu dipanggil oleh heartbeat berkala. Jangan mengandalkan jam lokal client sebagai sumber expiry.