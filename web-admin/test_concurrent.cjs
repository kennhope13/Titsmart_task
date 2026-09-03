
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function test() {
  const { data, error } = await supabase.from('material_plans').select('id').limit(3);
  if (error) { console.error(error); return; }
  const ids = data.map(d => d.id);
  console.log('Updating:', ids);
  
  const promises = ids.map(id => 
    supabase.from('material_plans').update({ tech_spec_status: 'Đáp ứng' }).eq('id', id).select().single()
  );
  
  const results = await Promise.all(promises);
  results.forEach((res, i) => {
    if (res.error) console.error('Error for', ids[i], res.error);
    else console.log('Success for', ids[i]);
  });
}
test();

