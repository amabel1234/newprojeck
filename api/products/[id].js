import { deleteProduct, updateProduct } from "../_lib/products-store.js";

export default async function handler(req, res) {
  if (req.method === "PATCH") return updateProduct(req, res);
  if (req.method === "DELETE") return deleteProduct(req, res);
  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}
