INSERT INTO nixx_products
  (id, name, category, price, description, features, featured, active)
VALUES
  (
    'legacy-vip-1d',
    'VVIP Key / 1 Hari',
    'vip-key',
    'Rp10.000',
    'Masa aktif 24 jam setelah aktivasi, dengan key personal, status yang dapat dicek online, panduan aktivasi, dan bantuan order melalui WhatsApp.',
    '["Masa aktif 24 jam setelah aktivasi","Key lisensi personal","Status key dapat dicek online","Panduan aktivasi","Bantuan order melalui WhatsApp"]'::jsonb,
    false,
    true
  ),
  (
    'legacy-vip-7d',
    'VVIP Key / 7 Hari',
    'vip-key',
    'Rp15.000',
    'Masa aktif 7 × 24 jam, key personal, detail tanggal aktivasi dan berakhir, bantuan prioritas, dan pembaruan dari kanal resmi.',
    '["Masa aktif 7 × 24 jam setelah aktivasi","Key lisensi personal","Detail tanggal aktivasi dan berakhir","Bantuan prioritas","Pembaruan dari kanal resmi"]'::jsonb,
    false,
    true
  ),
  (
    'legacy-vip-30d',
    'VVIP Key / 30 Hari',
    'vip-key',
    'Rp25.000',
    'Masa aktif 30 × 24 jam, key personal, detail status dan tanggal berakhir, dukungan VIP, serta informasi pembaruan resmi.',
    '["Masa aktif 30 × 24 jam setelah aktivasi","Key lisensi personal","Detail status dan tanggal berakhir","VIP support","Akses informasi pembaruan resmi"]'::jsonb,
    false,
    true
  ),
  (
    'legacy-vip-lifetime',
    'VVIP Key / Lifetime',
    'vip-key',
    'Rp50.000',
    'Akses jangka panjang dengan key personal, pengecekan status online, panduan aktivasi, dan dukungan owner melalui WhatsApp.',
    '["Akses jangka panjang","Key lisensi personal","Pengecekan status key online","Panduan aktivasi","Support owner melalui WhatsApp"]'::jsonb,
    false,
    true
  )
ON CONFLICT (id) DO NOTHING;
