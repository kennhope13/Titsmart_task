const fs = require('fs');

const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

const targetLink = `<Link to={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0">
                {activeTab.label}
              </Link>`;
              
const replacementA = `<a href={activeTab.path} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer">
                {activeTab.label}
              </a>`;

data = data.replace(targetLink, replacementA);

fs.writeFileSync(filePath, data);
console.log('Patched to a tag');
