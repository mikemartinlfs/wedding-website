import { getRedis } from "../_redis.js";

export default async function handler(req, res){
  try{
    if(req.method !== "POST") return res.status(405).end();

    const key=req.headers["x-admin-key"];
    if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    const redis=getRedis(true);
    const indexKey="invites:tokens";

    // Detect current type (Upstash supports TYPE)
    let beforeType="";
    try{
      beforeType=await redis.type(indexKey);
    } catch(e){
      beforeType="unknown";
    }

    // Blow it away no matter what it is
    await redis.del(indexKey);

    // We need the list of tokens. If you pass them in, we rebuild from that.
    const body=req.body || {};
    const tokens=Array.isArray(body.tokens) ? body.tokens.map(t=>String(t||"").trim()).filter(Boolean) : [];
    if(tokens.length===0) return res.status(400).json({ error:"Missing tokens[] in body" });

    await redis.sadd(indexKey, ...tokens);

    let afterType="";
    try{
      afterType=await redis.type(indexKey);
    } catch(e){
      afterType="unknown";
    }

    return res.status(200).json({ ok:true, beforeType, afterType, count:tokens.length });
  } catch(e){
    return res.status(500).json({ error:e?.message || String(e) });
  }
}
