const fs = require('fs');
const path = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<span className="font-bold text-slate-800">{selectedLog.timestamp}</span>`;
const replacement = `<span className="font-bold text-slate-800">
                  {(() => {
                    const d = new Date(selectedLog.timestamp);
                    if (!Number.isNaN(d.getTime())) {
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      const ss = String(d.getSeconds()).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const yy = d.getFullYear();
                      return \`\${hh}:\${mm}:\${ss} \${dd}/\${mo}/\${yy}\`;
                    }
                    return selectedLog.timestamp;
                  })()}
                </span>`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched ActivityLogPage.tsx');
