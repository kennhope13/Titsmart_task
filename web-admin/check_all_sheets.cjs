const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const docsDir = path.join(__dirname, '../documents');
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.xlsx'));

files.forEach(fileName => {
  const filePath = path.join(docsDir, fileName);
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`${fileName}:`, workbook.SheetNames);
  } catch (e) {
    console.error(`Error reading ${fileName}:`, e.message);
  }
});
