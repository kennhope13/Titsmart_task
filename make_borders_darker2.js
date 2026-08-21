const fs = require("fs");
const files = [
  "web-admin/src/pages/TaskManagementPage.tsx",
  "web-admin/src/pages/cost-plan/MaterialPlanTab.tsx",
  "web-admin/src/pages/cost-plan/PurchasingTab.tsx"
];

files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  c = c.replace(/divide-slate-100/g, "divide-slate-200");
  
  fs.writeFileSync(f, c);
});
console.log("Made divide darker");

