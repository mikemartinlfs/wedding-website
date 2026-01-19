import { getRedis } from "../_redis.js";

export default async function handler(req, res){
  try{
    if(req.method !== "GET") return res.status(405).end();

    const key=req.headers["x-admin-key"];
    if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    const redis=getRedis(true);

    // tokens index must be a SET
    let tokens=[];
    try{
      tokens=await redis.smembers("invites:tokens");
    } catch(e){
      // If it's still the wrong type, give a clean error
      return res.status(500).json({
        error:`Export failed reading invites:tokens. ${e?.message || String(e)}`
      });
    }

    tokens=(tokens || []).map(t=>String(t)).filter(Boolean).sort();

    if(tokens.length===0){
      return res.status(200).json({ ok:true, tokens:[], rows:[] });
    }

    // Pipeline to fetch everything quickly
    const pipe=redis.pipeline();

    for(const t of tokens){
      pipe.get(`invite:${t}`);
      pipe.get(`rsvp:${t}`);
      pipe.get(`submitted_at:${t}`);
      pipe.get(`last_open:${t}`);
      pipe.get(`open_count:${t}`);
    }

    const out=await pipe.exec();

    // out is an array of results in the order queued
    const rows=[];
    for(let i=0;i<tokens.length;i++){
      const t=tokens[i];
      const base=i*5;

      const invite=out[base]?.result || null;
      const rsvp=out[base+1]?.result || null;
      const submitted_at=out[base+2]?.result || "";
      const last_open=out[base+3]?.result || "";
      const open_count=out[base+4]?.result ?? "";

      rows.push({
        token:t,
        name:invite?.name || "",
        contact:invite?.contact || invite?.email || "",
        has_children:!!invite?.has_children,

        submitted:!!rsvp,
        attending:rsvp?.attending || "",
        guest_count:rsvp?.guest_count || "",
        guest_ages:rsvp?.guest_ages || "",
        notes:rsvp?.notes || "",
        updated_at:rsvp?.updated_at || "",

        submitted_at:submitted_at || "",
        last_open:last_open || "",
        open_count:String(open_count ?? "")
      });
    }

    return res.status(200).json({ ok:true, tokens, rows });
  } catch(e){
    return res.status(500).json({ error:e?.message || String(e) });
  }
}
