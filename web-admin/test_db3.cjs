const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const idA = crypto.randomUUID();
  const id34 = crypto.randomUUID();

  const payloads = [
    { id: idA, stt: 'A', name: 'A', project_code: 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6', volume: 0, unit: '', progress: 0, status: 'Chưa làm', purchase_status: 'Chưa đặt hàng', constr_status: 'Chưa thi công', parent_id: null },
    { id: id34, stt: '34', name: '34', project_code: 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6', volume: 0, unit: '', progress: 0, status: 'Chưa làm', purchase_status: 'Chưa đặt hàng', constr_status: 'Chưa thi công', parent_id: idA }
  ];

  const { data, error } = await supabase.from('tasks').insert(payloads).select();
  console.log('Result:', data ? data.length : null);
  if (error) console.error('Error:', error);
}
run();
