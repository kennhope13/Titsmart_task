const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data: projs } = await supabase.from('projects').select('id, code, name, manager_name');
  for (const p of projs) {
    if (p.code !== 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6') {
      await supabase.from('projects').update({ manager_name: 'Chưa phân công' }).eq('id', p.id);
      console.log('Reset manager_name for', p.name);
    }
  }
}
run();
