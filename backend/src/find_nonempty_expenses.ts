import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

function inspectFile(fileName: string) {
  const filePath = path.join(__dirname, '../../documents/', fileName);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const wb = XLSX.readFile(filePath);
  console.log(`\n==================================================`);
  console.log(`FILE: ${fileName}`);
  console.log(`==================================================`);
  
  // 1. Inspect THEO DÕI CHI PHÍ CT
  const expenseSheet = wb.Sheets['THEO DÕI CHI PHÍ CT'];
  if (expenseSheet) {
    const expenseRows = XLSX.utils.sheet_to_json<any[]>(expenseSheet, { header: 1 });
    let expenseValidCount = 0;
    expenseRows.slice(12).forEach((row, idx) => {
      const realRowIndex = idx + 13;
      const stt = row[0];
      const dateVal = row[1];
      const content = row[2];
      const desc = row[3];
      const totalAmount = row[8];
      const incomeAmount = row[9];
      
      if ((content && String(content).trim() !== '') || dateVal || totalAmount || incomeAmount) {
        expenseValidCount++;
        if (expenseValidCount < 10) {
          console.log(`  Expense Row ${realRowIndex}: stt=${stt}, date=${dateVal}, content=${content}, desc=${desc}, total=${totalAmount}, income=${incomeAmount}`);
        }
      }
    });
    console.log('  Total valid expense rows:', expenseValidCount);
  } else {
    console.log('  No "THEO DÕI CHI PHÍ CT" sheet found.');
  }

  // 2. Inspect Trang tính6 (Labor Payroll)
  const laborSheet = wb.Sheets['Trang tính6'] || wb.Sheets['Luong'] || wb.Sheets['CÔNG NHẬT'];
  if (laborSheet) {
    const laborRows = XLSX.utils.sheet_to_json<any[]>(laborSheet, { header: 1 });
    let laborValidCount = 0;
    laborRows.slice(6).forEach((row, idx) => {
      const realRowIndex = idx + 7;
      const stt = row[0];
      const dateVal = row[1];
      const content = row[2];
      const desc = row[3];
      const totalAmount = row[7];
      
      if ((content && String(content).trim() !== '') || dateVal || totalAmount) {
        laborValidCount++;
        if (laborValidCount < 10) {
          console.log(`  Labor Row ${realRowIndex}: stt=${stt}, date=${dateVal}, content=${content}, desc=${desc}, total=${totalAmount}`);
        }
      }
    });
    console.log('  Total valid labor rows:', laborValidCount);
  } else {
    console.log('  No labor sheet found.');
  }
}

inspectFile('PHƯỚC LÝ_ Quản lý KH-VT; CHI PHÍ .xlsx');
inspectFile('PHƯỚC TÂN_ Quản lý KH-VT; CHI PHÍ .xlsx');
inspectFile('NĂM CĂN_ Quản lý KH-VT; CHI PHÍ .xlsx');
