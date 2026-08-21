const fs = require("fs");
const files = [
  "web-admin/src/pages/TaskManagementPage.tsx",
  "web-admin/src/pages/cost-plan/MaterialPlanTab.tsx",
  "web-admin/src/pages/cost-plan/PurchasingTab.tsx"
];

files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  // In TaskManagementPage, KL header has text-right
  c = c.replace(/className="py-2 px-1 w-\[46px\] min-w-\[46px\] max-w-\[46px\] text-right/g, 
    "className=\"py-2 px-1 w-[46px] min-w-[46px] max-w-[46px] text-center");
    
  // In TaskManagementPage td, KL has text-right
  c = c.replace(/<td className="py-1\.5 px-1 text-right font-mono/g, 
    "<td className=\"py-1.5 px-1 text-center font-mono");
    
  c = c.replace(/className="w-full text-right border rounded/g, 
    "className=\"w-full text-center border rounded");

  // In MaterialPlanTab and PurchasingTab, check KL columns (KL HĐ, KL ĐH, TỒN, vv)
  c = c.replace(/text-right font-mono/g, "text-center font-mono");
  c = c.replace(/w-full text-right border rounded/g, "w-full text-center border rounded");
  c = c.replace(/p-0 align-top text-right/g, "p-0 align-top text-center");
  c = c.replace(/w-full text-right/g, "w-full text-center");

  fs.writeFileSync(f, c);
  console.log("Fixed KL center in", f);
});

