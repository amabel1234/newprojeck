import { listProducts } from "../_lib/products-store.js";

export default async function handler(req, res) {
  return listProducts(req, res, { managed: true });
}
