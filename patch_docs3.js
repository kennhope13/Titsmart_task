const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');

code = code.replace(
  '<div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.docCq}',
  '<div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.docStamp} onChange={(e) => setNewPlanData({...newPlanData, docStamp: e.target.checked})} /> <span className="font-bold">Tem KĐ</span></div>\n                <div className="flex items-center gap-2.5"><input type="checkbox" checked={newPlanData.docCq}'
);

code = code.replace(
  '<div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.docCq}',
  '<div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.docStamp} onChange={(e) => setEditingPlan({...editingPlan, docStamp: e.target.checked})} /> <span className="font-bold">Tem KĐ</span></div>\n                  <div className="flex items-center gap-2.5"><input type="checkbox" checked={editingPlan.docCq}'
);

code = code.replace(
  /grid-cols-3 gap-3 bg-slate-50/g,
  'grid-cols-4 gap-3 bg-slate-50'
);

// We need to also add docStamp export if it exists
code = code.replace(
  `'CQ: ' + (p.docCq ? 'C\u00F3' : 'Ch\u01B0a c\u00F3')`,
  `'CQ: ' + (p.docCq ? 'C\u00F3' : 'Ch\u01B0a c\u00F3'), 'Tem K\u0110: ' + (p.docStamp ? 'C\u00F3' : 'Ch\u01B0a c\u00F3')`
);

fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', code);
console.log('ProjectCostPlanPage patched');
