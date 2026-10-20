const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "amabel1234/nixxabl";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://nixcooll.biz.id").replace(/\/+$/, "");
const KEY = "site:scripts";

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.status(status).setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  return res.end(body);
}

async function redis(command) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis belum dikonfigurasi.");
  const response = await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) throw new Error(data?.error || `Redis HTTP ${response.status}`);
  return data.result;
}

function bodyValue(req, key) {
  return String(req.query?.[key] || new URL(req.url || "", "http://localhost").searchParams.get(key) || "");
}

function pathFromUrl(value) {
  const prefix = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/`;
  return String(value || "").startsWith(prefix) ? String(value).slice(prefix.length) : "";
}

function contentType(path, type) {
  if (type === "image") {
    const ext = String(path).split(".").pop().toLowerCase();
    return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" })[ext] || "application/octet-stream";
  }
  return "text/plain; charset=utf-8";
}

function publicUrl(req, id, type) {
  return `${PUBLIC_SITE_URL}/api/scripts-file?id=${encodeURIComponent(id)}&type=${type === "image" ? "image" : "script"}`;
}

function isPublicDomain(req) {
  const host = String(req.headers?.host || "").split(":")[0].toLowerCase();
  return host === "nixcooll.biz.id" || host === "www.nixcooll.biz.id";
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return send(res, 405, JSON.stringify({ ok: false, message: "Method not allowed." }));
    const id = bodyValue(req, "id");
    const type = bodyValue(req, "type") === "image" ? "image" : "script";
    const raw = await redis(["get", KEY]);
    const items = raw ? (Array.isArray(raw) ? raw : JSON.parse(raw)) : [];
    const item = items.find((entry) => entry?.id === id);
    if (!item) return send(res, 404, "File tidak ditemukan.");

    if (!isPublicDomain(req)) {
      res.status(302);
      res.setHeader("Location", publicUrl(req, id, type));
      res.setHeader("Cache-Control", "no-store");
      return res.end();
    }

    const path = type === "image"
      ? item.imagePath || pathFromUrl(item.imageUrl)
      : item.scriptPath || pathFromUrl(item.scriptUrl);
    if (!path) return send(res, 404, "File tidak ditemukan.");

    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
    const upstream = await fetch(url, {
      headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {},
    });
    if (!upstream.ok) return send(res, upstream.status, "File tidak dapat dimuat.");
    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(200).setHeader("Content-Type", contentType(path, type));
    res.setHeader("Content-Disposition", type === "image" ? "inline" : `inline; filename="Nixx-Script-${id}.lua"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.end(data);
  } catch (error) {
    console.error("scripts-file:", error);
    return send(res, 500, "Gagal memuat file.");
  }
}