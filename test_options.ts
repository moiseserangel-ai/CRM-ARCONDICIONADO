import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/notifications';
  const res = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      'apikey': process.env.VITE_SUPABASE_ANON_KEY!
    }
  });
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('Body:', text);
}
test();
