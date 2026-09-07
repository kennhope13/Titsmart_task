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
    const { error: e1 } = await supabase.from('tasks').update({ parent_id: idA }).in('stt', ['33', '34', '35']).eq('project_code', code);
    console.log('Update 33,34,35 -> A:', e1 || 'OK');
  }
  if (idB) {
    const { error: e2 } = await supabase.from('tasks').update({ parent_id: idB }).in('stt', ['36', '37']).eq('project_code', code);
    console.log('Update 36,37 -> B:', e2 || 'OK');
  }
}
run();
