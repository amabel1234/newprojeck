import { allowCors, body, json } from "./_lib/http.js";
import { requireRole } from "./_lib/auth.js";

const KEY = "site:announcement";
const redis = async (command) => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Database belum dikonfigurasi.");
  const r = await fetch(`${url}/${command.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || d.error) throw new Error(d?.error || `Redis HTTP ${r.status}`);
  return d.result;
};

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    if (req.method === "GET") {
      const raw = await redis(["get", KEY]);
      const announcement = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : { enabled: false, text: "", type: "info" };
      return json(res, 200, { announcement });
    }
    if (["POST","PUT"].includes(req.method)) {
      if (!requireRole(req, ["admin"])) return json(res, 403, { message: "Announcement hanya bisa diubah Admin." });
      const data = await body(req);
      const text = String(data.text || "").trim();
      const type = ["info","success","warning","danger"].includes(data.type) ? data.type : "info";
      const announcement = { enabled: Boolean(data.enabled), text: text.slice(0, 300), type, updatedAt: new Date().toISOString() };
      await redis(["set", KEY, JSON.stringify(announcement)]);
      return json(res, 200, { ok: true, announcement });
    }
    return json(res, 405, { message: "Method not allowed." });
  } catch (e) {
    console.error("announcement:", e);
    return json(res, 500, { message: e.message || "Gagal mengelola announcement." });
  }
}
