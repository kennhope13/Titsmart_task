const fs = require('fs');

let content = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', 'utf8');

const re = /<option value="">Chua d?t hàng<\/option>\s*<option value="Ðã d?t hàng">Ðã d?t hàng<\/option>\s*<option value="Ðang giao hàng">Ðang giao hàng<\/option>\s*<option value="Ðã nh?n hàng">Ðã nh?n hàng<\/option>/g;
content = content.replace(re, '{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}');

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', content);
console.log('Done');
