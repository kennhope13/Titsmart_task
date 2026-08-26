const fs = require('fs');
const file = 'src/pages/TaskManagementPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexCleanText = /const cleanText = \(str: any\) =>\s*String\(str \|\| ''\)\s*\.toLowerCase\(\)\s*\.normalize\('NFD'\)\s*\.replace\(\/\[\^\]\*\?\]\/g, ''\)\s*\.replace\(\/\[\^\]\*\?\/g, 'd'\)\s*\.trim\(\);/s;

// We can just find the exact index.
const startIdx = content.indexOf('const cleanText = (str: any) =>');
if (startIdx !== -1) {
  const endIdx = content.indexOf('.trim();', startIdx) + 8;
  const newStr = "const cleanText = (str: any) =>\n            String(str || '')\n              .toLowerCase()\n              .normalize('NFD')\n              .replace(/[\\u0300-\\u036f]/g, '')\n              .replace(/đ/g, 'd')\n              .trim();";
  content = content.substring(0, startIdx) + newStr + content.substring(endIdx);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed cleanText');
} else {
  console.log('cleanText not found');
}
