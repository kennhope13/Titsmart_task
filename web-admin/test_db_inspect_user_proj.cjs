const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

async function run() {
  const codes = ["TRAM_BIEN_AP_110KV_PHUOC_DONG_6", "TRAM_BIEN_AP_500KV_BAC_NINH"];
  const { data, error } = await supabase
    .from('engineers')
    .update({ project_codes: codes })
    .eq('username', 'tan')
    .select();
  console.log('Updated tan in DB:', JSON.stringify(data, null, 2), error);
}
run();
