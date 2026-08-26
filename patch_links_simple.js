const fs = require('fs');
const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const regexProject = /<Link to="\/projects" className="[^"]*">([\s\S]*?)<\/Link>/;
data = data.replace(regexProject, `<Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 cursor-pointer">$1</Link>`);

const regexTab = /<(Link to|a href)=\{activeTab\.path\} className="[^"]*">([\s\S]*?)<\/(Link|a)>/;
data = data.replace(regexTab, `<a href={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer">$2</a>`);

fs.writeFileSync(filePath, data);
console.log('Fixed links style');
