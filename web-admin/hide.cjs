const fs = require('fs');
let c = fs.readFileSync('src/pages/ProjectManagementPage.tsx', 'utf-8');
c = c.replace(
  /<button\s+onClick=\{\(\) => setIsNewProjectModalOpen\(true\)\}/g,
  "{user?.role === 'admin' || user?.role === 'pm' ? <button\n            onClick={() => setIsNewProjectModalOpen(true)}"
);
c = c.replace(
  /\{TEXT\.createProject\}\s+<\/button>/g,
  "{TEXT.createProject}\n          </button> : null}"
);
fs.writeFileSync('src/pages/ProjectManagementPage.tsx', c);
