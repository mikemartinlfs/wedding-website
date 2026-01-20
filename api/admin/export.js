import { getRedis } from "../_redis.js";

export default async function handler(req, res){
  try{
    if(req.method !== "GET") return res.status(405).end();

    const key=req.headers["x-admin-key"];
    if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    const redis=getRedis(true);

    // tokens live in a SET (seed.js rebuilds this)
    const tokens=await redis.smembers("invites:tokens");

    const rows=[];
    for(const token of tokens){
      const invite=await redis.get(`invite:${token}`);
      const rsvp=await redis.get(`rsvp:${token}`);

      const submittedAt=await redis.get(`submitted_at:${token}`);
      const lastOpen=await redis.get(`last_open:${token}`);
      const openCount=await redis.get(`open_count:${token}`);

      rows.push({
        token,

        name:invite?.name || "",
        contact:invite?.contact || invite?.email || "",
        has_children:!!invite?.has_children,

        submitted:!!rsvp,
        attending:rsvp?.attending || "",
        guest_count:rsvp?.guest_count || "",
        guest_ages:rsvp?.guest_ages || "",
        notes:rsvp?.notes || "",
        updated_at:rsvp?.updated_at || "",

        submitted_at:submittedAt || "",
        last_open:lastOpen || "",
        open_count:openCount || ""
      });
    }

    // Stable ordering
    rows.sort((a,b)=>String(a.token).localeCompare(String(b.token)));

    return res.status(200).json({ ok:true, tokens, rows });
  } catch(e){
    return res.status(500).json({ error:e?.message || String(e) });
  }
}
