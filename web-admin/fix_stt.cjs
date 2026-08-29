const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// Replace expense sorting
const expenseOld = `    const sortedOldestFirst = expenses.filter(p => p.projectCode === selectedProject).sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return Number(a.stt || 0) - Number(b.stt || 0);
    });`;
const expenseNew = `    const sortedOldestFirst = expenses.filter(p => p.projectCode === selectedProject).sort((a, b) => {
      return sttSortValue(a.stt) - sttSortValue(b.stt);
    });`;

pageCode = pageCode.replace(expenseOld, expenseNew);

// Replace labor sorting
const laborOld = `  const currentProjLabor = useMemo(() => 
    laborPayrolls.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [laborPayrolls, selectedProject]
  );`;
const laborNew = `  const currentProjLabor = useMemo(() => 
    laborPayrolls.filter(p => p.projectCode === selectedProject).sort((a, b) => sttSortValue(a.stt) - sttSortValue(b.stt)),
    [laborPayrolls, selectedProject]
  );`;

pageCode = pageCode.replace(laborOld, laborNew);

fs.writeFileSync(pageFile, pageCode);
console.log('Fixed STT sorting');
