export default async function handler(req, res){
  const key=req.headers["x-admin-key"];
  if(!key || key !== process.env.ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

  res.status(200).json({
    have_admin_key: !!process.env.ADMIN_KEY,
    have_deadline: !!process.env.RSVP_EDIT_DEADLINE,
    have_kv_url: !!process.env.KV_URL,
    have_kv_rest_url: !!process.env.KV_REST_API_URL,
    have_kv_rest_token: !!process.env.KV_REST_API_TOKEN,
    have_kv_ro_token: !!process.env.KV_REST_API_READ_ONLY_TOKEN,
    have_redis_url: !!process.env.REDIS_URL
  });
}
