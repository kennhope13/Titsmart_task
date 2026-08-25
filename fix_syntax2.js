const fs = require('fs');
let f = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

f = f.replace(/\) : \(\s*\{selectedProject \? \(/g, ') : selectedProject ? (');
f = f.replace(/<\/div>\s*\)\}\s*\)\}\s*<\/div>/g, '</div>\n              )\n            }\n          </div>');

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', f, 'utf8');
