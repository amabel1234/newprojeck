import { productStats } from "../_lib/products-store.js";

export default async function handler(req, res) {
  return productStats(req, res);
}
