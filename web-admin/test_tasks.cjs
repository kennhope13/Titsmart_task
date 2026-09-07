const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data, error } = await supabase.from('projects').select('code, name');
  if (error) console.error('Error:', error);
  else console.log(data.filter(p => p.name.toLowerCase().includes('đông 6') || p.name.toLowerCase().includes('dong 6')));
}
run();
