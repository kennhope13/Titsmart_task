const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const regex = /<div className="flex items-center h-full gap-2 overflow-hidden">[\s\S]*?<\/div>/;

const replacement = `<div className="flex items-center h-full gap-2 overflow-hidden">
          <Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0">
            {project.name}
          </Link>
          {activeTab && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[14px] shrink-0">arrow_forward_ios</span>
              <Link to={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0">
                {activeTab.label}
              </Link>
            </>
          )}
          {subTitle && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[12px] shrink-0">arrow_forward_ios</span>
              <span className="text-[14px] font-medium text-slate-600 truncate">{subTitle}</span>
            </>
          )}
        </div>`;

data = data.replace(regex, replacement);
fs.writeFileSync(filePath, data);
console.log('Made links clickable');
