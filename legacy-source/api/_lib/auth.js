export function getRole(req) {
  const supplied = String(req.headers.authorization || "");
  const admin = process.env.ADMIN_TOKEN;
  const reseller = process.env.RESELLER_TOKEN;
  if (admin && supplied === `Bearer ${admin}`) return "admin";
  if (reseller && supplied === `Bearer ${reseller}`) return "reseller";
  return null;
}

export function requireRole(req, allowed = ["admin"]) {
  const role = getRole(req);
  return role && allowed.includes(role) ? role : null;
}
