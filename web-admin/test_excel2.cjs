const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/documents/phước đông 6.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
console.log('length:', rows[8].length);
for(let i=0; i<rows[8].length; i++) {
  console.log("Col", i, ":", JSON.stringify(rows[8][i]));
}
