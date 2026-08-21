const fs = require("fs");
let c = fs.readFileSync("web-admin/src/pages/cost-plan/PurchasingTab.tsx", "utf8");
c = c.replace(/<option value="Chưa đặt hàng"[^>]*>Chưa đặt hàng<\/option>\s*<option value="Đã đặt hàng"[^>]*>Đã đặt hàng<\/option>\s*<option value="Đang giao hàng"[^>]*>Đang giao hàng<\/option>\s*<option value="Đã nhận hàng"[^>]*>Đã nhận hàng<\/option>/g, 
  "{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className={getStatusColorStyle(opt)}>{opt}</option>)}");
fs.writeFileSync("web-admin/src/pages/cost-plan/PurchasingTab.tsx", c);
console.log("Fixed options");

