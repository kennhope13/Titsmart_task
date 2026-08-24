const fs = require('fs');
const files = [
  'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx',
  'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx',
  'web-admin/src/pages/cost-plan/PurchasingTab.tsx',
  'web-admin/src/pages/TaskManagementPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/.replace\(\/\\\[owner\\\]\/gi, ''\)/g, ".replace(/\\[owner\\]/gi, '').replace(/\\[doc-track\\]/gi, '').replace(/\\[doc-track\\s*]/gi, '')");
  fs.writeFileSync(file, content, 'utf8');
}
