const fs = require("fs");
["web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "web-admin/src/pages/cost-plan/PurchasingTab.tsx"].forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  // Fix NOIDUNG cell
  c = c.replace(/truncate px-1\.5 py-1\.5 w-full h-full min-h-\[32px\] flex items-center/g, 
    "px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-center whitespace-normal break-words leading-tight");
  
  // Fix purchasing content cell
  c = c.replace(/truncate px-1\.5 py-1\.5 w-full h-full min-h-\[32px\] flex items-start/g, 
    "px-1.5 py-1.5 w-full h-full min-h-[32px] flex items-start whitespace-normal break-words leading-tight");

  // MaterialPlan header w-[280] -> 100% min 280
  c = c.replace(/style=\{\{\s*width:\s*280/g, "style={{ width: \"100%\", minWidth: 280");
  
  // Purchasing header w-[180] -> 100% min 280
  c = c.replace(/style=\{\{\s*width:\s*180/g, "style={{ width: \"100%\", minWidth: 280");

  // Remove truncate from parent rows
  c = c.replace(/truncate font-extrabold text-xs/g, "font-extrabold text-xs whitespace-normal break-words leading-tight");
  c = c.replace(/className="truncate flex-1 hover:underline"/g, "className=\"flex-1 hover:underline whitespace-normal break-words leading-tight\"");

  fs.writeFileSync(f, c);
});
console.log("Fixed other tabs");

