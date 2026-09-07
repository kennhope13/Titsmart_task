const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data, error } = await supabase.from('tasks').select('id, name, stt, parent_id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').like('stt', '33%');
  if (error) console.error('Error:', error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
