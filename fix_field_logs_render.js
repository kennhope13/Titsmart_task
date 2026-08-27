const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

const regexRender = /<div className=\{`flex flex-col flex-1 \$\{logsByProject\.length === 0 \? '' : 'p-6'\}`\}>[\s\S]*?\{logsByProject\.length === 0 \? \([\s\S]*?<div className="flex flex-col items-center justify-center gap-3 bg-white flex-1 text-slate-400">[\s\S]*?<\/div>\s*\)\s*:\s*selectedProject \? \(/;

const newRenderStart = `<div className={\`flex flex-col flex-1 \${(logsByProject.length === 0 && !selectedProject) ? '' : 'p-6'}\`}>
          {selectedProject ? (`;

code = code.replace(regexRender, newRenderStart);

const regexElse = /\/\>\s*<\/div>\s*\)\s*:\s*\(/;
const newElse = `/>
                </div>
              ) : logsByProject.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 bg-white flex-1 text-slate-400">
              <span className="material-symbols-outlined text-5xl">photo_library</span>
              <p className="text-sm font-bold">Chưa có ảnh hiện trường</p>
              <p className="text-xs">Nhấn <strong className="text-primary">Upload ảnh</strong> để thêm ảnh cho dự án</p>
            </div>
          ) : (`;

code = code.replace(regexElse, newElse);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', code);
console.log('Fixed rendering logic');
