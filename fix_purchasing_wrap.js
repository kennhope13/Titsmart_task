const fs = require("fs");
const file = "web-admin/src/pages/cost-plan/PurchasingTab.tsx";
let c = fs.readFileSync(file, "utf8");

// Replace all whitespace-nowrap overflow-hidden in PurchasingTab tds
c = c.replace(/whitespace-nowrap overflow-hidden/g, "whitespace-normal break-words leading-tight");

fs.writeFileSync(file, c);
console.log("Fixed PurchasingTab td wrap");

