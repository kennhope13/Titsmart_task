const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  // Try updating one material plan
  const { data: mats } = await supabase.from("material_plans").select("id, stt").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN").limit(1);
  console.log("Target:", mats[0]);
  
  const { data, error } = await supabase.from("material_plans").update({ supply_scope: "contractor" }).eq("id", mats[0].id).select();
  console.log("Update result:", data);
  console.log("Update error:", error);
  
  // Try inserting one purchasing plan
  const { data: ins, error: insErr } = await supabase.from("purchasing_plans").insert({
    project_code: "TRAM_BIEN_AP_110KV_PHUOC_TAN",
    stt: "TEST",
    content: "TEST DELETE ME",
    unit: "bo",
    volume_contract: 0,
    volume_order: 0,
    unit_price: 0,
    vat_rate: 0,
    vat_amount: 0,
    total_amount: 0,
    prepay_percent: 0,
    prepay_amount: 0,
    remaining_amount: 0,
    order_status: "test",
    contract_status: "test",
    invoice_status: "test",
    notes: "test"
  }).select();
  console.log("Insert result:", ins);
  console.log("Insert error:", insErr);
}
run();

