const fs = require("fs");
["web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "web-admin/src/pages/cost-plan/PurchasingTab.tsx"].forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  
  c = c.replace(/style=\{\{\s*([^}]+)\s*\}\}([^>]+)style=\{\{\s*left:\s*"var\(--stt-width\)"\s*\}\}/g, 
    "style={{ $1, left: \"var(--stt-width)\" }}$2");

  fs.writeFileSync(f, c);
});
console.log("Done");

