const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const { data, error } = await supabase.from('engineers').update({ project_codes: ['TRAM_BIEN_AP_500KV_BAC_NINH', 'GIAM_SAT_CONG_TRINH_CC1', 'TRAM_BIEN_AP_220KV_LUC_YEN'] }).eq('username', 'tuyet').select('project_codes');
  if (error) console.error('Error:', error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
