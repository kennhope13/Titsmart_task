import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: 'd:/Titsmart_task/web-admin/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function dump() {
  const { data: pur, error: e1 } = await supabase.from('purchasing_plans').select('*').order('created_at', { ascending: false }).limit(20);
  const { data: mat, error: e2 } = await supabase.from('material_plans').select('*').order('created_at', { ascending: false }).limit(20);
  
  const dumpFile = path.resolve('dump.json');
  fs.writeFileSync(dumpFile, JSON.stringify({
    purchasing: pur,
    material: mat,
    purError: e1,
    matError: e2
  }, null, 2));
  
  console.log("Dumped to", dumpFile);
  process.exit(0);
}

dump();
