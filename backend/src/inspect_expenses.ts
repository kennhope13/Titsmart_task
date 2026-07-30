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
  const sheet = wb.Sheets['THEO DÕI CHI PHÍ CT'];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  console.log('Total rows in THEO DÕI CHI PHÍ CT:', rows.length);
  const dataRows = rows.slice(11); // starts from row 12
  console.log('Inspecting first 30 rows starting from row 12 (index 11):');
  dataRows.slice(0, 30).forEach((row, i) => {
    console.log(`Row ${i + 12}: stt=${row[0]}, date=${row[1]}, content=${row[2]}, desc=${row[3]}, unit=${row[4]}, qty=${row[5]}, price=${row[6]}, tax=${row[7]}, total=${row[8]}, income=${row[9]}, balance=${row[10]}`);
  });
}

main();
