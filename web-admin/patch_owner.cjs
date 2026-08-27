const fs = require('fs');

// Patch ProjectCostPlanPage.tsx
let pcpCode = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// Replace isContractorMaterialPlan to always return true
pcpCode = pcpCode.replace(
  /const isContractorMaterialPlan = \(plan: ProjectMaterialPlan\) => \{[\s\S]*?return true;\r?\n\};/,
  'const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => true;'
);

// Remove the validIds.delete logic for owner
const blockRegex = /if \(!matPlan\) \{[\s\S]*?if \(!hasValidChild\) \{[\s\S]*?validIds\.delete\(plan\.id\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/;
pcpCode = pcpCode.replace(blockRegex, 'if (!matPlan) { /* owner check removed */ }');
fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', pcpCode);


// Patch TaskManagementPage.tsx
let tmpCode = fs.readFileSync('src/pages/TaskManagementPage.tsx', 'utf8');

// Replace the if (!sectionIsOwner) block with just the addPurchasingPlan call
const addPurchasingRegex = /if \(!sectionIsOwner\) \{\s*\/\/ T\u1ea1o PurchasingPlan.*?\s*await addPurchasingPlan\(\{([\s\S]*?)\},\s*true\);\s*\/\/ skipLog = true\s*\}/g;
tmpCode = tmpCode.replace(addPurchasingRegex, 'await addPurchasingPlan({$1}, true);');

fs.writeFileSync('src/pages/TaskManagementPage.tsx', tmpCode);
