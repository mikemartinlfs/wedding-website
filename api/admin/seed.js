import { getRedis } from "../_redis.js";

export default async function handler(req, res){
  try{
    if(req.method !== "POST") return res.status(405).end();

    const key=req.headers["x-admin-key"];
    if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    const body=req.body || {};
    const invites=body.invites;
    if(!Array.isArray(invites)) return res.status(400).json({ error:"Missing invites array" });

    const redis=getRedis(true);

    let written=0;
    const skipped=[];
    const tokenIndexKey="invites:tokens";

    // pull existing token list (if any)
    const existing=await redis.get(tokenIndexKey);
    const tokenSet=new Set(Array.isArray(existing) ? existing.map(t=>String(t)) : []);

    for(const inv of invites){
      const token=String(inv?.token || "").trim();
      const name=String(inv?.name || "").trim();
      const contact=String(inv?.contact || inv?.email || "").trim();
      const has_children=!!inv?.has_children;

      const defaults=(inv?.defaults && typeof inv.defaults==="object") ? {
        attending: String(inv.defaults.attending || "").trim(),
        guest_count: String(inv.defaults.guest_count || "").trim(),
        guest_ages: String(inv.defaults.guest_ages || "").trim(),
        notes: String(inv.defaults.notes || "").trim()
      } : null;

      if(!token || !name){
        skipped.push({ token, name, reason:"missing token or name" });
        continue;
      }

      await redis.set(`invite:${token}`, { name, contact, has_children, defaults });
      tokenSet.add(token);
      written++;
    }

    // write back the token index (sorted for stability)
    await redis.set(tokenIndexKey, Array.from(tokenSet).sort());

    return res.status(200).json({ ok:true, count:written, skipped, token_index_count:tokenSet.size });
  } catch(e){
    return res.status(500).json({ error:e?.message || String(e) });
  }
}
