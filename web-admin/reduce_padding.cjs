const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// 1. Reduce padding in the filter bar (py-3 -> py-1.5)
pageCode = pageCode.replace(
  /className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3/g,
  'className="flex border-b border-slate-100 bg-slate-50 px-5 py-1.5 gap-3'
);

// 2. Reduce padding in the table headers (py-2.5 -> py-1.5)
// This will match all `py-2.5` inside `<th className="...">`
pageCode = pageCode.replace(
  /<th className="([^"]*)py-2\.5([^"]*)">/g,
  '<th className="$1py-1.5$2">'
);

// 3. Just to be thorough, let's also reduce the padding of the table body cells if they are also too tall? 
// No, the user showed the header and filter bar. But if the body is also tall, it might be good. Let's just do header for now. 
// Wait, the body cells are also `py-2.5`. Let's reduce them to `py-1.5` so the whole table is more compact.
pageCode = pageCode.replace(
  /<td className="([^"]*)py-2\.5([^"]*)">/g,
  '<td className="$1py-1.5$2">'
);

fs.writeFileSync(pageFile, pageCode);
console.log('Reduced padding');
