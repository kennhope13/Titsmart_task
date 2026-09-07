const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  // 1. Get A and B ids
  const { data: sections } = await supabase.from('tasks').select('id, stt')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6')
    .in('stt', ['A', 'B', '33', '34', '35', '37']);
  
  const map = {};
  sections.forEach(s => map[s.stt] = s.id);
  console.log('Current IDs:', map);

  const idA = map['A'];
  const idB = sections.find(s => s.stt === 'B')?.id;
  const id33 = map['33'];
  const id34 = map['34'];
  const id35 = map['35'];
  const id37 = map['37'];

  // 2. Create task 36 under B (missing header)
  const id36 = crypto.randomUUID();
  const { data: created36, error: err36 } = await supabase.from('tasks').insert({
    id: id36,
    stt: '36',
    code: id36,
    name: 'HỆ THỐNG SCADA DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM, NHÀ THẦU VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRƯỜNG',
    project_code: 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6',
    project_name: 'Trạm biến áp 110kV Phước Đông 6',
    volume: 0,
    unit: '',
    progress: 0,
    status: 'Chưa làm',
    purchase_status: 'Chưa đặt hàng',
    constr_status: 'Chưa thi công',
    is_done: false,
    is_section_header: true,
    section_name: '36. HỆ THỐNG SCADA DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM',
    parent_id: idB
  }).select();
  console.log('Created 36:', created36 ? 'OK' : 'FAIL', err36 || '');

  // 3. Fix parent_id: 33 -> A, 34 -> A, 35 -> A
  const { error: e1 } = await supabase.from('tasks').update({ parent_id: idA }).eq('id', id33);
  const { error: e2 } = await supabase.from('tasks').update({ parent_id: idA }).eq('id', id34);
  const { error: e3 } = await supabase.from('tasks').update({ parent_id: idA }).eq('id', id35);
  console.log('33->A:', e1 || 'OK');
  console.log('34->A:', e2 || 'OK');
  console.log('35->A:', e3 || 'OK');

  // 4. Fix parent_id: 37 -> B
  const { error: e4 } = await supabase.from('tasks').update({ parent_id: idB }).eq('id', id37);
  console.log('37->B:', e4 || 'OK');

  // 5. Fix 33.1 parent -> 33 (currently pointing to A)
  const { data: task33_1 } = await supabase.from('tasks').select('id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '33.1').single();
  if (task33_1) {
    const { error: e5 } = await supabase.from('tasks').update({ parent_id: id33 }).eq('id', task33_1.id);
    console.log('33.1->33:', e5 || 'OK');
  }

  // 6. Fix 36.1 parent -> 36 (currently pointing to B)
  const { data: task36_1 } = await supabase.from('tasks').select('id')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '36.1').single();
  if (task36_1) {
    const { error: e6 } = await supabase.from('tasks').update({ parent_id: id36 }).eq('id', task36_1.id);
    console.log('36.1->36:', e6 || 'OK');
  }

  // 7. Clean up test data
  await supabase.from('tasks').delete().in('stt', ['A', '34']).eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').neq('id', idA).neq('id', id34);

  // 8. Verify final state
  const { data: verify } = await supabase.from('tasks').select('stt, parent_id, name')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6')
    .in('stt', ['A', '33', '34', '35', 'B', '36', '37'])
    .order('stt');
  console.log('\n=== FINAL STATE ===');
  verify.forEach(t => {
    let parentLabel = 'ROOT';
    if (t.parent_id === idA) parentLabel = 'A';
    else if (t.parent_id === idB) parentLabel = 'B';
    else if (t.parent_id) parentLabel = t.parent_id;
    console.log(t.stt, '->', parentLabel, '|', t.name.substring(0, 50));
  });
}
run();
