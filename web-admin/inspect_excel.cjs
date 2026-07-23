const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '../bảng theo dõi tiến độ.xlsx');
console.log('Reading Excel file:', excelPath);

if (!fs.existsSync(excelPath)) {
  console.error('File does not exist:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log('\n========================================');
  console.log('SHEET:', sheetName);
  console.log('========================================');
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Total Rows:', jsonData.length);
  console.log('First 15 Rows:');
  jsonData.slice(0, 15).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
  });
});
