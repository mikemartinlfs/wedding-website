export default async function handler(req, res){
  const key=req.headers["x-admin-key"];
  if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

  res.status(200).json({
    have_admin_key: !!process.env.ADMIN_KEY,
    have_url: !!process.env.UPSTASH_REDIS_REST_URL,
    have_token: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    url_prefix: (process.env.UPSTASH_REDIS_REST_URL || "").slice(0, 12),
    token_len: (process.env.UPSTASH_REDIS_REST_TOKEN || "").length,
    deadline: process.env.RSVP_EDIT_DEADLINE || null
  });
}
