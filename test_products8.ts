import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error: e1 } = await supabase.from('products').select('stock_quantity').limit(1);
  console.log('stock_quantity select error:', e1?.message);
  
  const { error: e2 } = await supabase.from('products').select('stock').limit(1);
  console.log('stock select error:', e2?.message);
}
test();
