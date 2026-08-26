const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

data = data.replace(
  'className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0"',
  'className="page-title text-lg font-extrabold text-slate-900 hover:text-primary hover:bg-slate-200/50 p-1.5 -ml-1.5 rounded-lg transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 flex items-center"'
);

data = data.replace(
  'className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer"',
  'className="text-[15px] font-bold text-slate-700 hover:text-primary hover:bg-slate-200/50 px-2 py-1 -ml-1 rounded-md transition-colors shrink-0 cursor-pointer flex items-center"'
);

fs.writeFileSync(filePath, data);
console.log('Padding added successfully');
