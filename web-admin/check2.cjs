const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data } = await supabase.from('tasks').select('id, stt, name, parent_id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6')
    .in('stt', ['A', 'B', '33', '34', '35', '36', '37']);
  
  const idMap = {};
  data.forEach(t => idMap[t.id] = t.stt);
  
  console.log('=== ALL MAIN TASKS ===');
  data.forEach(t => {
    const parentStt = t.parent_id ? (idMap[t.parent_id] || t.parent_id.substring(0,8)) : 'ROOT';
    console.log(t.stt, '| parent:', parentStt, '| id:', t.id.substring(0,8));
  });
}
run();
