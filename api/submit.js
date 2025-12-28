import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function canEditNow(){
  const deadline=(process.env.RSVP_EDIT_DEADLINE || "").trim();
  if(!deadline) return true;
  const d=Date.parse(deadline);
  if(Number.isNaN(d)) return true;
  return Date.now() <= d;
}

export default async function handler(req, res){
  if(req.method !== "POST") return res.status(405).end();

  const body = req.body || {};
  const token=(body.token || "").trim();
  if(!token) return res.status(400).json({ error:"Missing token" });

  const invite = await redis.get(`invite:${token}`);
  if(!invite) return res.status(404).json({ error:"Invalid token" });

  const existing = await redis.get(`rsvp:${token}`);
  if(existing && !canEditNow()) return res.status(403).json({ error:"Edits are closed." });

  const payload = {
    attending: String(body.attending || "").trim(),
    guest_count: String(body.guest_count || "").trim(),
    guest_ages: String(body.guest_ages || "").trim(),
    notes: String(body.notes || "").trim(),
    updated_at: new Date().toISOString()
  };

  await redis.set(`rsvp:${token}`, payload);
  await redis.set(`submitted_at:${token}`, new Date().toISOString());

  return res.status(200).json({ ok:true });
}
