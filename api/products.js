import { createProduct, listProducts } from "./_lib/products-store.js";

export default async function handler(req, res) {
  if (req.method === "GET") return listProducts(req, res);
  if (req.method === "POST") return createProduct(req, res);
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
