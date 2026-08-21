const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data: pur } = await supabase.from("purchasing_plans").select("stt, notes, content").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN").eq("stt", "4");
  console.log(pur);
}
run();

