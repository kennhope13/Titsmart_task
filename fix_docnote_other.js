const fs = require('fs');
const files = [
  'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx',
  'web-admin/src/pages/cost-plan/PurchasingTab.tsx',
  'web-admin/src/pages/TaskManagementPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Strip anything from [DOC-NOTE] onwards in the cleanNotes function of these tabs
  // Currently they have: .replace(/\\[doc-track\\s*]/gi, '')
  // We want to add: .split('[DOC-NOTE]')[0] before .split('|')
  
  content = content.replace(/\.split\('\|'\)/g, ".split('[DOC-NOTE]')[0].split('|')");
  fs.writeFileSync(file, content, 'utf8');
}
