
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function test() {
  const { data, error } = await supabase.from('material_plans').select('tech_spec_status').limit(5);
  console.log(data, error);
}
test();

