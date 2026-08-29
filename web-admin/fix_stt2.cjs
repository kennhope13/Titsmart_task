const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// Replace expense sorting using regex
pageCode = pageCode.replace(
  /const sortedOldestFirst = expenses\.filter\(p => p\.projectCode === selectedProject\)\.sort\(\(a, b\) => \{[\s\S]*?return Number\(a\.stt \|\| 0\) - Number\(b\.stt \|\| 0\);\s*\}\);/g,
  `const sortedOldestFirst = expenses.filter(p => p.projectCode === selectedProject).sort((a, b) => {
      return sttSortValue(a.stt) - sttSortValue(b.stt);
    });`
);

// Replace labor sorting using regex
pageCode = pageCode.replace(
  /const currentProjLabor = useMemo\(\(\) =>\s*laborPayrolls\.filter\(p => p\.projectCode === selectedProject\)\.sort\(\(a, b\) => Number\(a\.stt \|\| 0\) - Number\(b\.stt \|\| 0\)\),/g,
  `const currentProjLabor = useMemo(() => 
    laborPayrolls.filter(p => p.projectCode === selectedProject).sort((a, b) => sttSortValue(a.stt) - sttSortValue(b.stt)),`
);

fs.writeFileSync(pageFile, pageCode);
console.log('Fixed STT sorting with regex');
