const fs = require('fs');
const path = 'web-admin/src/pages/PersonnelPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/px-2 py-0\.5 rounded text-\[11px\] font-bold \$\{([^}]+)\}/, (match, p1) => {
    let replaced = p1
        .replace(/'bg-purple-100 text-purple-700'/g, "'text-purple-700'")
        .replace(/'bg-blue-100 text-blue-700'/g, "'text-blue-700'")
        .replace(/'bg-orange-100 text-orange-700'/g, "'text-orange-700'")
        .replace(/'bg-slate-100 text-slate-700'/g, "'text-slate-700'");
    return `text-[11px] font-bold \${${replaced}}`;
});

content = content.replace(/\{person\.assignedProjects\.map\(\(mp: any\) => \(\s*<span key=\{mp\.code\} className="px-2 py-0\.5 rounded-full bg-blue-50 text-primary text-\[11px\] font-bold border border-blue-100 whitespace-nowrap">\{mp\.name\}<\/span>\s*\)\)\}/, 
`{person.assignedProjects.map((mp: any, i: number, arr: any[]) => (
  <span key={mp.code} className="text-primary text-[11px] font-bold whitespace-nowrap">
    {mp.name}{i < arr.length - 1 ? ', ' : ''}
  </span>
))}`);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched PersonnelPage.tsx again');
