const fs = require('fs');

function removeStt(file) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    // Header
    code = code.replace(/<th[^>]*>STT<\/th>/g, '');
    
    // Body expense
    code = code.replace(/<td[^>]*>\{exp\.stt \|\| '-'}<\/td>/g, '');
    
    // Body labor
    code = code.replace(/<td[^>]*>\{lab\.stt \|\| '-'}<\/td>/g, '');
    
    fs.writeFileSync(file, code);
}

removeStt('web-admin/src/pages/cost-plan/ExpenseTab.tsx');
removeStt('web-admin/src/pages/cost-plan/LaborTab.tsx');
console.log('Done new tabs');
