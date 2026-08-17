import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/Titsmart_task/web-admin/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const tables = ['material_plans', 'purchasing_plans', 'tasks', 'projects'];
  const schema = {};
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (data && data.length > 0) {
      schema[t] = Object.keys(data[0]);
    } else {
      schema[t] = error ? error.message : "Empty table";
    }
  }
  
  fs.writeFileSync('schema-compare.json', JSON.stringify(schema, null, 2));
  console.log('Saved to schema-compare.json');
  process.exit(0);
}

checkSchema();
