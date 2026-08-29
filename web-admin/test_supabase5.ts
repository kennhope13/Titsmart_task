import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const start = Date.now();
  const { data, error } = await supabase.from('expenses').select('*').eq('project_code', 'TRAM_BIEN_AP_500KV_BAC_NINH');
  console.log("Time taken:", Date.now() - start, "ms");
  console.log("Expenses for Bac Ninh:", data?.length, error);
}
test();
