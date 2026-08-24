const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

f = f.replace("field = 'notes';", "");
f = f.replace(/onUpdateMaterial\(id, \{ \.\.\.plan, \[field\]: finalValue \}\);/g, "onUpdateMaterial(id, { ...plan, [field === 'fileName' ? 'notes' : field]: finalValue });");

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
