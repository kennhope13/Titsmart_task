const fs = require('fs');
const file = 'web-admin/src/pages/FieldLogsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "          }}\n        />",
  "          }}\n          onDelete={async (id) => {\n            await deleteFieldLog(id);\n            setEditLog(null);\n          }}\n        />"
);

fs.writeFileSync(file, code);
console.log('Added onDelete prop');
