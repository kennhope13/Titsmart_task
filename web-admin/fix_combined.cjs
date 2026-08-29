const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

const oldCode = `      const combined = [...e, ...l].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return Number(a.stt || 0) - Number(b.stt || 0);
      });`;

const newCode = `      const combined = [...e, ...l].sort((a, b) => {
        return sttSortValue(a.stt) - sttSortValue(b.stt);
      });`;

pageCode = pageCode.replace(oldCode, newCode);

fs.writeFileSync(pageFile, pageCode);
console.log('Fixed combinedCashFlow STT sorting');
