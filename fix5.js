const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/FieldLogsPage.tsx', 'utf8');

code = code.replace(
  "import { useParams } from 'react-router-dom';",
  "import { useParams, useOutletContext } from 'react-router-dom';\nimport { createPortal } from 'react-dom';"
);

fs.writeFileSync('web-admin/src/pages/FieldLogsPage.tsx', code);
console.log('Fixed imports in FieldLogsPage');
