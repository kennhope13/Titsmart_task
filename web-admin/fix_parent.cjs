const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data: mats } = await supabase.from("material_plans").select("*").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  const { data: purs } = await supabase.from("purchasing_plans").select("*").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  
  for (const pur of purs) {
    const mat = mats.find(m => m.stt === pur.stt && m.job_content === pur.content);
    if (mat) {
      let purParentId = null;
      if (mat.parent_id) {
        // find parent in mats
        const parentMat = mats.find(m => m.id === mat.parent_id);
        if (parentMat) {
          // find parent in purs
          const parentPur = purs.find(p => p.stt === parentMat.stt && p.content === parentMat.job_content);
          if (parentPur) {
            purParentId = parentPur.id;
          }
        }
      }
      await supabase.from("purchasing_plans").update({
        material_plan_id: mat.id,
        parent_id: purParentId
      }).eq("id", pur.id);
      console.log("Updated", pur.stt, "parent:", purParentId);
    }
  }
}
run();

