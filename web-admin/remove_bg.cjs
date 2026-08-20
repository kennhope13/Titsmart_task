const fs = require('fs');
let content = fs.readFileSync('src/pages/ActivityLogPage.tsx', 'utf-8');

// Replace User column
content = content.replace(
  /className="inline-flex items-center gap-1\.5 px-2\.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200"/g,
  'className="inline-flex items-center gap-1.5 text-slate-700 font-bold"'
);

// Replace Scope column
content = content.replace(
  /className="inline-flex items-center gap-1\.5 px-2\.5 py-1 rounded-md bg-blue-50 text-primary font-bold border border-blue-100"/g,
  'className="inline-flex items-center gap-1.5 text-primary font-bold"'
);

// Replace Project column
content = content.replace(
  /className="inline-flex items-center gap-1\.5 px-2\.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"/g,
  'className="inline-flex items-center gap-1.5 text-indigo-700 font-bold"'
);

// Replace Action column
content = content.replace(
  /className=\{`inline-block px-3 py-1\.5 rounded-lg text-xs font-semibold \$\{actionInfo\.bg\} \$\{actionInfo\.color\} border border-white leading-relaxed`\}/g,
  'className={`inline-block text-xs font-semibold ${actionInfo.color} leading-relaxed`}'
);

fs.writeFileSync('src/pages/ActivityLogPage.tsx', content);
