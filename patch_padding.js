const fs = require('fs');

const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const targetProject = `<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0">
            {project.name}
          </Link>`;
          
const replacementProject = `<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary hover:bg-slate-200/50 p-2 -ml-2 rounded-lg transition-colors border-l-4 border-primary pl-3 uppercase shrink-0 flex items-center">
            {project.name}
          </Link>`;

const targetTab = `<a href={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer">
                {activeTab.label}
              </a>`;

const replacementTab = `<a href={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary hover:bg-slate-200/50 px-3 py-2 -ml-2 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center">
                {activeTab.label}
              </a>`;

data = data.replace(targetProject, replacementProject);
data = data.replace(targetTab, replacementTab);

fs.writeFileSync(filePath, data);
console.log('Added padding');
