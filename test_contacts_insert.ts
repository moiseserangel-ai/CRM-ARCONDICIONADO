import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('contacts').insert({ name: 'test', userId: '123e4567-e89b-12d3-a456-426614174000' }).select('*');
  console.log('error:', error?.message);
}
test();
