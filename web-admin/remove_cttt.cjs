const fs = require('fs');

const file = 'src/pages/cost-plan/CostPlanSummaryTable.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\s*\{\/\*\s*CT TT C[^\n]*\s*\*\/.*?<table[^>]*>.*?CT TT C[^\n]*<.*?<tbody>.*?money\(summary\.totalLabor\).*?<\/table>/s;

if (regex.test(code)) {
    code = code.replace(regex, '');
    fs.writeFileSync(file, code, 'utf8');
    console.log('Removed CT TT CÔNG NHẬT table block.');
} else {
    console.log('Could not find the table block.');
}
