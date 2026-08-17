import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/Titsmart_task/web-admin/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('purchasing_plans').select('*').limit(1);
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("KEYS:", Object.keys(data[0] || {}));
  }
  process.exit(0);
}
test();
