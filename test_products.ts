import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error } = await supabase.from('products').insert({ stock_quantity: 1 }).select('*');
  if (error) {
    console.error('Error products stock_quantity:', error.message);
  }
  const { error: e2 } = await supabase.from('products').insert({ stock: 1 }).select('*');
  if (e2) {
    console.error('Error products stock:', e2.message);
  }
}
test();
