const fs = require("fs");
let c = fs.readFileSync("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "utf8");
c = c.replace(/className=\{\`sticky left-\[50px\] z-10 ([^\`]*)\`\}/g, "className={\`$1\`}");
fs.writeFileSync("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", c);
console.log("Fixed MaterialPlanTab");

