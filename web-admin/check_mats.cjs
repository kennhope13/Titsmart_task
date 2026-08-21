const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data: mats } = await supabase.from("material_plans").select("*").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  const { data: purs } = await supabase.from("purchasing_plans").select("*").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  
  console.log("Phuoc Tan material plans:", mats.length);
  console.log("Phuoc Tan contractor scope in mats:", mats.filter(d => d.supply_scope === "contractor").length);
  console.log("Phuoc Tan purchasing plans:", purs.length);
}
run();

