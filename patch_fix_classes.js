const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// Fix the error page link
data = data.replace(
  '<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 cursor-pointer">\n          Quay lại Danh sách Dự án\n        </Link>',
  '<Link to="/projects" className="bg-primary hover:opacity-90 active:scale-95 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-md transition-all">\n          Quay lại Danh sách Dự án\n        </Link>'
);

// Fix the project name link to have flex items-center so the border shows
data = data.replace(
  '<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 cursor-pointer">',
  '<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 cursor-pointer inline-flex items-center">'
);

fs.writeFileSync(filePath, data);
console.log('Fixed link classes');
