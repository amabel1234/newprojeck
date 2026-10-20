import { randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import {
  CreateProductBody,
  CreateProductResponse,
  DeleteProductParams,
  DeleteProductResponse,
  GetProductStatsResponse,
  ListManagedProductsQueryParams,
  ListManagedProductsResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
} from "@workspace/api-zod";
import { db, productsTable, type ProductRow } from "@workspace/db";

const router: IRouter = Router();

const categories = [
  "get-key",
  "vip-key",
  "license",
  "roblox-map-template",
  "ready-map",
  "ready-system",
  "script",
] as const;

function toProduct(row: ProductRow) {
  return {
    ...row,
    imageUrl: row.imageUrl ?? null,
    orderUrl: row.orderUrl ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function cleanUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  const url = new URL(normalized);
  if (url.protocol !== "https:") {
    throw new Error("Link produk harus memakai HTTPS atau path lokal.");
  }
  return url.toString();
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
  const matches =
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes);

  if (!matches) {
    res.status(401).json({ error: "Token admin tidak valid." });
    return false;
  }
  return true;
}

function productFilters(search?: string, category?: string, activeOnly = false): SQL[] {
  const filters: SQL[] = [];
  if (activeOnly) filters.push(eq(productsTable.active, true));
  if (category) filters.push(eq(productsTable.category, category));
  const normalizedSearch = search?.trim();
  if (normalizedSearch) {
    const escaped = normalizedSearch.replace(/[\\%_]/g, "\\$&");
    const pattern = `%${escaped}%`;
    const searchFilter = or(
      ilike(productsTable.name, pattern),
      ilike(productsTable.description, pattern),
      ilike(productsTable.category, pattern),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  return filters;
}

async function queryProducts(search?: string, category?: string, activeOnly = false) {
  const filters = productFilters(search, category, activeOnly);
  const rows = await db
    .select()
    .from(productsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(productsTable.featured), desc(productsTable.updatedAt));
  return rows.map(toProduct);
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const products = await queryProducts(parsed.data.search, parsed.data.category, true);
    res.json(ListProductsResponse.parse({ products }));
  } catch (err) {
    req.log.error({ err }, "Failed to list storefront products");
    res.status(500).json({ error: "Gagal memuat katalog produk." });
  }
});

router.get("/products/manage", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const parsed = ListManagedProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const products = await queryProducts(parsed.data.search);
    res.json(ListManagedProductsResponse.parse({ products }));
  } catch (err) {
    req.log.error({ err }, "Failed to list managed products");
    res.status(500).json({ error: "Gagal memuat produk admin." });
  }
});

router.get("/products/stats", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select({
        category: productsTable.category,
        active: productsTable.active,
        featured: productsTable.featured,
      })
      .from(productsTable);
    const counts = new Map<string, number>(categories.map((category) => [category, 0]));
    for (const row of rows) {
      counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    }
    const stats = {
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      featured: rows.filter((row) => row.featured).length,
      byCategory: categories.map((category) => ({
        category,
        count: counts.get(category) ?? 0,
      })),
    };
    res.json(GetProductStatsResponse.parse(stats));
  } catch (err) {
    req.log.error({ err }, "Failed to summarize products");
    res.status(500).json({ error: "Gagal memuat ringkasan katalog." });
  }
});

router.post("/products", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const input = parsed.data;
    const [row] = await db
      .insert(productsTable)
      .values({
        id: randomUUID(),
        name: input.name.trim(),
        category: input.category,
        price: input.price.trim(),
        description: input.description.trim(),
        imageUrl: cleanUrl(input.imageUrl),
        orderUrl: cleanUrl(input.orderUrl),
        features: input.features ?? [],
        featured: input.featured ?? false,
        active: input.active ?? true,
      })
      .returning();
    res.status(201).json(CreateProductResponse.parse({ product: toProduct(row) }));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Link produk")) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Gagal menambahkan produk." });
  }
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    const messages = [
      !params.success ? params.error.message : "",
      !parsed.success ? parsed.error.message : "",
    ].filter(Boolean);
    res.status(400).json({ error: messages.join("; ") || "Data produk tidak valid." });
    return;
  }
  const input = parsed.data;
  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "Pilih minimal satu informasi untuk diperbarui." });
    return;
  }
  try {
    const update: Partial<typeof productsTable.$inferInsert> = {
      ...input,
      updatedAt: new Date(),
    };
    if (Object.prototype.hasOwnProperty.call(input, "name")) {
      update.name = input.name?.trim();
    }
    if (Object.prototype.hasOwnProperty.call(input, "price")) {
      update.price = input.price?.trim();
    }
    if (Object.prototype.hasOwnProperty.call(input, "description")) {
      update.description = input.description?.trim();
    }
    if (Object.prototype.hasOwnProperty.call(input, "imageUrl")) {
      update.imageUrl = cleanUrl(input.imageUrl);
    }
    if (Object.prototype.hasOwnProperty.call(input, "orderUrl")) {
      update.orderUrl = cleanUrl(input.orderUrl);
    }

    const [row] = await db
      .update(productsTable)
      .set(update)
      .where(eq(productsTable.id, params.data.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Produk tidak ditemukan." });
      return;
    }
    res.json(UpdateProductResponse.parse({ product: toProduct(row) }));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Link produk")) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Gagal memperbarui produk." });
  }
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [row] = await db
      .delete(productsTable)
      .where(eq(productsTable.id, params.data.id))
      .returning({ id: productsTable.id });
    if (!row) {
      res.status(404).json({ error: "Produk tidak ditemukan." });
      return;
    }
    res.json(DeleteProductResponse.parse({ ok: true }));
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Gagal menghapus produk." });
  }
});

export default router;
