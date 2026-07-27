const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const docsDir = path.join(__dirname, '../documents');
const files = [
  'NĂM CĂN_ Quản lý KH-VT; CHI PHÍ .xlsx',
  'THEO DÕI HỒ SƠ ĐÃ GỬI ĐI.xlsx'
];

files.forEach(fileName => {
  const filePath = path.join(docsDir, fileName);
  console.log('\n==================================================');
  console.log('FILE:', fileName);
  console.log('==================================================');
  
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    return;
  }
  
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names:', workbook.SheetNames);
  
  workbook.SheetNames.forEach((sheetName) => {
    console.log('\n  SHEET:', sheetName);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('  Total Rows:', jsonData.length);
    console.log('  First 10 Rows:');
    jsonData.slice(0, 10).forEach((row, idx) => {
      console.log(`    Row ${idx + 1}:`, JSON.stringify(row));
    });
  });
});
