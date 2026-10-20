import { json } from "./_lib/http.js";
import { obfuscateLuau } from "./_lib/hercules.js";

const MAX_BYTES = 2 * 1024 * 1024;
const RAW_TTL = 60 * 60 * 24 * 30;
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://nixcooll.biz.id").replace(/\/+$/, "");

const clean = value => String(value ?? "").replace(/\r\n/g, "\n");

async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Database belum dikonfigurasi.");
  const r = await fetch(`${url}/${command.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.error) throw new Error(d?.error || `Redis HTTP ${r.status}`);
  return d.result;
}

function randomId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "NIXX-";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out.slice(0, 15);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return json(res, 405, { ok: false, message: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const filename = clean(body.filename || "source.lua").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "source.lua";
    const source = clean(body.source);
    const mode = clean(body.mode || "strong").toLowerCase();
    if (!source.trim()) return json(res, 400, { ok: false, message: "Source Lua/Luau kosong." });
    if (Buffer.byteLength(source, "utf8") > MAX_BYTES) return json(res, 413, { ok: false, message: "File terlalu besar. Maksimal 2 MB." });

    const started = Date.now();
    const output = obfuscateLuau(source, mode);
    if (!output.trim()) throw new Error("Hercules menghasilkan output kosong.");
    if (Buffer.byteLength(output, "utf8") > MAX_BYTES * 4) return json(res, 413, { ok: false, message: "Output terlalu besar." });

    const id = randomId();
    const rawUrl = `${PUBLIC_SITE_URL}/raw/${id}`;
    let rawStored = false;
    try {
      await redis(["set", `nixx_raw:${id}`, output, "EX", String(RAW_TTL)]);
      rawStored = true;
    } catch (e) {
      console.error("Raw storage failed:", e);
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    let sent = false;
    if (token && chatId) {
      try {
        const form = new FormData();
        form.append("chat_id", chatId);
        form.append("caption", `NIXX HERCULES OBFUSCATOR\\nMode: ${mode}\\nOriginal: ${filename}\\nArchive: nixx.lua\\nRaw: ${rawStored ? rawUrl : "tidak tersedia"}`);
        form.append("document", new Blob([source], { type: "text/plain" }), "nixx.lua");
        const tg = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: form });
        const result = await tg.json().catch(() => null);
        sent = Boolean(tg.ok && result?.ok);
      } catch (e) { console.error("Telegram archive failed:", e); }
    }

    return json(res, 200, {
      ok: true,
      engine: "Hercules",
      target: "luau",
      mode,
      filename: "nixx.lua",
      output,
      id,
      rawUrl: rawStored ? rawUrl : null,
      expiresIn: rawStored ? RAW_TTL : 0,
      sent,
      processingMs: Date.now() - started,
      warning: rawStored ? undefined : "Obfuscation berhasil, tetapi Raw Link tidak tersimpan karena Redis belum dikonfigurasi."
    });
  } catch (error) {
    console.error("Hercules obfuscate:", error);
    return json(res, 500, { ok: false, engine: "Hercules", message: error.message || "Gagal melakukan obfuscation." });
  }
}
