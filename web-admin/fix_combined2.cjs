const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

pageCode = pageCode.replace(
  /const combined = \[\.\.\.e, \.\.\.l\]\.sort\(\(a, b\) => \{[\s\S]*?return Number\(a\.stt \|\| 0\) - Number\(b\.stt \|\| 0\);\s*\}\);/g,
  `const combined = [...e, ...l].sort((a, b) => {
        return sttSortValue(a.stt) - sttSortValue(b.stt);
      });`
);

fs.writeFileSync(pageFile, pageCode);
console.log('Fixed combined STT sorting with regex');
