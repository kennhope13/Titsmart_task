const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectOverviewTab.tsx', 'utf-8');

// Remove the H2
content = content.replace(/<h2 className="text-xl font-bold text-slate-800 border-l-4 border-primary pl-3">Tổng quan Dự án: \{project\.name\}<\/h2>\s*/, '');

// Replace rounded-full with rounded-2xl for all 4 icons
content = content.replace(
  /w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600/g,
  'w-[52px] h-[52px] rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600'
);
content = content.replace(
  /w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600/g,
  'w-[52px] h-[52px] rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600'
);
content = content.replace(
  /w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600/g,
  'w-[52px] h-[52px] rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600'
);
content = content.replace(
  /w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600/g,
  'w-[52px] h-[52px] rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600'
);

// Tweak text sizing slightly if needed
content = content.replace(/text-xs text-slate-500 font-medium mt-0\.5/g, 'text-[12px] text-slate-400 font-medium mt-1');
content = content.replace(/text-lg font-black text-slate-800 truncate/g, 'text-[22px] leading-tight font-black text-slate-800 truncate');

// Tweak the text-2xl
content = content.replace(/<h3 className="text-2xl font-black text-slate-800">\{progressPercent\}%<\/h3>/, '<h3 className="text-[26px] leading-tight font-black text-slate-800">{progressPercent}%</h3>');
content = content.replace(/<h3 className="text-2xl font-black text-slate-800">\{assignedEngineers\.length\}<\/h3>/, '<h3 className="text-[26px] leading-tight font-black text-slate-800">{assignedEngineers.length}</h3>');


fs.writeFileSync('src/pages/ProjectOverviewTab.tsx', content, 'utf-8');
console.log('done');
