const fs = require("fs");
["web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "web-admin/src/pages/cost-plan/PurchasingTab.tsx"].forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  c = c.replace(/materialPlans/g, "plans");
  c = c.replace(/purchasingPlans/g, "plans");
  
  // Also clean up any syntax errors from multiple replace runs
  fs.writeFileSync(f, c);
});
let tf = fs.readFileSync("web-admin/src/pages/TaskManagementPage.tsx", "utf8");
tf = tf.replace(/t\.computedStt/g, "(t as any).computedStt");
fs.writeFileSync("web-admin/src/pages/TaskManagementPage.tsx", tf);
console.log("Done");

