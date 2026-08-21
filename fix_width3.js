const fs = require("fs");
function fix(file) {
  let c = fs.readFileSync(file, "utf8");
  
  c = c.replace(/style=\{\{\s*width:\s*32([^}]*)\}\}\s*className="sticky left-0([^"]*)">STT<\/th>/g, 
    "style={{ minWidth: 32, width: \"auto\"$1 }} className=\"sticky left-0$2 whitespace-nowrap\">STT</th>");
  
  c = c.replace(/style=\{\{\s*width:\s*180([^}]*)\}\}\s*className="sticky left-\[32px\]\s*z-20([^"]*)"/g, 
    "style={{ width: 180$1 }} className=\"z-20$2\"");
  
  c = c.replace(/className="sticky left-\[32px\]\s*z-10([^"]*)"/g, 
    "className=\"$1\"");

  fs.writeFileSync(file, c);
}
fix("web-admin/src/pages/cost-plan/PurchasingTab.tsx");
console.log("Done");

