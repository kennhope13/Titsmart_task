const fs = require('fs');
const path = 'web-admin/src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `<div className="min-w-0 flex-1 space-y-1">
            <h2 className="truncate text-xl font-extrabold leading-tight tracking-tight text-slate-900">Quản lý Tiến độ Công việc</h2>
            {selectedProjectFromUrl && (
              <div className="inline-flex max-w-full items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <span className="truncate">Dự án: {currentProject?.name || selectedProjectFromUrl}</span>
              </div>
            )}
          </div>`;

const replaceStr = `<div className="min-w-0 flex-1 flex items-center gap-3">
            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 whitespace-nowrap flex-shrink-0">Quản lý Tiến độ Công việc</h2>
            {selectedProjectFromUrl && (
              <div className="inline-flex min-w-0 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <span className="truncate">Dự án: {currentProject?.name || selectedProjectFromUrl}</span>
              </div>
            )}
          </div>`;

content = content.replace(targetStr, replaceStr);

// Also change py-3 to py-2 in the header
const headerTarget = `<div className="px-5 py-3 flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100">`;
const headerReplace = `<div className="px-5 py-2 flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100">`;

content = content.replace(headerTarget, headerReplace);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched layout project title');
