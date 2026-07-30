const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const docsDir = path.join(__dirname, '../documents');
const filePath = path.join(docsDir, 'NĂM CĂN_ Quản lý KH-VT; CHI PHÍ .xlsx');
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets['THEO DÕI CHI PHÍ CT'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Total Rows:', rows.length);
console.log('Rows 1 to 25:');
rows.slice(0, 25).forEach((row, idx) => {
  console.log(`Row ${idx + 1}:`, JSON.stringify(row));
});
