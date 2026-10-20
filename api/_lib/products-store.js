import { randomUUID, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const PRODUCT_CATEGORIES = [
  "get-key",
  "vip-key",
  "license",
  "roblox-map-template",
  "ready-map",
  "ready-system",
  "script",
];

function reply(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}

function getSql(res) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    reply(res, 503, { error: "DATABASE_URL belum dikonfigurasi." });
    return null;
  }
  return neon(databaseUrl);
}

function isAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    reply(res, 503, { error: "ADMIN_TOKEN belum dikonfigurasi." });
    return false;
  }
  const authorization = req.headers.authorization || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    reply(res, 401, { error: "Token admin tidak valid." });
    return false;
  }
  return true;
}

function productDto(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    price: String(row.price),
    description: String(row.description),
    imageUrl: row.image_url == null ? null : String(row.image_url),
    orderUrl: row.order_url == null ? null : String(row.order_url),
    features: Array.isArray(row.features) ? row.features.map(String) : [],
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function getQueryValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function filterProducts(rows, { search = "", category = "", activeOnly = false } = {}) {
  const needle = search.toLowerCase();
  return rows
    .map(productDto)
    .filter((product) => !activeOnly || product.active)
    .filter((product) => !category || product.category === category)
    .filter((product) => !needle || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(needle));
}

function parseBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function cleanText(value, field, { min = 1, max, required = false } = {}) {
  if (value === undefined && !required) return { value: undefined };
  if (typeof value !== "string") return { error: `${field} harus berupa teks.` };
  const text = value.trim();
  if (text.length < min || text.length > max) {
    return { error: `${field} harus berisi ${min}–${max} karakter.` };
  }
  return { value: text };
}

function cleanUrl(value, field) {
  if (value === undefined) return { value: undefined };
  if (value === null || value === "") return { value: null };
  if (typeof value !== "string" || value.length > 2048) {
    return { error: `${field} tidak valid.` };
  }
  const text = value.trim();
  if (text.startsWith("/") && !text.startsWith("//")) return { value: text };
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:") return { error: `${field} harus memakai HTTPS atau path lokal.` };
    return { value: parsed.toString() };
  } catch {
    return { error: `${field} harus berupa URL HTTPS atau path lokal.` };
  }
}

function validateProduct(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Body harus berupa objek JSON." };
  }
  const result = {};
  for (const [key, min, max] of [
    ["name", 2, 100],
    ["price", 1, 60],
    ["description", 1, 1000],
  ]) {
    const parsed = cleanText(body[key], key, { min, max, required: !partial });
    if (parsed.error) return { error: parsed.error };
    if (parsed.value !== undefined) result[key] = parsed.value;
  }

  if (body.category !== undefined) {
    if (!PRODUCT_CATEGORIES.includes(body.category)) {
      return { error: "Kategori produk tidak valid." };
    }
    result.category = body.category;
  } else if (!partial) {
    return { error: "Kategori produk wajib dipilih." };
  }

  for (const [key, label] of [["imageUrl", "Link gambar"], ["orderUrl", "Link pemesanan"]]) {
    const parsed = cleanUrl(body[key], label);
    if (parsed.error) return { error: parsed.error };
    if (parsed.value !== undefined) result[key] = parsed.value;
  }

  if (body.features !== undefined) {
    if (!Array.isArray(body.features) || body.features.length > 20 ||
      body.features.some((item) => typeof item !== "string" || item.length > 160)) {
      return { error: "Daftar fitur tidak valid (maksimal 20 fitur, 160 karakter per fitur)." };
    }
    result.features = body.features.map((item) => item.trim()).filter(Boolean);
  } else if (!partial) {
    result.features = [];
  }

  for (const key of ["featured", "active"]) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") return { error: `${key} harus bernilai true atau false.` };
      result[key] = body[key];
    } else if (!partial) {
      result[key] = key === "active";
    }
  }
  return { value: result };
}

function handleDatabaseError(res) {
  reply(res, 500, { error: "Terjadi kesalahan saat mengakses katalog produk." });
}

export async function listProducts(req, res, { managed = false } = {}) {
  if (managed && !isAdmin(req, res)) return;
  if (req.method !== "GET") {
    reply(res, 405, { error: "Method not allowed." });
    return;
  }
  const category = getQueryValue(req.query?.category);
  const search = getQueryValue(req.query?.search);
  if (category && !PRODUCT_CATEGORIES.includes(category)) {
    reply(res, 400, { error: "Kategori produk tidak valid." });
    return;
  }
  const sql = getSql(res);
  if (!sql) return;
  try {
    const rows = await sql`
      SELECT id, name, category, price, description, image_url, order_url,
             features, featured, active, created_at, updated_at
      FROM nixx_products
      ORDER BY featured DESC, updated_at DESC
    `;
    const products = filterProducts(rows, { category, search, activeOnly: !managed });
    reply(res, 200, { products });
  } catch {
    handleDatabaseError(res);
  }
}

export async function productStats(req, res) {
  if (!isAdmin(req, res)) return;
  if (req.method !== "GET") {
    reply(res, 405, { error: "Method not allowed." });
    return;
  }
  const sql = getSql(res);
  if (!sql) return;
  try {
    const rows = await sql`SELECT category, active, featured FROM nixx_products`;
    const counts = new Map(PRODUCT_CATEGORIES.map((category) => [category, 0]));
    for (const row of rows) counts.set(row.category, (counts.get(row.category) || 0) + 1);
    reply(res, 200, {
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      featured: rows.filter((row) => row.featured).length,
      byCategory: PRODUCT_CATEGORIES.map((category) => ({ category, count: counts.get(category) || 0 })),
    });
  } catch {
    handleDatabaseError(res);
  }
}

export async function createProduct(req, res) {
  if (!isAdmin(req, res)) return;
  if (req.method !== "POST") {
    reply(res, 405, { error: "Method not allowed." });
    return;
  }
  const validated = validateProduct(parseBody(req));
  if (validated.error) {
    reply(res, 400, { error: validated.error });
    return;
  }
  const input = validated.value;
  const sql = getSql(res);
  if (!sql) return;
  try {
    const rows = await sql`
      INSERT INTO nixx_products
        (id, name, category, price, description, image_url, order_url, features, featured, active)
      VALUES
        (${randomUUID()}, ${input.name}, ${input.category}, ${input.price}, ${input.description},
         ${input.imageUrl ?? null}, ${input.orderUrl ?? null}, ${JSON.stringify(input.features)}::jsonb,
         ${input.featured}, ${input.active})
      RETURNING id, name, category, price, description, image_url, order_url,
                features, featured, active, created_at, updated_at
    `;
    reply(res, 201, { product: productDto(rows[0]) });
  } catch {
    handleDatabaseError(res);
  }
}

export async function updateProduct(req, res) {
  if (!isAdmin(req, res)) return;
  if (req.method !== "PATCH") {
    reply(res, 405, { error: "Method not allowed." });
    return;
  }
  const id = getQueryValue(req.query?.id);
  if (!id || id.length > 100) {
    reply(res, 400, { error: "ID produk tidak valid." });
    return;
  }
  const validated = validateProduct(parseBody(req), true);
  if (validated.error) {
    reply(res, 400, { error: validated.error });
    return;
  }
  const input = validated.value;
  if (Object.keys(input).length === 0) {
    reply(res, 400, { error: "Pilih minimal satu informasi untuk diperbarui." });
    return;
  }
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);
  const sql = getSql(res);
  if (!sql) return;
  try {
    const rows = await sql`
      UPDATE nixx_products SET
        name = CASE WHEN ${has("name")} THEN ${input.name ?? null} ELSE name END,
        category = CASE WHEN ${has("category")} THEN ${input.category ?? null} ELSE category END,
        price = CASE WHEN ${has("price")} THEN ${input.price ?? null} ELSE price END,
        description = CASE WHEN ${has("description")} THEN ${input.description ?? null} ELSE description END,
        image_url = CASE WHEN ${has("imageUrl")} THEN ${input.imageUrl ?? null} ELSE image_url END,
        order_url = CASE WHEN ${has("orderUrl")} THEN ${input.orderUrl ?? null} ELSE order_url END,
        features = CASE WHEN ${has("features")} THEN ${JSON.stringify(input.features ?? [])}::jsonb ELSE features END,
        featured = CASE WHEN ${has("featured")} THEN ${input.featured ?? false} ELSE featured END,
        active = CASE WHEN ${has("active")} THEN ${input.active ?? false} ELSE active END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, category, price, description, image_url, order_url,
                features, featured, active, created_at, updated_at
    `;
    if (!rows[0]) {
      reply(res, 404, { error: "Produk tidak ditemukan." });
      return;
    }
    reply(res, 200, { product: productDto(rows[0]) });
  } catch {
    handleDatabaseError(res);
  }
}

export async function deleteProduct(req, res) {
  if (!isAdmin(req, res)) return;
  if (req.method !== "DELETE") {
    reply(res, 405, { error: "Method not allowed." });
    return;
  }
  const id = getQueryValue(req.query?.id);
  if (!id || id.length > 100) {
    reply(res, 400, { error: "ID produk tidak valid." });
    return;
  }
  const sql = getSql(res);
  if (!sql) return;
  try {
    const rows = await sql`DELETE FROM nixx_products WHERE id = ${id} RETURNING id`;
    if (!rows[0]) {
      reply(res, 404, { error: "Produk tidak ditemukan." });
      return;
    }
    reply(res, 200, { ok: true });
  } catch {
    handleDatabaseError(res);
  }
}
