const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const codes = ["TRAM_BIEN_AP_110KV_PHUOC_DONG_6", "TRAM_BIEN_AP_500KV_BAC_NINH"];
  const { data: eng, error } = await supabase
    .from('engineers')
    .update({ project_codes: codes })
    .eq('username', 'htbinh')
    .select();
  
  console.log('Updated htbinh project_codes:', JSON.stringify(eng, null, 2), error);
}
run();
