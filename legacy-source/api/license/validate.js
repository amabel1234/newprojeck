import { getLicense, setLicense } from "../_lib/db.js";
import { allowCors, body, json } from "../_lib/http.js";

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["POST", "GET"].includes(req.method)) {
    return json(res, 405, { active: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed." });
  }

  try {
    // Support both POST JSON and GET ?key=... so the endpoint is easy to test
    // and remains compatible with older clients.
    let data = {};
    if (req.method === "POST") {
      data = await body(req);
    } else {
      const url = new URL(req.url || "", `https://${req.headers.host || "localhost"}`);
      data = { key: url.searchParams.get("key") || "" };
    }

    const normalized = String(data.key || "").trim().toUpperCase();
    if (!normalized) return json(res, 400, { active: false, code: "MISSING_KEY", message: "Key wajib diisi." });

    const license = await getLicense(normalized);
    if (!license) return json(res, 404, { active: false, code: "INVALID", message: "Key tidak ditemukan." });

    const now = Date.now();

    if (license.status === "revoked") {
      return json(res, 403, {
        active: false, code: "REVOKED", message: "Key sudah dinonaktifkan.",
        key: license.key, planDays: license.planDays, customer: license.customer,
        createdAt: license.createdAt, activatedAt: license.activatedAt, expiresAt: license.expiresAt
      });
    }

    if (license.status === "issued") {
      license.status = "active";
      license.activatedAt = new Date(now).toISOString();
      license.expiresAt = new Date(now + Number(license.planDays) * 86400000).toISOString();
      await setLicense(normalized, license);
    }

    const expiresAtMs = Date.parse(license.expiresAt || "");
    if (!Number.isFinite(expiresAtMs) || now >= expiresAtMs) {
      license.status = "expired";
      await setLicense(normalized, license);
      return json(res, 403, {
        active: false, code: "EXPIRED", message: "Key sudah expired. Silakan order key baru.",
        key: license.key, planDays: license.planDays, customer: license.customer,
        createdAt: license.createdAt, activatedAt: license.activatedAt, expiresAt: license.expiresAt,
        expiresAtUnix: Number.isFinite(expiresAtMs) ? Math.floor(expiresAtMs / 1000) : null
      });
    }

    return json(res, 200, {
      active: true, code: "ACTIVE", message: "Key aktif.",
      key: license.key, planDays: license.planDays, customer: license.customer,
      status: license.status, createdAt: license.createdAt, activatedAt: license.activatedAt,
      expiresAt: license.expiresAt, expiresAtUnix: Math.floor(expiresAtMs / 1000),
      remainingSeconds: Math.max(0, Math.floor((expiresAtMs - now) / 1000))
    });
  } catch (error) {
    console.error("validate license:", error);
    return json(res, 500, { active: false, code: "SERVER_ERROR", message: error.message || "Gagal memvalidasi key." });
  }
}
