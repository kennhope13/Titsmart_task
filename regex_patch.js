const fs = require('fs');

const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const regexHeader = /<div className="flex items-center h-full">\s*<h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">\s*\{project\.name\}\s*<\/h1>\s*<\/div>/g;

const headerReplacement = `<div className="flex items-center h-full gap-2 overflow-hidden">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">
            {project.name}
          </h1>
          {activeTab && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[14px] shrink-0">arrow_forward_ios</span>
              <span className="text-[15px] font-bold text-slate-700 shrink-0">{activeTab.label}</span>
            </>
          )}
          {subTitle && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[12px] shrink-0">arrow_forward_ios</span>
              <span className="text-[14px] font-medium text-slate-600 truncate">{subTitle}</span>
            </>
          )}
        </div>`;

data = data.replace(regexHeader, headerReplacement);

fs.writeFileSync(filePath, data);
console.log('Patched');
