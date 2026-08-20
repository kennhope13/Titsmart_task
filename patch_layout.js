const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The toolbar container currently has: <div className="px-3 py-3 space-y-3">
// And the child has: <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">

content = content.replace(
  '<div className="px-3 py-3 space-y-3">',
  '<div className="px-3 py-2">'
);

content = content.replace(
  '<div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">',
  '<div className="flex flex-wrap items-center justify-between gap-2 text-xs">'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout borders and padding');
