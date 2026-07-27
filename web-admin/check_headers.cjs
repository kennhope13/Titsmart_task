const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const docsDir = path.join(__dirname, '../documents');
const files = [
  'NĂM CĂN_ Quản lý KH-VT; CHI PHÍ .xlsx',
  'PHƯỚC LÝ_ Quản lý KH-VT; CHI PHÍ .xlsx',
  'PHƯỚC TÂN_ Quản lý KH-VT; CHI PHÍ .xlsx',
  'QL KH-VT; CHI PHÍ DỰ ÁN ĐẮK R\'LẤP.xlsx'
];

files.forEach(fileName => {
  const filePath = path.join(docsDir, fileName);
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  console.log(`\n=== FILE: ${fileName} ===`);
  wb.SheetNames.forEach(sheetName => {
    if (sheetName.includes('KÉ HOẠCH') || sheetName.includes('KẾ HOẠCH')) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`  ${sheetName} Row 9:`, JSON.stringify(rows[8]));
      console.log(`  ${sheetName} Row 10:`, JSON.stringify(rows[9]));
    }
    if (sheetName.includes('MUA SẮM')) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`  ${sheetName} Row 9:`, JSON.stringify(rows[8]));
    }
    if (sheetName.includes('CHI PHÍ')) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`  ${sheetName} Row 5:`, JSON.stringify(rows[4]));
      console.log(`  ${sheetName} Row 11:`, JSON.stringify(rows[10]));
    }
  });
});
