const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  // Check all tasks with stt=34
  const { data: all34 } = await supabase.from('tasks').select('id, stt, name, parent_id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '34');
  console.log('All 34:', all34);

  // Check all tasks with stt=A
  const { data: allA } = await supabase.from('tasks').select('id, stt, name, parent_id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'A');
  console.log('All A:', allA);

  // Delete test duplicates - keep the ones with real names
  for (const t of all34) {
    if (t.name === '34') {
      console.log('Deleting test 34:', t.id);
      await supabase.from('tasks').delete().eq('id', t.id);
    }
  }
  for (const t of allA) {
    if (t.name === 'A') {
      console.log('Deleting test A:', t.id);
      await supabase.from('tasks').delete().eq('id', t.id);
    }
  }

  // Fix the real 34 to have proper name and parent
  const { data: real34 } = await supabase.from('tasks').select('id, name, parent_id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '34');
  console.log('Real 34 after cleanup:', real34);

  // Get real A id
  const { data: realA } = await supabase.from('tasks').select('id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'A');
  console.log('Real A after cleanup:', realA);

  // Make sure 34's parent is A
  if (real34 && real34.length > 0 && realA && realA.length > 0) {
    await supabase.from('tasks').update({ parent_id: realA[0].id }).eq('id', real34[0].id);
    console.log('34 parent updated to A');
  }
}
run();
