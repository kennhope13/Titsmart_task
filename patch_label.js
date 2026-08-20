const fs = require('fs');
const path = 'web-admin/src/pages/ProjectManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<label className="block font-bold text-slate-700 mb-1">Nhân sự / Quản lý dự án</label>',
  '<label className="block font-bold text-slate-700 mb-1">Nhân sự</label>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched label');
