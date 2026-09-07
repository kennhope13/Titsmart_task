const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const code = 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6';
  const { data: tasks } = await supabase.from('tasks').select('id, stt').eq('project_code', code);
  const map = {};
  tasks.forEach(t => map[t.stt] = t.id);

  const idA = map['A'];
  const idB = map['B'];

  if (idA) {
    await supabase.from('tasks').update({ parent_id: idA }).in('stt', ['33', '34', '35']).eq('project_code', code);
  }
  if (idB) {
    await supabase.from('tasks').update({ parent_id: idB }).in('stt', ['36', '37']).eq('project_code', code);
  }
  console.log('Fixed DB for current user project');
}
run();
