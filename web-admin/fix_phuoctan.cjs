const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  // Get material plans for Phước Tân
  const { data: mats } = await supabase.from("material_plans").select("*").eq("project_code", "TRAM_BIEN_AP_110KV_PHUOC_TAN");
  
  for (const mat of mats) {
    if (mat.supply_scope !== "contractor") {
      await supabase.from("material_plans").update({ supply_scope: "contractor" }).eq("id", mat.id);
      console.log("Updated supply scope for", mat.stt);
    }
    
    // Check purchasing
    const { data: pur } = await supabase.from("purchasing_plans").select("*").eq("project_code", mat.project_code).eq("stt", mat.stt).eq("content", mat.job_content);
    if (!pur || pur.length === 0) {
      await supabase.from("purchasing_plans").insert({
        project_code: mat.project_code,
        stt: mat.stt,
        content: mat.job_content,
        unit: mat.unit,
        volume_contract: mat.contract_volume,
        volume_order: 0,
        unit_price: 0,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: 0,
        prepay_percent: 0,
        prepay_amount: 0,
        remaining_amount: 0,
        order_status: "Chưa đặt hàng",
        contract_status: "Chưa ký",
        invoice_status: "Chưa xuất",
        notes: mat.notes || ""
      });
      console.log("Created purchasing for", mat.stt);
    }

    // Check task
    const { data: task } = await supabase.from("tasks").select("*").eq("project_code", mat.project_code).eq("stt", mat.stt).eq("name", mat.job_content);
    if (!task || task.length === 0) {
      await supabase.from("tasks").insert({
        project_code: mat.project_code,
        stt: mat.stt,
        name: mat.job_content,
        unit: mat.unit,
        volume_contract: mat.contract_volume,
        volume_constructed: 0,
        completion_percent: 0,
        issue_status: "Không có",
        issue_content: "",
        is_finished: false,
        notes: mat.notes || ""
      });
      console.log("Created task for", mat.stt);
    }
  }
  console.log("DONE FIXING PHUOC TAN");
}
run();

