import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: projects, error: pError } = await supabase.from('projects').select('code, name');
  console.log("Projects:", projects?.length, pError);
}
test();
