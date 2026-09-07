const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');
async function run() {
  const { data, error } = await supabase.from('engineers').select('name,username,role,project_codes').eq('username', 'tuyet').single();
  console.log(JSON.stringify(data, null, 2));
}
run();
