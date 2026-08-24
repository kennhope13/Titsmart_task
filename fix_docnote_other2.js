const fs = require('fs');
const files = [
  'web-admin/src/utils/noteUtils.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\.split\('\|'\)/g, ".split('[DOC-NOTE]')[0].split('|')");
  fs.writeFileSync(file, content, 'utf8');
}
