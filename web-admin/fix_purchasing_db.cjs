const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const code = 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6';
  const { data: purs } = await supabase.from('purchasing_plans').select('id, stt, content, parent_id, notes').eq('project_code', code);
  
  const map = {};
  purs.forEach(p => map[p.stt] = p.id);
  const idA = map['A'];
  const idB = map['B'];

  console.log('\n--- PURCHASING PLANS BEFORE FIX ---');
  purs.filter(p => ['A', 'B', '33', '34', '35', '36', '37'].includes(p.stt)).forEach(p => {
    console.log(p.stt.padEnd(6), '| parent:', p.parent_id || 'ROOT', '| notes:', (p.notes || '').substring(0, 20));
  });

  if (idA) {
    await supabase.from('purchasing_plans').update({ parent_id: idA }).in('stt', ['33', '34', '35']).eq('project_code', code);
    await supabase.from('material_plans').update({ parent_id: idA }).in('stt', ['33', '34', '35']).eq('project_code', code);
  }
  if (idB) {
    await supabase.from('purchasing_plans').update({ parent_id: idB }).in('stt', ['36', '37']).eq('project_code', code);
    await supabase.from('material_plans').update({ parent_id: idB }).in('stt', ['36', '37']).eq('project_code', code);
  }

  console.log('\n--- PURCHASING/MATERIAL PLANS UPDATED FOR DB ---');
}
run();
