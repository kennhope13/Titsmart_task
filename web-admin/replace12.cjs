const fs = require('fs');
let code = fs.readFileSync('src/pages/FieldLogsPage.tsx', 'utf8');
code = code.replace(
  'icon="delete"\r\n      />)}',
  'icon="delete"\r\n      />'
);
code = code.replace(
  'icon="delete"\n      />)}',
  'icon="delete"\n      />'
);
fs.writeFileSync('src/pages/FieldLogsPage.tsx', code);
console.log("Success");
