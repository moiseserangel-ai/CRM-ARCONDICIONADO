import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Try to insert a record, maybe it fails with RLS but we can see the error
  const { data, error } = await supabase.from('notifications').insert({ title: 'test', type: 'system' }).select('*');
  console.log('data:', data);
  console.log('error:', error?.message);
}
test();
