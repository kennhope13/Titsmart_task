const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data: mats } = await supabase.from("material_plans").select("stt, job_content, supply_scope").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  
  mats.forEach(m => console.log(m.stt, m.supply_scope, m.job_content.substring(0, 80)));
}
run();

