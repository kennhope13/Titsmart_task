const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const PC = "TRAM_BIEN_AP_110KV_PHUOC_TAN";

  // Mục 3 và con (3.x, 3.x.x) là CHỦ ĐẦU TƯ
  const { data: mats } = await supabase.from("material_plans").select("id, stt").eq("project_code", PC);
  const ownerStts = mats.filter(m => m.stt === "3" || m.stt.startsWith("3.")).map(m => m.stt);
  console.log("Owner STTs:", ownerStts);

  // 1. Set supply_scope = owner cho mục 3
  for (const mat of mats.filter(m => ownerStts.includes(m.stt))) {
    await supabase.from("material_plans").update({ supply_scope: "owner" }).eq("id", mat.id);
    console.log("Set owner:", mat.stt);
  }

  // 2. Xóa purchasing plans của mục 3
  const { data: purs } = await supabase.from("purchasing_plans").select("id, stt").eq("project_code", PC);
  for (const pur of purs.filter(p => ownerStts.includes(p.stt))) {
    await supabase.from("purchasing_plans").delete().eq("id", pur.id);
    console.log("Deleted purchasing:", pur.stt);
  }

  // 3. Verify
  const { data: finalPurs } = await supabase.from("purchasing_plans").select("stt").eq("project_code", PC);
  console.log("\nRemaining purchasing:", finalPurs.length, finalPurs.map(p => p.stt));
}
run();

