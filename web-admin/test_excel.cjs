const xlsx = require('xlsx');
const wb = xlsx.readFile('D:/HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart/documents/phước đông 6.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const sttCol = 0;
const nameCol = 1;
const volCol = 2;
const unitCol = 3;
let startRow = 7; // Row 7 is 'A'

let currentMainSectionId = undefined;
let currentSubSectionId = undefined;

const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/i;
const isMainSectionName = (name) => name.toLowerCase().startsWith('phần ');

for (let i = startRow; i < Math.min(rows.length, 50); i++) {
  const r = rows[i];
  if (!r || (!r[nameCol] && !r[sttCol])) continue;
  const itemName = r[nameCol] || r[sttCol];
  if (!itemName || String(itemName).trim().length === 0) continue;
  
  const sttVal = r[sttCol] ? String(r[sttCol]).trim() : '';
  if (sttVal.toLowerCase() === 'stt' || String(itemName).toLowerCase().includes('mo ta cong viec moi thau')) continue;
  
  const volVal = volCol >= 0 ? (typeof r[volCol] === 'number' ? r[volCol] : (parseFloat(r[volCol]) || 0)) : 0;
  const unitVal = unitCol >= 0 ? String(r[unitCol] || '').trim() : '';

  const cleanUnitVal = unitVal.replace(/^[-–—_.\s]+$/, '').trim();
  const cleanStt = String(sttVal || '').trim().replace(/\.$/, '');
  const hasNoDot = !cleanStt.includes('.');
  const isRoman = romanRegex.test(cleanStt);
  const actualName = r[nameCol] ? String(r[nameCol]) : String(itemName);
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
  } else {
     // For simplicity, just log
  }
  if (sttVal === 'A' || sttVal === '33' || sttVal === '34' || sttVal === '35' || sttVal === 'B') {
    console.log({sttVal, isSection, isMainLevelSection, parentId, currentMainSectionId});
  }
}
