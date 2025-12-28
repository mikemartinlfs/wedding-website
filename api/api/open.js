import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const token = req.query.t;
  if(!token){
    return res.status(400).json({ error:'Missing token' });
  }

  const opens = await kv.get(`opens:${token}`) || 0;
  await kv.set(`opens:${token}`, opens + 1);

  res.status(200).json({ ok:true });
}
