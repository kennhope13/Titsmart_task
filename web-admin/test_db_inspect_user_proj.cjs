const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const updates = [
    { username: 'htbinh', codes: ['TRAM_BIEN_AP_500KV_BAC_NINH', 'TRAM_BIEN_AP_110KV_PHUOC_DONG_6'] },
    { username: 'Huy', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6', 'TRAM_BIEN_AP_220KV_NAM_CAN'] },
    { username: 'tuyet', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6', 'TRAM_BIEN_AP_220KV_NAM_CAN'] },
    { username: 'trungnd', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6', 'TRAM_BIEN_AP_220KV_LUC_YEN'] },
    { username: 'nqkhanh', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6'] },
    { username: 'dan', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6', 'TRAM_BIEN_AP_110KV_PHUOC_LY', 'TRAM_BIEN_AP_220KV_NAM_CAN'] },
    { username: 'tan', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6', 'TRAM_BIEN_AP_220KV_NAM_CAN'] },
    { username: 'tien', codes: ['TRAM_BIEN_AP_110KV_PHUOC_DONG_6'] },
  ];

  for (const u of updates) {
    const { data, error } = await supabase
      .from('engineers')
      .update({ project_codes: u.codes })
      .eq('username', u.username)
      .select();
    console.log('Updated', u.username, 'to', u.codes, error || '');
  }
}
run();
