import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // if available

if (!supabaseKey) {
  console.log('No service role key');
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function test() {
    const { data, error } = await supabase.from('products').select('*');
    console.log('all products:', data);
  }
  test();
}
