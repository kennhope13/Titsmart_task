import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: 'd:/Titsmart_task/web-admin/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function dump() {
  const { data: p } = await supabase.from('tasks').select('*').limit(200);
  fs.writeFileSync('dump-tasks.json', JSON.stringify({ tasks: p }, null, 2));
}
dump();
