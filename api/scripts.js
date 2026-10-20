import { requireRole } from "./_lib/auth.js";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "amabel1234/nixxabl";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://nixcooll.biz.id").replace(/\/+$/, "");
const KEY = "site:scripts";
const MAX_IMAGE_DATA = 2_200_000;
const MAX_SCRIPT_DATA = 2_800_000;
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i;
const SCRIPT_DATA_URL = /^data:(?:application\/octet-stream|text\/plain|text\/lua);base64,/i;

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(data));
}

function safeName(name, fallback) {
  const clean = String(name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || fallback;
}

function cleanString(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:[^;]+;base64,(.+)$/i);
  return match ? match[1] : "";
}

function productFingerprint(item) {
  return [
    item.title,
    item.price,
    item.badge,
    item.version,
    item.category,
    item.description,
    item.orderLabel,
    item.orderUrl,
    item.featured ? "featured" : "standard",
    ...(Array.isArray(item.features) ? item.features : []),
  ].map((value) => String(value ?? "").trim().toLowerCase()).join("|");
}

function uniqueProducts(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    if (!item || !item.id) return false;
    const fingerprint = productFingerprint(item);
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  }).slice(0, 50);
}

function publicProduct(item) {
  const hasScript = Boolean(item.scriptPath || item.scriptUrl);
  const hasImage = Boolean(item.imagePath || item.imageUrl);
  return {
    ...item,
    scriptUrl: hasScript ? `${PUBLIC_SITE_URL}/api/scripts-file?id=${encodeURIComponent(item.id)}&type=script` : "",
    imageUrl: hasImage ? `${PUBLIC_SITE_URL}/api/scripts-file?id=${encodeURIComponent(item.id)}&type=image` : "",
  };
}

function requestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return {};
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

async function getScripts() {
  const raw = await redis(["get", KEY]);
  if (!raw) return [];
  try {
    return uniqueProducts(Array.isArray(raw) ? raw : JSON.parse(raw));
  } catch {
    return [];
  }
}

async function setScripts(items) {
  return redis(["set", KEY, JSON.stringify(uniqueProducts(items))]);
}

async function github(path, options = {}) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN belum diset di Vercel.");
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `GitHub HTTP ${response.status}`);
  return data;
}

async function uploadToGithub(path, base64, message) {
  let sha;
  try {
    sha = (await github(path)).sha;
  } catch (_) {
    // A missing path is expected on the first upload.
  }
  const payload = { message, content: base64, branch: GITHUB_BRANCH };
  if (sha) payload.sha = sha;
  return github(path, { method: "PUT", body: JSON.stringify(payload) });
}

function auth(req) {
  return requireRole(req, ["admin"]);
}

function validateFile(value, pattern, max, label) {
  if (!value) return;
  if (value.length > max) throw new Error(`${label} terlalu besar.`);
  if (!pattern.test(value)) throw new Error(`Format ${label.toLowerCase()} tidak didukung.`);
}

function normalizeProduct(data, existing = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(data, key);
  return {
    title: cleanString(has("title") ? data.title : existing.title, 80),
    price: cleanString(has("price") ? data.price : existing.price, 40),
    badge: cleanString(has("badge") ? data.badge : existing.badge, 40),
    version: cleanString(has("version") ? data.version : existing.version, 30) || "Latest",
    category: cleanString(has("category") ? data.category : existing.category, 40) || "Script Roblox",
    description: cleanString(has("description") ? data.description : existing.description, 500),
    orderLabel: cleanString(has("orderLabel") ? data.orderLabel : existing.orderLabel, 30) || "Order Sekarang",
    orderUrl: cleanString(has("orderUrl") ? data.orderUrl : existing.orderUrl, 400),
    featured: has("featured") ? Boolean(data.featured) : Boolean(existing.featured),
    features: Array.isArray(data.features)
      ? data.features.map((item) => cleanString(item, 120)).filter(Boolean).slice(0, 20)
      : Array.isArray(existing.features) ? existing.features : [],
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return json(res, 200, { ok: true, scripts: (await getScripts()).map(publicProduct) });
    }
    if (!auth(req)) return json(res, 401, { ok: false, message: "Admin token required." });

    const body = requestBody(req);
    const items = await getScripts();

    if (req.method === "DELETE") {
      const id = cleanString(body.id, 140);
      if (!id) return json(res, 400, { ok: false, message: "ID script wajib diisi." });
      const next = items.filter((item) => item.id !== id);
      await setScripts(next);
      return json(res, 200, { ok: true, message: "Produk SC dihapus dari storefront.", scripts: next });
    }

    if (!["POST", "PUT"].includes(req.method)) {
      return json(res, 405, { ok: false, message: "Method not allowed." });
    }

    const isEdit = req.method === "PUT";
    const existing = isEdit ? items.find((item) => item.id === cleanString(body.id, 140)) : null;
    if (isEdit && !existing) {
      return json(res, 404, { ok: false, message: "Produk yang mau diedit tidak ditemukan." });
    }

    const product = normalizeProduct(body, existing || {});
    const imageBase64 = String(body.imageBase64 || "");
    const scriptBase64 = String(body.scriptBase64 || "");
    const imageName = safeName(body.imageName, "cover.jpg");
    const scriptName = safeName(body.scriptName, "script.lua");

    if (!product.title || !product.price || !product.description) {
      return json(res, 400, { ok: false, message: "Nama, harga, dan deskripsi produk wajib diisi." });
    }
    if (!isEdit && (!imageBase64 || !scriptBase64)) {
      return json(res, 400, { ok: false, message: "Produk baru wajib memiliki cover dan file script." });
    }
    try {
      validateFile(imageBase64, IMAGE_DATA_URL, MAX_IMAGE_DATA, "Cover");
      validateFile(scriptBase64, SCRIPT_DATA_URL, MAX_SCRIPT_DATA, "File script");
    } catch (error) {
      return json(res, 413, { ok: false, message: error.message });
    }

    const id = existing?.id || `${Date.now()}-${safeName(product.title, "script")}`;
    let scriptUrl = existing?.scriptUrl || "";
    let imageUrl = existing?.imageUrl || "";
    let scriptPath = existing?.scriptPath || "";
    let imagePath = existing?.imagePath || "";

    if (scriptBase64) {
      scriptPath = `assets/scripts/${id}-${scriptName}`;
      await uploadToGithub(scriptPath, parseDataUrl(scriptBase64), `${isEdit ? "Update" : "Add"} NIXXTEAM script product: ${product.title}`);
      scriptUrl = `${PUBLIC_SITE_URL}/api/scripts-file?id=${encodeURIComponent(id)}&type=script`;
    }
    if (imageBase64) {
      imagePath = `assets/scripts/covers/${id}-${imageName}`;
      await uploadToGithub(imagePath, parseDataUrl(imageBase64), `${isEdit ? "Update" : "Add"} NIXXTEAM script cover: ${product.title}`);
      imageUrl = `${PUBLIC_SITE_URL}/api/scripts-file?id=${encodeURIComponent(id)}&type=image`;
    }

    const item = {
      ...(existing || {}),
      id,
      ...product,
      scriptUrl,
      imageUrl,
      scriptPath,
      imagePath,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = isEdit
      ? items.map((entry) => entry.id === id ? item : entry)
      : [item, ...items].slice(0, 50);
    await setScripts(next);
    return json(res, 200, {
      ok: true,
      script: item,
      scripts: next,
      message: isEdit ? "Produk SC berhasil diperbarui." : "Produk SC berhasil dipublish dan tampil di storefront.",
    });
  } catch (error) {
    console.error("scripts:", error);
    return json(res, 500, { ok: false, message: error.message || "Gagal menyimpan script." });
  }
}
