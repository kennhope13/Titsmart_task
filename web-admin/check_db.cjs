const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from("project_purchasing").select("*");
  if (error) console.error(error);
  else {
    const phuocTan = data.filter(d => d.project_code && d.project_code.includes("Phước Tân"));
    console.log("Total purchasing:", data.length);
    console.log("Phuoc Tan purchasing:", phuocTan.length);
    if (phuocTan.length > 0) {
      console.log(phuocTan[0]);
    }
  }
}
run();

