import { allowCors, json } from "../_lib/http.js";
import { requireRole } from "../_lib/auth.js";

async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) throw new Error("Database belum dikonfigurasi.");

  const response = await fetch(
    `${url}/${command.map(encodeURIComponent).join("/")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    throw new Error(data?.error || `Redis HTTP ${response.status}`);
  }
  return data.result;
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return json(res, 405, { message: "Method not allowed." });
  }

  const role = requireRole(req, ["admin", "reseller"]);
  if (!role) return json(res, 401, { message: "Admin/reseller authorization required." });

  try {
    const licenses = [];
    let cursor = "0";

    do {
      const result = await redis([
        "scan", cursor, "match", "license:*", "count", "100"
      ]);

      if (!Array.isArray(result) || result.length < 2) {
        throw new Error("Format response Redis tidak valid.");
      }

      cursor = String(result[0]);
      const keys = Array.isArray(result[1]) ? result[1] : [];

      for (const redisKey of keys) {
        const raw = await redis(["get", redisKey]);
        if (raw == null) continue;

        try {
          const license = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (license && typeof license === "object" && (role === "admin" || license.issuedByRole === "reseller")) {
            licenses.push(license);
          }
        } catch {
          // Lewati data rusak.
        }
      }
    } while (cursor !== "0");

    licenses.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );

    return json(res, 200, { licenses });
  } catch (error) {
    console.error("list licenses:", error);
    return json(res, 500, {
      message: error.message || "Gagal mengambil daftar key."
    });
  }
}
