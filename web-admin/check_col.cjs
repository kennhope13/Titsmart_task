const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from("purchasing_plans").select("id, parent_id, material_plan_id").limit(1);
  console.log(error || data);
}
run();

