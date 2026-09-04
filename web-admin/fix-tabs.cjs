const fs = require('fs');
let content = fs.readFileSync('src/pages/ProjectDetailPage.tsx', 'utf-8');
content = content.replace(
  "const baseTabs = [\n      { label: 'Tiến độ Công việc'",
  "const baseTabs = [\n      { label: 'Tổng quan', path: \/projects/\/overview\, icon: 'dashboard' },\n      { label: 'Tiến độ Công việc'"
);
fs.writeFileSync('src/pages/ProjectDetailPage.tsx', content, 'utf-8');
console.log('done');
