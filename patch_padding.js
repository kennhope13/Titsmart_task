const fs = require('fs');

const pages = [
  'web-admin/src/pages/ProjectDetailPage.tsx',
  'web-admin/src/pages/DocumentTrackingPage.tsx',
  'web-admin/src/pages/FieldLogsPage.tsx',
  'web-admin/src/pages/ProjectCostPlanPage.tsx'
];

for (const p of pages) {
  if (fs.existsSync(p)) {
    let f = fs.readFileSync(p, 'utf8');
    // Ensure all electron-drag regions have electron-no-drag for the child action buttons
    // Actually just update them all
    f = f.replace('className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 shadow-sm"', 'className={`bg-white border-b border-slate-200 pl-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 shadow-sm electron-drag ${window.electronAPI ? "pr-[180px]" : "pr-6"}`}');
    f = f.replace('className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-1"', 'className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-1 electron-no-drag"');
    
    fs.writeFileSync(p, f);
  }
}
console.log('Done padding');
