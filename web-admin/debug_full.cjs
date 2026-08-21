const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  // 1. Check material_plans supply_scope
  const { data: mats } = await supabase.from("material_plans").select("id, stt, job_content, supply_scope, notes").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  console.log("=== MATERIAL PLANS ===");
  mats.forEach(m => console.log(m.stt, "scope:", m.supply_scope, "notes:", (m.notes||"").substring(0,50)));

  // 2. Check purchasing_plans
  const { data: purs } = await supabase.from("purchasing_plans").select("id, stt, content, parent_id, material_plan_id, notes").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  console.log("\n=== PURCHASING PLANS ===");
  console.log("Total:", purs.length);
  purs.forEach(p => console.log(p.stt, "parent:", p.parent_id ? "yes" : "no", "matId:", p.material_plan_id ? "yes" : "no", "notes:", (p.notes||"").substring(0,50)));
}
run();

