import { getRedis } from "./_redis.js";

export default async function handler(req, res){
  try{
    const redis = getRedis(true);

    const token=(req.query.t || "").trim();
    if(!token) return res.status(400).json({ error:"Missing token" });

    await redis.incr(`open_count:${token}`);
    await redis.set(`last_open:${token}`, new Date().toISOString());

    return res.status(200).json({ ok:true });
  } catch(e){
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
