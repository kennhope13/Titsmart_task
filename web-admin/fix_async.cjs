const fs = require('fs');
const file = 'src/pages/ProjectCostPlanPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<form onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*const qty = Number\(editingExpense\.quantity/g,
  '<form onSubmit={async (e) => { e.preventDefault(); const qty = Number(editingExpense.quantity'
);

fs.writeFileSync(file, code, 'utf8');
console.log("Fixed async onSubmit");
