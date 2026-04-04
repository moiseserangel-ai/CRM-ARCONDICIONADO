import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error: e1 } = await supabase.from('products').insert({ this_column_does_not_exist_at_all: 1 }).select('*');
  console.log('fake column error:', e1?.message);
}
test();
