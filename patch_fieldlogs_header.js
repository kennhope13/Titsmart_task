const fs = require('fs');

let code = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

const regexOuter = /<div className=\{`flex flex-col flex-1 \$\{\(logsByProject\.length === 0 && !selectedProject\) \? '' : 'p-6'\}`\}>/;
const newOuter = `<div className={\`flex flex-col flex-1 \${(logsByProject.length === 0 && !selectedProject) || selectedProject ? '' : 'p-6'}\`}>`;

code = code.replace(regexOuter, newOuter);

const regexHeader = /<div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden">\s*<div className="flex items-center px-6 py-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">\s*\{!projectId && \(\s*<button onClick=\{\(\) => setSelectedProject\(''\)\} className="mr-4 p-2 rounded-full hover:bg-slate-200 text-slate-600 transition flex items-center justify-center">\s*<span className="material-symbols-outlined">arrow_back<\/span>\s*<\/button>\s*\)\}\s*<div>\s*<h2 className="text-lg font-bold text-slate-800 uppercase">\{projectName\(selectedProject\)\}<\/h2>\s*<p className="text-sm text-slate-500">Chi tiết nhật ký hiện trường<\/p>\s*<\/div>\s*<\/div>/;

const newHeader = `<div className="flex flex-col flex-1 overflow-hidden bg-white">
                  {!projectId && (
                    <div className="p-2 border-b border-slate-200 bg-slate-50">
                      <button onClick={() => setSelectedProject('')} className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-200 transition flex items-center gap-1 text-sm font-medium">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Quay lại danh sách dự án
                      </button>
                    </div>
                  )}`;

code = code.replace(regexHeader, newHeader);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', code);
console.log('Patched FieldLogsPage');
