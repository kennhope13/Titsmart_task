const fs = require("fs");
const files = [
  "web-admin/src/pages/TaskManagementPage.tsx",
  "web-admin/src/pages/cost-plan/MaterialPlanTab.tsx",
  "web-admin/src/pages/cost-plan/PurchasingTab.tsx"
];

files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  // Replace border-slate-100 with border-slate-200 for border-r and border-l in td elements
  c = c.replace(/border-r border-slate-100/g, "border-r border-slate-200");
  c = c.replace(/border-l border-slate-100/g, "border-l border-slate-200");
  
  // Also fix the header if it was too light
  c = c.replace(/border-r border-slate-100/g, "border-r border-slate-200");
  
  fs.writeFileSync(f, c);
  console.log("Made borders darker in", f);
});

