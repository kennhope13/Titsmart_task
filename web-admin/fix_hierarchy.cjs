const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data: aTask } = await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'A').single();
  const { data: bTask } = await supabase.from('tasks').select('id').eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', 'B').single();

  const id33 = crypto.randomUUID();
  const id36 = crypto.randomUUID();

  // Insert 33
  await supabase.from('tasks').insert({
    id: id33,
    stt: '33',
    code: id33,
    name: 'HỆ THỐNG THÔNG TIN LIÊN LẠC DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM, NHÀ THẦU VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRƯỜNG',
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
    section_name: '33. HỆ THỐNG THÔNG TIN LIÊN LẠC DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM, NHÀ THẦU VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRƯỜNG',
    parent_id: aTask.id
  });

  // Insert 36
  await supabase.from('tasks').insert({
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
    section_name: '36. HỆ THỐNG SCADA DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM, NHÀ THẦU VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRƯỜNG',
    parent_id: bTask.id
  });

  // Update 33.1 and 36.1
  await supabase.from('tasks').update({ parent_id: id33 }).eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '33.1');
  await supabase.from('tasks').update({ parent_id: id36 }).eq('project_code', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6').eq('stt', '36.1');
  
  console.log('Done recreating 33 and 36');
}
run();
