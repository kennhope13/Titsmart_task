const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data: aTask } = await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'A').single();
  const { data: bTask } = await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'B').single();

  if (aTask) {
    await supabase.from('tasks').update({ parent_id: aTask.id }).in('stt', ['33', '34', '35']).eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6');
  }
  if (bTask) {
    await supabase.from('tasks').update({ parent_id: bTask.id }).in('stt', ['36', '37']).eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6');
  }
}
run();
