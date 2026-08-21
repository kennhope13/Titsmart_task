const { createClient } = require("@supabase/supabase-js");
const url = "https://nvdonaaxbtqjfmxtlgzb.supabase.co";
const key = "sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg";
const supabase = createClient(url, key);

async function run() {
  const PC = "TRAM_BIEN_AP_110KV_PHUOC_TAN";

  // Delete test record
  await supabase.from("purchasing_plans").delete().eq("stt", "TEST").eq("project_code", PC);

  // 1. Update ALL material_plans supply_scope to contractor
  const { data: mats } = await supabase.from("material_plans").select("*").eq("project_code", PC);
  console.log("Material plans to fix:", mats.length);
  
  for (const mat of mats) {
    const { data, error } = await supabase.from("material_plans").update({ supply_scope: "contractor" }).eq("id", mat.id).select("id, stt, supply_scope");
    if (error) console.error("ERR update mat", mat.stt, error.message);
    else console.log("OK mat", data[0].stt, data[0].supply_scope);
  }

  // 2. Get existing purchasing
  const { data: existPurs } = await supabase.from("purchasing_plans").select("*").eq("project_code", PC);
  const existSttSet = new Set(existPurs.map(p => p.stt));
  console.log("\nExisting purchasing STTs:", [...existSttSet]);

  // 3. Create missing purchasing plans with proper parent_id and section tags
  const matById = new Map(mats.map(m => [m.id, m]));
  
  for (const mat of mats) {
    if (existSttSet.has(mat.stt)) {
      // Update existing with parent linkage
      const existPur = existPurs.find(p => p.stt === mat.stt);
      if (existPur) {
        let purParentId = null;
        if (mat.parent_id) {
          const parentMat = matById.get(mat.parent_id);
          if (parentMat) {
            const parentPur = existPurs.find(p => p.stt === parentMat.stt);
            if (parentPur) purParentId = parentPur.id;
          }
        }
        await supabase.from("purchasing_plans").update({
          material_plan_id: mat.id,
          parent_id: purParentId,
          notes: mat.notes || ""
        }).eq("id", existPur.id);
        console.log("Updated existing pur", mat.stt);
      }
      continue;
    }

    // Find parent purchasing ID
    let purParentId = null;
    if (mat.parent_id) {
      const parentMat = matById.get(mat.parent_id);
      if (parentMat) {
        // Check if parent already in existPurs or was just created
        const parentPur = existPurs.find(p => p.stt === parentMat.stt);
        if (parentPur) purParentId = parentPur.id;
      }
    }

    const { data: created, error } = await supabase.from("purchasing_plans").insert({
      project_code: PC,
      stt: mat.stt,
      content: mat.job_content,
      unit: mat.unit || "",
      volume_contract: mat.contract_volume || 0,
      volume_order: 0,
      unit_price: 0,
      vat_rate: 0,
      vat_amount: 0,
      total_amount: 0,
      prepay_percent: 0,
      prepay_amount: 0,
      remaining_amount: 0,
      order_status: mat.ordered_status || "Chưa đặt hàng",
      contract_status: "Chưa ký",
      invoice_status: "Chưa xuất",
      notes: mat.notes || "",
      parent_id: purParentId,
      material_plan_id: mat.id
    }).select();
    
    if (error) console.error("ERR insert pur", mat.stt, error.message);
    else {
      console.log("OK created pur", mat.stt);
      existPurs.push(created[0]);
      existSttSet.add(mat.stt);
    }
  }

  // 4. Second pass: fix parent_id for newly created records
  const { data: allPurs } = await supabase.from("purchasing_plans").select("*").eq("project_code", PC);
  console.log("\nSecond pass - fixing parent_ids...");
  for (const pur of allPurs) {
    const mat = mats.find(m => m.stt === pur.stt && m.job_content === pur.content);
    if (mat && mat.parent_id) {
      const parentMat = matById.get(mat.parent_id);
      if (parentMat) {
        const parentPur = allPurs.find(p => p.stt === parentMat.stt);
        if (parentPur && pur.parent_id !== parentPur.id) {
          await supabase.from("purchasing_plans").update({ parent_id: parentPur.id }).eq("id", pur.id);
          console.log("Fixed parent for", pur.stt, "->", parentMat.stt);
        }
      }
    }
  }

  // 5. Verify
  const { data: finalPurs } = await supabase.from("purchasing_plans").select("stt, parent_id, material_plan_id, notes").eq("project_code", PC);
  console.log("\n=== FINAL RESULT ===");
  console.log("Total purchasing plans:", finalPurs.length);
  finalPurs.forEach(p => console.log(p.stt, "parent:", p.parent_id ? "YES" : "no", "matId:", p.material_plan_id ? "YES" : "no", "section:", (p.notes||"").includes("[section]")));
}
run().catch(console.error);

