const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

code = code.replace(
  /if \(docTypeMatches\) \{\s*d\.fileUrls\.forEach\(url => \{/g,
  `if (docTypeMatches && d.fileUrls) {\n          d.fileUrls.forEach(url => {`
);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
console.log('Fixed forEach');
