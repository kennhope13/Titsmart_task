
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
  
  // mock frontend payload
  const payload = { ...plan, techSpecStatus: 'Đáp ứng' };
  const snake = toSnakeCase(payload);
  console.log('Sending:', Object.keys(snake));
  const { data: updated, error } = await supabase.from('material_plans').update(snake).eq('id', plan.id).select().single();
  console.log('Error:', error);
}
test();

