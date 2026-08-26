const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const regexProject = /<Link to="\/projects" className="[^"]*">([\s\S]*?)<\/Link>/;
data = data.replace(regexProject, `<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary hover:bg-slate-200/50 p-2 -ml-2 rounded-lg transition-colors border-l-4 border-primary pl-3 uppercase shrink-0 flex items-center h-full">$1</Link>`);

const regexTab = /<(Link to|a href)=\{activeTab\.path\} className="[^"]*">([\s\S]*?)<\/(Link|a)>/;
data = data.replace(regexTab, `<a href={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary hover:bg-slate-200/50 px-3 py-2 -ml-2 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center h-full">$2</a>`);

fs.writeFileSync(filePath, data);
console.log('Fixed link completely');
