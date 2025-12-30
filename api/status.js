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
    const redis = getRedis(false);

    const token=(req.query.t || "").trim();
    if(!token) return res.status(400).json({ error:"Missing token" });

    const invite = await redis.get(`invite:${token}`);
    if(!invite) return res.status(404).json({ error:"Invalid token" });

    const rsvp = await redis.get(`rsvp:${token}`);

    return res.status(200).json({
      ok:true,
      token,
      name: invite?.name || "",
      email: invite?.email || "",
      submitted: !!rsvp,
      can_edit: !!rsvp && canEditNow(),
      response: rsvp || null
    });
  } catch(e){
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
