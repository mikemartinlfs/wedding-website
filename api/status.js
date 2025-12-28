import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const token = req.query.t;
  if(!token){
    return res.status(400).json({ error:'Missing token' });
  }

  const record = await kv.get(token);

  res.status(200).json({
    ok:true,
    submitted: !!record,
    can_edit: true,
    response: record || null
  });
}
