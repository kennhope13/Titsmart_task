const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data: p } = await supabase.from('projects').select('id, code, name').order('created_at', { ascending: false }).limit(1);
  console.log('Project:', p);
  if (p && p.length > 0) {
    const code = p[0].code;
    const { data: tasks } = await supabase.from('tasks').select('id, stt, name, parent_id, is_section_header').eq('project_code', code);
    console.log('\n--- TASKS (' + tasks.length + ') ---');
    tasks.forEach(t => console.log(t.stt.padEnd(6), '| header:', String(t.is_section_header).padEnd(5), '| parent:', (t.parent_id || 'ROOT').substring(0,8), '|', t.name.substring(0, 40)));

    const { data: mats } = await supabase.from('material_plans').select('id, stt, job_content, parent_id, notes').eq('project_code', code);
    console.log('\n--- MATERIAL PLANS (' + (mats?.length || 0) + ') ---');
    mats?.forEach(m => console.log((m.stt || '').padEnd(6), '| notes:', (m.notes || '').substring(0,15).padEnd(15), '| parent:', (m.parent_id || 'ROOT').substring(0,8), '|', m.job_content.substring(0, 40)));

    const { data: purs } = await supabase.from('purchasing_plans').select('id, stt, content, parent_id, notes').eq('project_code', code);
    console.log('\n--- PURCHASING PLANS (' + (purs?.length || 0) + ') ---');
    purs?.forEach(m => console.log((m.stt || '').padEnd(6), '| notes:', (m.notes || '').substring(0,15).padEnd(15), '| parent:', (m.parent_id || 'ROOT').substring(0,8), '|', m.content.substring(0, 40)));
  }
}
run();
