const fs = require('fs');

let c = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', 'utf8');

c = c.replace('import { PURCHASE_STATUS_OPTIONS } from \\'../TaskManagementPage\\';', 'import { PURCHASE_STATUS_OPTIONS } from \\'../TaskManagementPage\\';\nimport { getStatusColorStyle } from \\'../../types\\';');

// I will just use replace_file_content for the MaterialPlanTab.tsx logic since it's easier.
