const fs = require("fs");
function fix(file) {
  let c = fs.readFileSync(file, "utf8");
  
  c = c.replace(/shadow-\[[^\]]*\]/g, "");

  fs.writeFileSync(file, c);
}
fix("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx");
fix("web-admin/src/pages/cost-plan/PurchasingTab.tsx");
console.log("Done");

