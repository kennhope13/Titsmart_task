const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectDiagramTab.tsx', 'utf8');
code = code.replace(
  'className="p-3 border-b border-slate-200/60 bg-white flex items-center justify-between z-20 relative"',
  'className="px-3 py-1.5 border-b border-slate-200/60 bg-white flex items-center justify-between z-20 relative"'
);
fs.writeFileSync('src/pages/ProjectDiagramTab.tsx', code);
console.log("Success");
