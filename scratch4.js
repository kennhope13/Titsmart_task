const fs = require('fs');

let content = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', 'utf8');

const target = <option value="">Chua d?t hàng</option>
                                <option value="Ðã d?t hàng">Ðã d?t hàng</option>
                                <option value="Ðang giao hàng">Ðang giao hàng</option>
                                <option value="Ðã nh?n hàng">Ðã nh?n hàng</option>;

// Replace normalize newline
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  content = normalizedContent.replace(normalizedTarget, '{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}');
  fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', content);
  console.log('Replaced');
} else {
  console.log('Not found string exact');
}
