import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function main() {
  const filePath = path.join(__dirname, '../../documents/PHƯỚC LÝ_ Quản lý KH-VT; CHI PHÍ .xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const wb = XLSX.readFile(filePath);
  console.log('Sheet Names:', wb.SheetNames);
  wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    console.log(`Sheet: "${sheetName}", Total rows: ${range.e.r + 1}, Total cols: ${range.e.c + 1}`);
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    console.log('First 15 rows:');
    rows.slice(0, 15).forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row.slice(0, 10).map(v => v !== null && v !== undefined ? String(v).substring(0, 30) : ''));
    });
  });
}

main();
