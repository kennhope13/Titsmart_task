import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('expenses').select('*');
  console.log("Expenses count:", data?.length);
  const bacNinhData = data?.filter(e => e.project_code === 'TRẠM BIẾN ÁP 500KV BẮC NINH' || e.project_code === 'BẮC NINH');
  console.log("Bac Ninh data:", bacNinhData);
  console.log("Error:", error);
}
test();
