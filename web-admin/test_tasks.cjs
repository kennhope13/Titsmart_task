const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data, error } = await supabase.from('projects').select('code, name').order('created_at', { ascending: false }).limit(2);
  if (error) console.error('Error:', error);
  else console.log(data);
}
run();
