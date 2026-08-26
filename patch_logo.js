const fs = require('fs');

const filesToPatch = [
  'web-admin/src/components/layout/Sidebar.tsx',
  'web-admin/src/pages/LoginPage.tsx',
  'web-admin/src/pages/LoginPageVariant.tsx'
];

for (const file of filesToPatch) {
  if (fs.existsSync(file)) {
    let data = fs.readFileSync(file, 'utf8');
    data = data.replace(/"\.\/logo\.png"/g, '"/logo.png"');
    fs.writeFileSync(file, data);
    console.log('Patched ' + file);
  }
}
