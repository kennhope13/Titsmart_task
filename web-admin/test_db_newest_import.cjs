const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data: p } = await supabase.from('projects').select('id, code, name').eq('id', '3f84b870-769d-4e44-a041-8ccf557ec20a');
  if (!p || p.length === 0) return console.log('Project not found');
  const code = p[0].code;
  console.log('Project Code:', code, '| Name:', p[0].name);

  const { data: tasks } = await supabase.from('tasks').select('id, stt, name, parent_id, is_section_header').eq('project_code', code);
  
  const idMap = {};
  tasks.forEach(t => idMap[t.id] = t.stt);
  
  console.log('\n--- TASKS IN DB FOR THIS NEWEST IMPORT ---');
  tasks.forEach(t => {
    const pStt = t.parent_id ? (idMap[t.parent_id] || t.parent_id.substring(0,8)) : 'ROOT';
    console.log(t.stt.padEnd(8), '| header:', String(t.is_section_header).padEnd(5), '| parent:', pStt.padEnd(8), '|', t.name.substring(0, 45));
  });
}
run();
