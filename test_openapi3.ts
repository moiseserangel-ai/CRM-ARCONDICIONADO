import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  console.log(json);
}
test();
