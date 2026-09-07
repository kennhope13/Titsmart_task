const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  // Create A
  const idA = crypto.randomUUID();
  const { data: createdA, error: errA } = await supabase.from('tasks').insert({
    id: idA,
    stt: 'A',
    code: idA,
    name: 'HẠNG MỤC TTLL TRẠM BIẾN ÁP 110KV PHƯỚC ĐÔNG 6',
    project_code: 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6',
    project_name: 'Trạm biến áp 110kV Phước Đông 6',
    volume: 0, unit: '', progress: 0,
    status: 'Chưa làm',
    purchase_status: 'Chưa đặt hàng',
    constr_status: 'Chưa thi công',
    is_done: false,
    is_section_header: true,
    section_name: 'A. HẠNG MỤC TTLL TRẠM BIẾN ÁP 110KV PHƯỚC ĐÔNG 6',
    parent_id: null
  }).select().single();
  console.log('Created A:', createdA ? 'OK' : 'FAIL', errA || '');

  // Create 34
  const id34 = crypto.randomUUID();
  const { data: created34, error: err34 } = await supabase.from('tasks').insert({
    id: id34,
    stt: '34',
    code: id34,
    name: 'HỆ THỐNG THÔNG TIN LIÊN LẠC DO NHÀ THẦU CUNG CẤP, VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRÌNH - PHẦN THIẾT BỊ',
    project_code: 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6',
    project_name: 'Trạm biến áp 110kV Phước Đông 6',
    volume: 0, unit: '', progress: 0,
    status: 'Chưa làm',
    purchase_status: 'Chưa đặt hàng',
    constr_status: 'Chưa thi công',
    is_done: false,
    is_section_header: true,
    section_name: '34. HỆ THỐNG THÔNG TIN LIÊN LẠC DO NHÀ THẦU CUNG CẤP - PHẦN THIẾT BỊ',
    parent_id: idA
  }).select().single();
  console.log('Created 34:', created34 ? 'OK' : 'FAIL', err34 || '');

  // Now fix parent_id for 33, 35 -> A
  const { error: e33 } = await supabase.from('tasks').update({ parent_id: idA })
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '33');
  console.log('33->A:', e33 || 'OK');

  const { error: e35 } = await supabase.from('tasks').update({ parent_id: idA })
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '35');
  console.log('35->A:', e35 || 'OK');

  // Fix 33.1 parent -> 33
  const { data: t33 } = await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '33').single();
  const { data: t33_1 } = await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '33.1').single();
  if (t33 && t33_1) {
    await supabase.from('tasks').update({ parent_id: t33.id }).eq('id', t33_1.id);
    console.log('33.1->33: OK');
  }

  // Fix 34.1, 34.2, 34.3 parent -> 34
  const { data: tasks34x } = await supabase.from('tasks').select('id, stt')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6')
    .in('stt', ['34.1', '34.2', '34.3']);
  for (const t of (tasks34x || [])) {
    await supabase.from('tasks').update({ parent_id: id34 }).eq('id', t.id);
    console.log(t.stt + '->34: OK');
  }

  // Verify
  const { data: verify } = await supabase.from('tasks').select('stt, parent_id, name')
    .eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6')
    .in('stt', ['A', '33', '34', '35', 'B', '36', '37'])
    .order('stt');
  const idB = (await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'B').single()).data?.id;

  console.log('\n=== FINAL HIERARCHY ===');
  verify.forEach(t => {
    let parent = 'ROOT';
    if (t.parent_id === idA) parent = '-> A';
    else if (t.parent_id === idB) parent = '-> B';
    else if (t.parent_id) parent = '-> ' + t.parent_id.substring(0,8);
    console.log(t.stt.padEnd(4), parent.padEnd(12), t.name.substring(0, 60));
  });
}
run();
