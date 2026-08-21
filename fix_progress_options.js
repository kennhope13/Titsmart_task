const fs = require("fs");
let c = fs.readFileSync("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", "utf8");
c = c.replace(/<option value="Chưa thi công"[^>]*>Chưa thi công<\/option>\s*<option value="Đang thi công"[^>]*>Đang thi công<\/option>\s*<option value="Đã hoàn thành"[^>]*>Đã hoàn thành<\/option>/g, 
  "{CONSTRUCTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className={getStatusColorStyle(opt)}>{opt}</option>)}");
fs.writeFileSync("web-admin/src/pages/cost-plan/MaterialPlanTab.tsx", c);
console.log("Fixed progress options");

