const XLSX = require('xlsx');

function normalizeImportText(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function toRoman(num) {
  const map = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let result = '';
  for (let key in map) {
    while (num >= map[key]) {
      result += key;
      num -= map[key];
    }
  }
  return result;
}

function findAppendixHeaderRow(rows) {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const rowStr = rows[i].map(c => String(c || '').toLowerCase().trim()).join(' ');
    if (rowStr.includes('stt') && (rowStr.includes('nội dung') || rowStr.includes('mô tả'))) return i;
  }
  return -1;
}

function getColumnIndex(headerRow, keywords, fallback) {
  const found = headerRow.findIndex(col => {
    const text = normalizeImportText(col);
    return keywords.some(k => text.includes(normalizeImportText(k)));
  });
  return found >= 0 ? found : fallback;
}

const numVal = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/\s/g, '').replace(/,/g, '');
  return parseFloat(s) || 0;
};

const wb = XLSX.readFile('../documents/2.PL01 Bảng giá HĐ SCADA và TTLL - TBA 110kV Phước Tân (TSM_HGP).xlsx');
let currentSectionSupplyScope = 'unknown';
let romanSectionCounter = 0;

const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
const headerRowIndex = findAppendixHeaderRow(rows);
const headerRow = rows[headerRowIndex] || [];
const sttCol = getColumnIndex(headerRow, ['stt'], 0);
const contentCol = getColumnIndex(headerRow, ['noi dung', 'mo ta cong viec'], 1);
const volumeCol = getColumnIndex(headerRow, ['khoi luong'], 2);
const unitCol = getColumnIndex(headerRow, ['don vi tinh', 'dvt'], 3);
const modelCol = getColumnIndex(headerRow, ['ma hieu', 'model'], -1);
const unitPriceCol = getColumnIndex(headerRow, ['don gia'], modelCol >= 0 ? 6 : 4);
const preTaxCol = getColumnIndex(headerRow, ['thanh tien'], unitPriceCol + 1);
const totalCol = getColumnIndex(headerRow, ['tong tien'], preTaxCol + 2);

console.log("Header index:", headerRowIndex);

rows.slice(headerRowIndex + 1).forEach((row, i) => {
  const content = String(row[contentCol] || '').trim();
  if (!content) return;
  const stt = String(row[sttCol] || '').trim();
  const volumeContract = numVal(row[volumeCol]);
  const unitPrice = numVal(row[unitPriceCol]);
  const totalBeforeVat = numVal(row[preTaxCol]) || volumeContract * unitPrice;
  const totalAmount = numVal(row[totalCol]) || totalBeforeVat;
  const normalizedContent = normalizeImportText(content);
  const isSummaryRow = normalizedContent.includes('tong cong') || (!stt && normalizedContent === 'cong');
  if (isSummaryRow) return;

  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\s+[A-Z0-9]+)$/i;
  const numericParentRegex = /^\d+$/;
  const isSectionRow = romanRegex.test(stt) || (numericParentRegex.test(stt) && volumeContract === 0 && !String(row[unitCol] || '').trim());

  let effectiveStt = stt;
  if (isSectionRow) {
    romanSectionCounter++;
    effectiveStt = toRoman(romanSectionCounter);
    currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau cung cap') || normalizeImportText(content).includes('ben b cung cap')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu cung cap') || normalizeImportText(content).includes('ben a cung cap')) ? 'owner' : 'unknown';
  }

  const rowSupplyScope = (normalizeImportText(content).includes('nha thau cung cap') || normalizeImportText(content).includes('ben b cung cap')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu cung cap') || normalizeImportText(content).includes('ben a cung cap')) ? 'owner' : 'unknown';
  const supplyScope = isSectionRow ? currentSectionSupplyScope : (rowSupplyScope !== 'unknown' ? rowSupplyScope : currentSectionSupplyScope);

  const pushToPurchasing = ((isSectionRow && supplyScope !== 'owner') || (supplyScope === 'contractor' && (volumeContract > 0 || unitPrice > 0 || totalAmount > 0)));

  if (i < 30) {
    console.log(`[${effectiveStt}] ${content.substring(0, 30)}... isSec: ${isSectionRow}, rowScope: ${rowSupplyScope}, scope: ${supplyScope}, push: ${pushToPurchasing}`);
  }
});
