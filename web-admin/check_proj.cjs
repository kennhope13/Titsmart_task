const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from("projects").select("*");
  if (error) console.error(error);
  else {
    console.log(data.map(p => p.code));
  }
}
run();

