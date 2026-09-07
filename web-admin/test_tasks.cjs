const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data, error } = await supabase.from('tasks').select('id, name, stt').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6');
  if (error) console.error('Error:', error);
  else {
    const found = data.filter(t => t.name.includes('BÊN A'));
    console.log(found);
  }
}
run();
