import { getRedis } from "../_redis.js";

export default async function handler(req, res){
  try{
    if(req.method !== "POST") return res.status(405).end();

    const key=req.headers["x-admin-key"];
    if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    const redis = getRedis(true);

    const body=req.body || {};
    const invites=body.invites;
    if(!Array.isArray(invites)) return res.status(400).json({ error:"Missing invites array" });

    let written=0;

    for(const inv of invites){
      const token=String(inv?.token || "").trim();
      const name=String(inv?.name || "").trim();
      const contact=String(inv?.contact || "").trim();
      if(!token || !name || !contact) continue;

      await redis.set(`invite:${token}`, { name, contact });
      written++;
    }

    return res.status(200).json({ ok:true, count:written });
  } catch(e){
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
