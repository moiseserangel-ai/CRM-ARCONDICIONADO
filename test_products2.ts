import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error: e1 } = await supabase.from('products').insert({ stock_quantity: 1 }).select('*');
  console.log('stock_quantity error:', e1?.message);
  
  const { error: e2 } = await supabase.from('products').insert({ stock: 1 }).select('*');
  console.log('stock error:', e2?.message);
  
  const { error: e3 } = await supabase.from('products').insert({ unit: 'un' }).select('*');
  console.log('unit error:', e3?.message);
}
test();
