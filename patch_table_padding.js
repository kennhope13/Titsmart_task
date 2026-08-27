const fs = require('fs');
let code = fs.readFileSync('web-admin/src/components/FieldLogsTaskTable.tsx', 'utf8');
code = code.replace('<div className="flex-1 overflow-auto bg-white p-4">', '<div className="flex-1 overflow-auto bg-white">');
fs.writeFileSync('web-admin/src/components/FieldLogsTaskTable.tsx', code);
console.log('Patched FieldLogsTaskTable');
