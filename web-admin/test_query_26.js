import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'REPLACE_ME';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_ME';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('material_plans').select('stt, job_content').like('stt', '26%').order('stt');
  console.log('Error:', error);
  console.log('Data:', data);
}

check();
