const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data: mats } = await supabase.from("material_plans").select("project_code, stt, job_content, supply_scope");
  const projects = [...new Set(mats.map(m => m.project_code))];
  projects.forEach(p => {
    const pMats = mats.filter(m => m.project_code === p);
    const unks = pMats.filter(m => m.supply_scope === "unknown");
    console.log(p, "total:", pMats.length, "unknown:", unks.length);
  });
}
run();

