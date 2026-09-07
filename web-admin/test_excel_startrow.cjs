const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/documents/phước đông 6.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

let startRow = -1;
let headerRow = [];
for (let rIdx = 0; rIdx < Math.min(rows.length, 15); rIdx++) {
  const r = rows[rIdx];
  if (r && (r.includes('STT') || r.includes('stt') || r.includes('Stt') || r.some((cell) => String(cell).toLowerCase() === 'stt'))) {
    startRow = rIdx + 1;
    const nextRow = rows[rIdx + 1] || [];
    const isNextRowData = !!(nextRow[0] || nextRow[1]);
    const maxLen = Math.max(r.length, nextRow.length);
    for (let i = 0; i < maxLen; i++) {
        let h1 = r[i] || '';
        let h2 = !isNextRowData && nextRow[i] ? nextRow[i] : '';
        headerRow[i] = String(h1) + ' ' + String(h2);
    }
    if (!isNextRowData) startRow = rIdx + 2;
    break;
  }
}

console.log('rIdx header row:', startRow - 1, 'startRow data:', startRow);
console.log('Row at startRow:', rows[startRow]);
