
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const supabaseKey = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, name, unit")
    .eq("project_code", "TRAM_BIEN_AP_500KV_BAC_NINH")
    .eq("unit", "ci");
    
  if (error) console.error(error);
  else console.log(`Found ${data.length} tasks with unit "ci" in Bac Ninh project`);
  
  if (data && data.length > 0) {
    console.log(data.slice(0, 5));
  }
}

check();

