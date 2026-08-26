const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// Fix hasDocFiles
code = code.replace(
  /if \(!d\.fileUrls \|\| d\.fileUrls\.length === 0\) return false;/g,
  `// Allow empty files to show the badge\n      // if (!d.fileUrls || d.fileUrls.length === 0) return false;`
);

// Fix getCustomDocs
code = code.replace(
  /if \(!d\.fileUrls \|\| d\.fileUrls\.length === 0\) return;/g,
  `// Allow empty files to show the badge\n        // if (!d.fileUrls || d.fileUrls.length === 0) return;`
);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
console.log('Fixed missing file rendering');
