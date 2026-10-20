import { assertDbConfig } from "./_lib/db.js";
import { allowCors, json } from "./_lib/http.js";

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return json(res, 405, { ok: false, message: "Method not allowed." });
  try {
    assertDbConfig();
    return json(res, 200, { ok: true, service: "NIXX License API" });
  } catch (error) {
    return json(res, 503, { ok: false, message: error.message });
  }
}
