const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');
f = f.replace('<div className="flex h-full flex-1 flex-col bg-slate-100 overflow-y-auto">', '<div className="flex min-h-full flex-1 flex-col bg-slate-100">');
fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f, 'utf8');
console.log('Fixed height');
