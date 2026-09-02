
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

function toSnakeCase(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase()),
      toSnakeCase(value)
    ])
  );
}

async function test() {
  const { data, error: err1 } = await supabase.from('material_plans').select('*').limit(1);
  if (err1) { console.error(err1); return; }
  const plan = data[0];
  console.log('Testing update with full object...');
  const { data: updated, error } = await supabase.from('material_plans').update(toSnakeCase({ ...plan, tech_spec_status: 'Đáp ứng' })).eq('id', plan.id).select().single();
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', updated.id);
  }
}
test();

