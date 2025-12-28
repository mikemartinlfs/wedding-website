import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if(req.method !== 'POST'){
    return res.status(405).end();
  }

  const { token, attending, guest_count, guest_ages, notes } = req.body;
  if(!token){
    return res.status(400).json({ error:'Missing token' });
  }

  await kv.set(token, {
    attending,
    guest_count,
    guest_ages,
    notes,
    updated_at: new Date().toISOString()
  });

  res.status(200).json({ ok:true });
}
