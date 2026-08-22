
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const supabaseKey = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data, error } = await supabase
    .from("tasks")
    .update({ unit: "cái" })
    .eq("unit", "ci");
    
  if (error) console.error("Error updating tasks:", error);
  else console.log(`Fixed tasks with unit "ci" to "cái"`);
  
  const { data: data2, error: error2 } = await supabase
    .from("material_plans")
    .update({ unit: "cái" })
    .eq("unit", "ci");
    
  if (error2) console.error("Error updating material_plans:", error2);
  else console.log(`Fixed material_plans with unit "ci" to "cái"`);
  
  const { data: data3, error: error3 } = await supabase
    .from("purchasing_plans")
    .update({ unit: "cái" })
    .eq("unit", "ci");
    
  if (error3) console.error("Error updating purchasing_plans:", error3);
  else console.log(`Fixed purchasing_plans with unit "ci" to "cái"`);
}

fix();

