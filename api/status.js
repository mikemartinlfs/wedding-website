import { getRedis } from "./_redis.js";

function canEditNow(){
  const deadline=(process.env.RSVP_EDIT_DEADLINE || "").trim();
  if(!deadline) return true;
  const d=Date.parse(deadline);
  if(Number.isNaN(d)) return true;
  return Date.now() <= d;
}

export default async function handler(req, res){
  try{
    if(req.method !== "GET") return res.status(405).end();

    const token=String(req.query?.t || "").trim();
    if(!token) return res.status(400).json({ error:"Missing token" });

    const redis=getRedis(true);

    const invite=await redis.get(`invite:${token}`);
    if(!invite) return res.status(404).json({ error:"Invalid token" });

    const rsvp=await redis.get(`rsvp:${token}`);
    const can_edit=!!rsvp && canEditNow();

    return res.status(200).json({
      token,
      name:invite.name || "",
      email:invite.email || "",
      contact:invite.contact || invite.email || "",
      has_children:!!invite.has_children,
      defaults:invite.defaults || null,
      submitted:!!rsvp,
      can_edit,
      response:rsvp || null
    });
  } catch(e){
    return res.status(500).json({ error:e?.message || String(e) });
  }
}
