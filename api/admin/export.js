import { getRedis } from "../_redis.js";

export default async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).end();

    const key=req.headers["x-admin-key"];
    if(!key||key!==process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    const redis=getRedis(true);

    const tokens=await redis.smembers("invites:tokens") || [];
    tokens.sort();

    if(tokens.length===0){
      return res.status(200).json({ ok:true, tokens:[], rows:[] });
    }

    // Fetch invites + rsvps
    const inviteKeys=tokens.map(t=>`invite:${t}`);
    const rsvpKeys=tokens.map(t=>`rsvp:${t}`);

    const invites=await redis.mget(inviteKeys);
    const rsvps=await redis.mget(rsvpKeys);

    const rows=tokens.map((t,i)=>({
      token:t,
      invite:invites?.[i]||null,
      rsvp:rsvps?.[i]||null,
      submitted:!!rsvps?.[i]
    }));

    return res.status(200).json({ ok:true, count:rows.length, rows });
  } catch(e){
    return res.status(500).json({ error:e?.message||String(e) });
  }
}
