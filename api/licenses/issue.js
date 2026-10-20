import crypto from "node:crypto";
import { getLicense, setLicense } from "../_lib/db.js";
import { allowCors, body, json } from "../_lib/http.js";
import { requireRole } from "../_lib/auth.js";

function makeKey() {
  const raw = crypto.randomBytes(10).toString("hex").toUpperCase();
  return `NIXX-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16)}`;
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return json(res, 405, { message: "Method not allowed." });

  const role = requireRole(req, ["admin", "reseller"]);
  if (!role) return json(res, 401, { message: "Admin/reseller authorization required." });

  try {
    const data = await body(req);
    const days = Number(data.days);
    const customer = String(data.customer || "").trim();
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return json(res, 400, { message: "days harus berupa angka 1–3650." });
    }
    if (!customer || customer.length > 100) {
      return json(res, 400, { message: "Nama/username pembeli wajib diisi (maks. 100 karakter)." });
    }

    let licenseKey;
    do {
      licenseKey = makeKey();
    } while (await getLicense(licenseKey));

    const license = {
      key: licenseKey,
      planDays: days,
      customer,
      status: "issued",
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      issuedByRole: role,
    };
    await setLicense(licenseKey, license);
    return json(res, 201, { key: licenseKey, status: license.status, planDays: days, customer, role });
  } catch (error) {
    console.error("issue license:", error);
    return json(res, 500, { message: error.message || "Gagal membuat license." });
  }
}
