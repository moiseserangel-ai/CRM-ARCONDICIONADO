import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/notifications';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY!,
      'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ title: 'test', type: 'system', user_id: '123e4567-e89b-12d3-a456-426614174000' })
  });
  const text = await res.text();
  console.log('Response:', text);
}
test();
