const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL = 86400;

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").end(JSON.stringify(data));
}

async function redis(command) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis belum dikonfigurasi.");
  const response = await fetch(`${REDIS_URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) throw new Error(data?.error || `Redis HTTP ${response.status}`);
  return data.result;
}

async function resolveRobloxUsername(username) {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Roblox API HTTP ${response.status}`);
  const user = data?.data?.[0];
  if (!user?.id) return null;
  return { id: Number(user.id), name: String(user.name || username), displayName: String(user.displayName || user.name || username) };
}

function remaining(expiresAt) {
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

export default async function handler(req, res) {
  if (!["POST", "GET"].includes(req.method)) return json(res, 405, { active:false, code:"METHOD_NOT_ALLOWED", message:"Method not allowed." });
  try {
    let username = "";
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      username = String(body.username || "").trim();
    } else {
      const url = new URL(req.url || "", `https://${req.headers.host || "localhost"}`);
      username = String(url.searchParams.get("username") || "").trim();
    }
    if (!username) return json(res, 400, { active:false, code:"MISSING_USERNAME", message:"Username Roblox wajib diisi." });
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return json(res, 400, { active:false, code:"INVALID_USERNAME", message:"Username Roblox tidak valid." });

    const roblox = await resolveRobloxUsername(username);
    if (!roblox) return json(res, 404, { active:false, code:"ROBLOX_USER_NOT_FOUND", message:"Username Roblox tidak ditemukan." });

    const key = `roblox_access:${roblox.id}`;
    const now = Date.now();
    const current = await redis(["get", key]);
    if (current) {
      let record = null;
      try { record = typeof current === "string" ? JSON.parse(current) : current; } catch (_) {}
      if (record?.expiresAt && Number(record.expiresAt) > now) {
        return json(res, 200, {
          active: true, code: "ALREADY_ACTIVE", message: "Akses Roblox masih aktif.",
          username: record.username || roblox.name, displayName: record.displayName || roblox.displayName,
          userId: roblox.id, activatedAt: record.activatedAt, expiresAt: new Date(Number(record.expiresAt)).toISOString(),
          expiresAtUnix: Math.floor(Number(record.expiresAt)/1000), remainingSeconds: remaining(Number(record.expiresAt))
        });
      }
    }

    const record = { username: roblox.name, displayName: roblox.displayName, userId: roblox.id, activatedAt: new Date(now).toISOString(), expiresAt: now + TTL * 1000 };
    const result = await redis(["set", key, JSON.stringify(record), "EX", String(TTL), "NX"]);
    if (result !== "OK") {
      const locked = await redis(["get", key]);
      let data = null; try { data = typeof locked === "string" ? JSON.parse(locked) : locked; } catch (_) {}
      if (data?.expiresAt) return json(res, 200, { active:true, code:"ALREADY_ACTIVE", message:"Akses Roblox masih aktif.", username:data.username||roblox.name, displayName:data.displayName||roblox.displayName, userId:roblox.id, activatedAt:data.activatedAt, expiresAt:new Date(Number(data.expiresAt)).toISOString(), expiresAtUnix:Math.floor(Number(data.expiresAt)/1000), remainingSeconds:remaining(Number(data.expiresAt)) });
    }

    return json(res, 200, {
      active:true, code:"ACTIVATED", message:"Akses Roblox aktif selama 24 jam.",
      username:roblox.name, displayName:roblox.displayName, userId:roblox.id,
      activatedAt:record.activatedAt, expiresAt:new Date(record.expiresAt).toISOString(),
      expiresAtUnix:Math.floor(record.expiresAt/1000), remainingSeconds:TTL
    });
  } catch (error) {
    console.error("roblox access:", error);
    return json(res, 500, { active:false, code:"SERVER_ERROR", message:error.message || "Gagal memproses akses Roblox." });
  }
}
