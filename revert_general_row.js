const fs = require('fs');
let code = fs.readFileSync('web-admin/src/components/FieldLogsTaskTable.tsx', 'utf8');

const startIdx = code.indexOf('<tbody className="divide-y divide-slate-200">');
if (startIdx !== -1) {
  const endMarker = '})()}';
  const endIdx = code.indexOf(endMarker, startIdx);
  if (endIdx !== -1) {
    const toReplace = code.substring(startIdx, endIdx + endMarker.length);
    code = code.replace(toReplace, '<tbody className="divide-y divide-slate-200">');
    fs.writeFileSync('web-admin/src/components/FieldLogsTaskTable.tsx', code);
    console.log('Reverted general row');
  }
}
