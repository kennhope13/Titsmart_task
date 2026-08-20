const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Compact MaterialPlanTab selects
content = content.replace(/min-w-\[100px\] max-w-\[160px\]/g, 'min-w-[80px] max-w-[130px]');
content = content.replace(/min-w-\[60px\] max-w-\[100px\]/g, 'min-w-[50px] max-w-[90px]');
content = content.replace(/min-w-\[80px\] max-w-\[130px\]/g, 'min-w-[70px] max-w-[100px]');
content = content.replace(/px-2 py-1/g, 'px-1.5 py-0.5');

// Compact gap
content = content.replace(/gap-2 flex-wrap/g, 'gap-1 flex-wrap');

// Remove "Lọc chi tiết:" text, just keep icon
content = content.replace(
  '<div className="flex items-center gap-1.5 font-bold text-slate-500 whitespace-nowrap">\n            <span className="material-symbols-outlined text-[16px]">filter_list</span>\n          </div>',
  '<div className="flex items-center font-bold text-slate-500 whitespace-nowrap" title="Lọc chi tiết">\n            <span className="material-symbols-outlined text-[16px]">filter_list</span>\n          </div>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('MaterialPlanTab made more compact');
