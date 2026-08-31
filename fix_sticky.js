const fs = require('fs');

function fixSticky(file) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    code = code.replace(/left-\[36px\]/g, 'left-0');
    
    fs.writeFileSync(file, code);
}

fixSticky('web-admin/src/pages/cost-plan/ExpenseTab.tsx');
fixSticky('web-admin/src/pages/cost-plan/LaborTab.tsx');
console.log('Fixed sticky');
