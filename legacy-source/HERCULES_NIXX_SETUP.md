# Nixx Hercules Luau Obfuscator

Build ini mengganti engine tokenizer V7 dengan Hercules v2.0.1 dari source yang diberikan. Target API adalah `luau`.

## Dependency
`npm install` memasang `fengari`, yang menjalankan engine Lua di Node.js tanpa binary Lua eksternal.

## API
POST `/api/obfuscate` dengan JSON:
`{ "source": "...", "filename": "script.luau", "mode": "strong" }`

Mode: `clean`, `light`, `medium`, `strong`, `extreme`. Mapping ke preset Hercules: clean->light, medium->balanced, strong->heavy, extreme->maximum.

Virtual Machine dan bytecode encoding otomatis dilewati untuk target Luau sesuai manifest Hercules.

## Environment
Untuk Raw Link: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, optional `PUBLIC_SITE_URL`.
Untuk archive Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

Catatan: source Hercules asli dipertahankan di `hercules-src/`. Jangan menghapus folder ini karena runner memuat module dari sana.
