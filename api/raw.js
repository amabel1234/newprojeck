const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Database belum dikonfigurasi.");
  const r = await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.error) throw new Error(d?.error || `Redis HTTP ${r.status}`);
  return d.result;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).send("Method not allowed.");
    const url = new URL(req.url || "", `https://${req.headers.host || "localhost"}`);
    const id = String(req.query?.id || url.searchParams.get("id") || "").toUpperCase();
    if (!/^NIXX-[A-Z2-9]{10}$/.test(id)) return res.status(400).send("Raw ID tidak valid.");
    const source = await redis(["get", `nixx_raw:${id}`]);
    if (!source) return res.status(404).send("Raw code tidak ditemukan atau sudah kedaluwarsa.");
    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${id}.lua"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    return res.end(source);
  } catch (e) {
    console.error("raw:", e);
    return res.status(500).send("Gagal memuat raw code.");
  }
}
