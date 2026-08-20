const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<h2 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 whitespace-nowrap flex-shrink-0 uppercase">QUẢN LÝ TIẾN ĐỘ CÔNG VIỆC</h2>',
  '<h2 className="page-title text-2xl font-extrabold text-slate-900 border-l-4 border-primary pl-4 uppercase whitespace-nowrap flex-shrink-0">QUẢN LÝ TIẾN ĐỘ CÔNG VIỆC</h2>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched title style');
