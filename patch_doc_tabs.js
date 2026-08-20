const fs = require('fs');
const path = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `<span className={\`text-[10px] px-1.5 py-0.5 rounded \${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}\`}>{tab.count}</span>`;

content = content.replace(targetStr, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Patched DocumentTrackingPage tabs');
