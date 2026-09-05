const fs = require('fs');
let code = fs.readFileSync('src/pages/FieldLogsPage.tsx', 'utf8');
code = code.replace(
  "confirmText={isDeleting ? 'Đang xóa...' : 'Xóa báo cáo'}",
  'confirmText="Xóa báo cáo"'
);
fs.writeFileSync('src/pages/FieldLogsPage.tsx', code);
console.log("Success");
