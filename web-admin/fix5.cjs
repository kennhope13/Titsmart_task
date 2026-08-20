const fs = require('fs');
let c = fs.readFileSync('src/pages/ProjectManagementPage.tsx', 'utf-8');
c = c.replace(
  /<button\s+type="button"\s+onClick=\{\(\) => setIsNewProjectModalOpen\(true\)\}/g,
  "{ (user?.role === 'admin' || user?.role === 'pm') ? (\n          <button\n            type=\"button\"\n            onClick={() => setIsNewProjectModalOpen(true)}"
);
fs.writeFileSync('src/pages/ProjectManagementPage.tsx', c);
