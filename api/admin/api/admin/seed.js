import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res){
  if(req.method !== "POST") return res.status(405).end();

  const key = req.headers["x-admin-key"];
  if(!key || key !== process.env.ADMIN_KEY){
    return res.status(401).json({ error:"Unauthorized" });
  }

  const body = req.body || {};
  const invites = body.invites;
  if(!Array.isArray(invites)){
    return res.status(400).json({ error:"Missing invites array" });
  }

  for(const inv of invites){
    if(!inv.token || !inv.name || !inv.email) continue;
    await redis.set(`invite:${inv.token}`, { name:inv.name, email:inv.email });
  }

  res.status(200).json({ ok:true, count:invites.length });
}
