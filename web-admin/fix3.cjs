const fs = require('fs');
let c = fs.readFileSync('src/pages/ProjectManagementPage.tsx', 'utf-8');
c = c.replace(
  /\{ \(\(user\?\.role === 'admin' \|\| user\?\.role === 'pm'\)\) \? \(\n          <button/g,
  "{ (user?.role === 'admin' || user?.role === 'pm') ? (\n          <button"
);
// Replace the duplicate `) : null} : null}` with just `) : null}`
c = c.replace(/\) : null\} : null\}/g, ") : null}");
fs.writeFileSync('src/pages/ProjectManagementPage.tsx', c);
