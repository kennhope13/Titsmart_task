const fs = require('fs');

let content = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');

if (!content.includes('PURCHASE_STATUS_OPTIONS')) {
  content = content.replace(
    'import { ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll } from ' + "'../types';",
    'import { ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll } from ' + "'../types';\nimport { PURCHASE_STATUS_OPTIONS } from './TaskManagementPage';"
  );
}

// 1. Material Plan
const re1 = /<option value="Chua d?t hàng">Chua d?t hàng<\/option>\s*<option value="Ðã d?t hàng">Ðã d?t hàng<\/option>\s*<option value="Ðã nh?n d?">Ðã nh?n d?<\/option>/g;
content = content.replace(re1, '{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}');

// 2. Purchasing
const re2 = /<option value="Chua d?t hàng">Chua d?t hàng<\/option>\s*<option value="Ðã d?t hàng">Ðã d?t hàng<\/option>\s*<option value="Ðang giao hàng">Ðang giao hàng<\/option>\s*<option value="Ðã nh?n hàng">Ðã nh?n hàng<\/option>/g;
content = content.replace(re2, '{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}');

fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', content);
console.log('Replaced in ProjectCostPlanPage');
