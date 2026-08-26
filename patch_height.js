const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// Target 1: The Project Name Link
data = data.replace(
  'className="page-title text-lg font-extrabold text-slate-900 hover:text-primary hover:bg-slate-200/50 p-1.5 -ml-1.5 rounded-lg transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 flex items-center"',
  'className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 flex items-center h-full min-h-[36px]"'
);

// Target 2: The Active Tab Link
data = data.replace(
  'className="text-[15px] font-bold text-slate-700 hover:text-primary hover:bg-slate-200/50 px-2 py-1 -ml-1 rounded-md transition-colors shrink-0 cursor-pointer flex items-center"',
  'className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer flex items-center h-full min-h-[36px]"'
);

fs.writeFileSync(filePath, data);
console.log('Fixed link click areas');
