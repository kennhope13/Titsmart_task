const fs = require('fs');
let code = fs.readFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', 'utf8');

// Remove the Lọc theo nội dung div
const locTheoNoiDungRegex = /<div className="flex justify-end mb-3 items-center gap-2">[\s\S]*?<\/div>/;
code = code.replace(locTheoNoiDungRegex, '');

// Remove the filterContent logic
code = code.replace(/const \[filterContent, setFilterContent\] = useState\('all'\);/, '');
code = code.replace(/filterContent !== 'all'/g, 'false');
code = code.replace(/const contentOptions = useMemo\(\(\) => \{[\s\S]*?\}, \[expenses\]\);/, '');
code = code.replace(/, filterContent\]\)/g, '])');

// Change className="w-full bg-white mb-4" to just "w-full mb-4"
code = code.replace(/className="w-full bg-white mb-4"/, 'className="w-full mb-4"');

fs.writeFileSync('src/pages/cost-plan/CostPlanSummaryTable.tsx', code);
