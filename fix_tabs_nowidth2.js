const fs = require("fs");
let f1 = "web-admin/src/pages/cost-plan/MaterialPlanTab.tsx";
let c1 = fs.readFileSync(f1, "utf8");
c1 = c1.replace(/style=\{\{\s*width:\s*280,\s*/g, "style={{ minWidth: 280, ");
fs.writeFileSync(f1, c1);

let f2 = "web-admin/src/pages/cost-plan/PurchasingTab.tsx";
let c2 = fs.readFileSync(f2, "utf8");
c2 = c2.replace(/style=\{\{\s*width:\s*180,\s*/g, "style={{ minWidth: 280, ");
fs.writeFileSync(f2, c2);

console.log("Fixed tabs nowidth 2");

