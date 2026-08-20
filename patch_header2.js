const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace: <div className="min-w-0 flex-1 space-y-1">
// With: <div className="min-w-0 flex-1 flex items-center gap-3">
content = content.replace(
  '<div className="min-w-0 flex-1 space-y-1">',
  '<div className="min-w-0 flex-1 flex items-center gap-3">'
);

// Add whitespace-nowrap and flex-shrink-0 to the h2
content = content.replace(
  '<h2 className="truncate text-xl font-extrabold leading-tight tracking-tight text-slate-900">Quản lý Tiến độ Công việc</h2>',
  '<h2 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 whitespace-nowrap flex-shrink-0">Quản lý Tiến độ Công việc</h2>'
);

content = content.replace(
  '<div className="inline-flex max-w-full items-center',
  '<div className="inline-flex min-w-0 items-center'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched flex title');
