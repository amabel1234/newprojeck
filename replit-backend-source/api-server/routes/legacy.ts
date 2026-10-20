import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const ROBLOX_ACCESS_TTL_SECONDS = 86_400;

type RedisResult = unknown;

async function redis(command: string[]): Promise<RedisResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash belum dikonfigurasi. Set UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN.");
  }

  const response = await fetch(`${url}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json().catch(() => null)) as
    | { result?: RedisResult; error?: string }
    | null;
  if (!response.ok || !data || data.error) {
    throw new Error(data?.error || `Redis HTTP ${response.status}`);
  }
  return data.result;
}

function requireAdmin(req: Request, res: Response): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({ error: "ADMIN_TOKEN belum dikonfigurasi di environment server." });
    return false;
  }
  const authorization = req.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    res.status(401).json({ error: "Token admin tidak valid." });
    return false;
  }
  return true;
}

async function resolveRobloxUsername(username: string) {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  const data = (await response.json().catch(() => null)) as {
    data?: Array<{ id?: number; name?: string; displayName?: string }>;
  } | null;
  if (!response.ok) throw new Error(`Roblox API HTTP ${response.status}`);
  const user = data?.data?.[0];
  if (!user?.id) return null;
  return {
    id: Number(user.id),
    name: String(user.name || username),
    displayName: String(user.displayName || user.name || username),
  };
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function remainingSeconds(expiresAt: number): number {
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

router.all("/license/validate", async (req, res): Promise<void> => {
  if (!["GET", "POST"].includes(req.method)) {
    res.status(405).json({
      active: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    });
    return;
  }
  try {
    const url = new URL(req.originalUrl, "http://localhost");
    const rawKey = req.method === "POST" ? req.body?.key : url.searchParams.get("key");
    const key = String(rawKey ?? "").trim().toUpperCase();
    if (!key) {
      res.status(400).json({
        active: false,
        code: "MISSING_KEY",
        message: "Key wajib diisi.",
      });
      return;
    }

    const license = parseJsonRecord(await redis(["get", `license:${key}`]));
    if (!license) {
      res.status(404).json({
        active: false,
        code: "INVALID",
        message: "Key tidak ditemukan.",
      });
      return;
    }
    const safeFields = {
      key: String(license.key || key),
      planDays: Number(license.planDays) || null,
      customer: String(license.customer || ""),
      createdAt: license.createdAt ?? null,
      activatedAt: license.activatedAt ?? null,
      expiresAt: license.expiresAt ?? null,
    };
    if (license.status === "revoked") {
      res.status(403).json({
        active: false,
        code: "REVOKED",
        status: "revoked",
        message: "Key sudah dinonaktifkan.",
        ...safeFields,
      });
      return;
    }

    const now = Date.now();
    if (license.status === "issued") {
      const planDays = Number(license.planDays);
      if (!Number.isFinite(planDays) || planDays < 1 || planDays > 3650) {
        res.status(500).json({
          active: false,
          code: "SERVER_ERROR",
          message: "Data masa aktif key tidak valid.",
        });
        return;
      }
      license.status = "active";
      license.activatedAt = new Date(now).toISOString();
      license.expiresAt = new Date(now + planDays * 86_400_000).toISOString();
      await redis(["set", `license:${key}`, JSON.stringify(license)]);
    }

    const expiry = Date.parse(String(license.expiresAt || ""));
    if (!Number.isFinite(expiry) || now >= expiry) {
      license.status = "expired";
      await redis(["set", `license:${key}`, JSON.stringify(license)]);
      res.status(403).json({
        active: false,
        code: "EXPIRED",
        status: "expired",
        message: "Key sudah expired. Silakan order key baru.",
        ...safeFields,
        activatedAt: license.activatedAt ?? null,
        expiresAt: license.expiresAt ?? null,
        expiresAtUnix: Number.isFinite(expiry) ? Math.floor(expiry / 1000) : null,
      });
      return;
    }

    res.json({
      active: true,
      code: "ACTIVE",
      message: "Key aktif.",
      ...safeFields,
      status: license.status,
      activatedAt: license.activatedAt ?? null,
      expiresAt: license.expiresAt ?? null,
      expiresAtUnix: Math.floor(expiry / 1000),
      remainingSeconds: Math.max(0, Math.floor((expiry - now) / 1000)),
    });
  } catch (err) {
    req.log.error({ err }, "Legacy license validation failed");
    res.status(503).json({
      active: false,
      code: "SERVER_ERROR",
      message: "Layanan lisensi belum tersedia. Periksa konfigurasi database.",
    });
  }
});

router.all("/roblox/access", async (req, res): Promise<void> => {
  if (!["GET", "POST"].includes(req.method)) {
    res.status(405).json({
      active: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    });
    return;
  }
  try {
    const url = new URL(req.originalUrl, "http://localhost");
    const rawUsername = req.method === "POST"
      ? req.body?.username
      : url.searchParams.get("username");
    const username = String(rawUsername ?? "").trim();
    if (!username) {
      res.status(400).json({
        active: false,
        code: "MISSING_USERNAME",
        message: "Username Roblox wajib diisi.",
      });
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      res.status(400).json({
        active: false,
        code: "INVALID_USERNAME",
        message: "Username Roblox tidak valid.",
      });
      return;
    }

    const roblox = await resolveRobloxUsername(username);
    if (!roblox) {
      res.status(404).json({
        active: false,
        code: "ROBLOX_USER_NOT_FOUND",
        message: "Username Roblox tidak ditemukan.",
      });
      return;
    }

    const key = `roblox_access:${roblox.id}`;
    const now = Date.now();
    const current = parseJsonRecord(await redis(["get", key]));
    const existingExpiry = Number(current?.expiresAt);
    if (current && Number.isFinite(existingExpiry) && existingExpiry > now) {
      res.json({
        active: true,
        code: "ALREADY_ACTIVE",
        message: "Akses Roblox masih aktif.",
        username: current.username || roblox.name,
        displayName: current.displayName || roblox.displayName,
        userId: roblox.id,
        activatedAt: current.activatedAt,
        expiresAt: new Date(existingExpiry).toISOString(),
        expiresAtUnix: Math.floor(existingExpiry / 1000),
        remainingSeconds: remainingSeconds(existingExpiry),
      });
      return;
    }

    const record = {
      username: roblox.name,
      displayName: roblox.displayName,
      userId: roblox.id,
      activatedAt: new Date(now).toISOString(),
      expiresAt: now + ROBLOX_ACCESS_TTL_SECONDS * 1000,
    };
    const result = await redis([
      "set",
      key,
      JSON.stringify(record),
      "EX",
      String(ROBLOX_ACCESS_TTL_SECONDS),
      "NX",
    ]);
    if (result !== "OK") {
      const locked = parseJsonRecord(await redis(["get", key]));
      const lockedExpiry = Number(locked?.expiresAt);
      if (locked && Number.isFinite(lockedExpiry)) {
        res.json({
          active: true,
          code: "ALREADY_ACTIVE",
          message: "Akses Roblox masih aktif.",
          username: locked.username || roblox.name,
          displayName: locked.displayName || roblox.displayName,
          userId: roblox.id,
          activatedAt: locked.activatedAt ?? null,
          expiresAt: new Date(lockedExpiry).toISOString(),
          expiresAtUnix: Math.floor(lockedExpiry / 1000),
          remainingSeconds: remainingSeconds(lockedExpiry),
        });
        return;
      }
    }
    res.json({
      active: true,
      code: "ACTIVATED",
      message: "Akses Roblox aktif selama 24 jam.",
      username: roblox.name,
      displayName: roblox.displayName,
      userId: roblox.id,
      activatedAt: record.activatedAt,
      expiresAt: new Date(record.expiresAt).toISOString(),
      expiresAtUnix: Math.floor(record.expiresAt / 1000),
      remainingSeconds: ROBLOX_ACCESS_TTL_SECONDS,
    });
  } catch (err) {
    req.log.error({ err }, "Legacy Roblox access failed");
    res.status(503).json({
      active: false,
      code: "SERVER_ERROR",
      message: "Layanan akses Roblox belum tersedia. Periksa konfigurasi database.",
    });
  }
});

router.all("/announcement", async (req, res): Promise<void> => {
  if (req.method === "GET") {
    try {
      const raw = await redis(["get", "site:announcement"]);
      const announcement = raw
        ? parseJsonRecord(raw) ?? { enabled: false, text: "", type: "info" }
        : { enabled: false, text: "", type: "info" };
      res.json({ announcement });
    } catch (err) {
      req.log.error({ err }, "Legacy announcement fetch failed");
      res.status(503).json({ error: "Layanan pengumuman belum dikonfigurasi." });
    }
    return;
  }

  if (!["POST", "PUT"].includes(req.method)) {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!requireAdmin(req, res)) return;
  try {
    const text = String(req.body?.text ?? "").trim().slice(0, 300);
    const kind = ["info", "success", "warning", "danger"].includes(req.body?.type)
      ? req.body.type
      : "info";
    const announcement = {
      enabled: Boolean(req.body?.enabled),
      text,
      type: kind,
      updatedAt: new Date().toISOString(),
    };
    await redis(["set", "site:announcement", JSON.stringify(announcement)]);
    res.json({ ok: true, announcement });
  } catch (err) {
    req.log.error({ err }, "Legacy announcement update failed");
    res.status(503).json({ error: "Gagal menyimpan pengumuman." });
  }
});

router.get("/scripts", async (req, res): Promise<void> => {
  try {
    const raw = await redis(["get", "site:scripts"]);
    const list = raw
      ? Array.isArray(raw)
        ? raw
        : JSON.parse(String(raw))
      : [];
    if (!Array.isArray(list)) {
      res.status(500).json({ ok: false, message: "Format katalog script tidak valid." });
      return;
    }
    const baseUrl = (process.env.PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    const scripts = list
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) => {
        const id = encodeURIComponent(String(item.id || ""));
        return {
          ...item,
          scriptUrl: item.scriptPath || item.scriptUrl
            ? `${baseUrl}/api/scripts-file?id=${id}&type=script`
            : "",
          imageUrl: item.imagePath || item.imageUrl
            ? `${baseUrl}/api/scripts-file?id=${id}&type=image`
            : "",
        };
      });
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, scripts });
  } catch (err) {
    req.log.error({ err }, "Legacy script catalog fetch failed");
    res.status(503).json({ ok: false, message: "Katalog script lama belum dikonfigurasi." });
  }
});

export default router;
