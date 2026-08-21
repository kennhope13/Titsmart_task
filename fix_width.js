const fs = require("fs");
function fix(file) {
  let c = fs.readFileSync(file, "utf8");
  
  // For STT headers
  c = c.replace(/style=\{\{\s*width:\s*50([^}]*)\}\}\s*className="sticky left-0([^"]*)">STT<\/th>/g, 
    "style={{ minWidth: 50, width: \"auto\"$1 }} className=\"sticky left-0$2 whitespace-nowrap\">STT</th>");
  
  // For NỘI DUNG headers
  c = c.replace(/style=\{\{\s*width:\s*280([^}]*)\}\}\s*className="sticky left-\[50px\]\s*z-20([^"]*?)(?:\s*shadow-\[[^\]]*\])?([^"]*)"/g, 
    "style={{ width: 280$1 }} className=\"z-20$2$3\"");
  
  // For section headers / regular td in MaterialPlanTab
  c = c.replace(/className="sticky left-\[50px\]\s*z-10([^"]*?)(?:\s*shadow-\[[^\]]*\])?([^"]*)"/g, 
    "className=\"$1$2\"");

  fs.writeFileSync(file, c);
}
fix("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx");
fix("web-admin/src/pages/cost-plan/PurchasingTab.tsx");
console.log("Done");

