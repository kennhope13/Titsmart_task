const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/documents/phước đông 6.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/i;
const isMainSectionName = (name) => name.toLowerCase().startsWith('phần ');

let currentMainSectionId = undefined;
let currentSubSectionId = undefined;

for (let i = 7; i < rows.length; i++) {
  const r = rows[i];
  if (!r || (!r[1] && !r[0])) continue;
  const itemName = r[1] || r[0];
  if (!itemName || String(itemName).trim().length === 0) continue;

  const sttVal = r[0] ? String(r[0]).trim() : '';
  const volVal = typeof r[2] === 'number' ? r[2] : (parseFloat(r[2]) || 0);
  const unitVal = String(r[3] || '').trim();

  if (sttVal.toLowerCase() === 'stt' || String(itemName).toLowerCase().includes('mo ta cong viec moi thau')) continue;

  const cleanUnitVal = unitVal.replace(/^[-–—_.\s]+$/, '').trim();
  const cleanStt = String(sttVal || '').trim().replace(/\.$/, '');
  const hasNoDot = !cleanStt.includes('.');
  const isRoman = romanRegex.test(cleanStt);
  const actualName = r[1] ? String(r[1]) : String(itemName);
  const startsWithPhan = actualName.trim().toUpperCase().startsWith('PHẦN ');
  const hasNoVolumeAndUnit = (volVal === 0 || !volVal) && (!cleanUnitVal || cleanUnitVal === '');
  const isSection = (startsWithPhan || isMainSectionName(actualName) || hasNoDot) && hasNoVolumeAndUnit && hasNoDot;
  const isMainLevelSection = isSection && (isRoman || startsWithPhan || isMainSectionName(actualName) || !cleanStt);

  let parentId = undefined;
  if (isSection) {
     if (isMainLevelSection) {
       currentMainSectionId = sttVal;
       currentSubSectionId = undefined;
     } else {
       currentSubSectionId = sttVal;
       parentId = currentMainSectionId;
     }
  }

  if (['A', '33', '34', '35', 'B', '36', '37'].includes(sttVal)) {
    console.log(sttVal.padEnd(4), '| isSection:', String(isSection).padEnd(5), '| isMainLevelSec:', String(isMainLevelSection).padEnd(5), '| parentId:', parentId || 'ROOT', '| currentMainSec:', currentMainSectionId);
  }
}
