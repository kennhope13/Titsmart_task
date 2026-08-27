const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

const regex = /\s*\{\/\* 3\. LƯƠNG CÔNG NHẬT \*\/\}[\s\S]*?<\/div>\s*\)\}/;

if(code.match(regex)) {
    code = code.replace(regex, '\n            </div>\n)}');
    fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
    console.log("Deleted");
} else {
    console.log("Not found");
}
