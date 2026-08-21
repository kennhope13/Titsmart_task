const fs = require("fs");
let c = fs.readFileSync("web-admin/src/pages/cost-plan/PurchasingTab.tsx", "utf8");
c = c.replace(/className=\{\`sticky left-\[32px\] z-10 ([^\`]*)\`\}/g, "className={\`$1\`}");
fs.writeFileSync("web-admin/src/pages/cost-plan/PurchasingTab.tsx", c);
console.log("Fixed line 625 properly");

