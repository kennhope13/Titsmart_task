const XLSX = require('xlsx');
const path = require('path');
const file = path.resolve('..', 'documents', '2.Phụ lục 01 Bảng giá HĐ TSM_HGP - TBA 110kV Phước Lý.xlsx');
const wb = XLSX.readFile(file, { cellDates: false });
console.log('Sheets:', wb.SheetNames);
for (const sheetName of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  console.log('\nSHEET', sheetName, 'rows', rows.length);
  rows.slice(0, 25).forEach((r, i) => console.log(i + 1, JSON.stringify(r)));
}
