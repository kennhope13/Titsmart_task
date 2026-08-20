const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '}, [data, searchQuery, statusFilter]);',
  '}, [data, searchQuery, statusFilter, filterParent, filterUnit, filterProgress, filterOrder, filterConstruction]);'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched useMemo dependencies');
