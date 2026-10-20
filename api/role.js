import { allowCors, json } from "./_lib/http.js";
import { requireRole } from "./_lib/auth.js";
export default async function handler(req,res){ allowCors(res); if(req.method==="OPTIONS") return res.status(204).end(); if(req.method!=="GET") return json(res,405,{message:"Method not allowed."}); const role=requireRole(req,["admin","reseller"]); if(!role) return json(res,401,{message:"Invalid token."}); return json(res,200,{role}); }
