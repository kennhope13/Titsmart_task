const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// Replace w-full min-w-[200px] with just min-w-[200px] or min-w-[150px]
pageCode = pageCode.replace(
  /<th className="px-2 py-2\.5 w-full min-w-\[200px\]">Nội dung \/ Diễn giải<\/th>/g,
  '<th className="px-2 py-2.5 min-w-[180px]">Nội dung / Diễn giải</th>'
);

fs.writeFileSync(pageFile, pageCode);
console.log('Done');
