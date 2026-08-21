const fs = require('fs');

function replaceMaterial() {
  let content = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', 'utf8');

  if (!content.includes('PURCHASE_STATUS_OPTIONS')) {
    content = content.replace(
      'import { ProjectMaterialPlan } from ' + "'../../types';",
      'import { ProjectMaterialPlan } from ' + "'../../types';\nimport { PURCHASE_STATUS_OPTIONS } from '../TaskManagementPage';"
    );
  }

  // Use a regex that matches the 4 hardcoded options
  const re = /<option value="">Chua d?t hàng<\/option>\s*<option value="Ðã d?t hàng">Ðã d?t hàng<\/option>\s*<option value="Ðang giao hàng">Ðang giao hàng<\/option>\s*<option value="Ðã nh?n hàng">Ðã nh?n hàng<\/option>/g;
  content = content.replace(re, '{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}');

  fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', content);
  console.log('Replaced Material');
}

function replacePurchasing() {
  let content = fs.readFileSync('web-admin/src/pages/cost-plan/PurchasingTab.tsx', 'utf8');

  if (!content.includes('PURCHASE_STATUS_OPTIONS')) {
    content = content.replace(
      'import { ProjectPurchasing } from ' + "'../../types';",
      'import { ProjectPurchasing } from ' + "'../../types';\nimport { PURCHASE_STATUS_OPTIONS } from '../TaskManagementPage';"
    );
  }

  const re = /<option value="Chua d?t hàng">Chua d?t hàng<\/option>\s*<option value="Ðã d?t hàng">Ðã d?t hàng<\/option>\s*<option value="Ðang giao hàng">Ðang giao hàng<\/option>\s*<option value="Ðã nh?n hàng">Ðã nh?n hàng<\/option>/g;
  content = content.replace(re, '{PURCHASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}');

  fs.writeFileSync('web-admin/src/pages/cost-plan/PurchasingTab.tsx', content);
  console.log('Replaced Purchasing');
}

replaceMaterial();
replacePurchasing();
