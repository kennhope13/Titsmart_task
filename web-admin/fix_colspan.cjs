const fs = require("fs");
let code = fs.readFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", "utf8");

code = code.replace(/colSpan=\{14\}/g, "colSpan={16}");

fs.writeFileSync("src/pages/cost-plan/MaterialPlanTab.tsx", code);
console.log("Fixed colSpan");

