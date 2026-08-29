import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { count, error } = await supabase.from('expenses').select('*', { count: 'exact', head: true });
  console.log("Expenses exact count:", count, error);
}
test();
