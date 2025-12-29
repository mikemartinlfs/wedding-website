export default async function handler(req, res){
  res.status(200).json({
    received_admin_key: !!req.headers["x-admin-key"],
    admin_key_len: (process.env.ADMIN_KEY || "").length,
    admin_key_prefix: (process.env.ADMIN_KEY || "").slice(0, 6),
    have_url: !!process.env.UPSTASH_REDIS_REST_URL,
    have_token: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    url_prefix: (process.env.UPSTASH_REDIS_REST_URL || "").slice(0, 12),
    token_len: (process.env.UPSTASH_REDIS_REST_TOKEN || "").length,
    deadline: process.env.RSVP_EDIT_DEADLINE || null
  });
}
