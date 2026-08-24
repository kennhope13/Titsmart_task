const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

const targetStr = `(subTab === 'DOCS' ? cleanDocNotes(plan.notes) : cleanTechNotes(plan.notes))`;

// We want to replace it only in the block starting with "V.MẮC"
let vmacIdx = f.indexOf('V.MẮC:');
if (vmacIdx !== -1) {
  let before = f.substring(0, vmacIdx);
  let after = f.substring(vmacIdx);
  after = after.replace(new RegExp(targetStr.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), 'cleanTechNotes(plan.notes)');
  f = before + after;
}

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', f, 'utf8');
