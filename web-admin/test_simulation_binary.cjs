const fs = require('fs');
const XLSX = require('xlsx');

const normalizeImportText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/\u0111/g, 'd');

const baselineKey = (stt, content) =>
  `${stt.trim()}|${normalizeImportText(content).replace(/\s+/g, ' ')}`;

const data = fs.readFileSync('../documents/2.Phụ lục 01 Bảng giá HĐ TSM_XLĐTĐ - TBA 110kV Trà Ôn.xlsx', 'binary');
const wb = XLSX.read(data, { type: 'binary' });

const sheetName = 'Scada_TTLL';
const sheet = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const findAppendixHeaderRow = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const norm = (rows[i] || []).map(normalizeImportText);
    const hasStt = norm.some(c => c === 'stt' || c === 'stt.');
    const hasContent = norm.some(c => c.includes('noi dung') || c.includes('mo ta cong viec'));
    if (hasStt && hasContent) return i;
  }
  return -1;
};

const headerRowIndex = findAppendixHeaderRow(rows);
const headerRow = rows[headerRowIndex].map(normalizeImportText);
const sttCol = headerRow.findIndex(c => c === 'stt' || c === 'stt.');
const contentCol = headerRow.findIndex(c => c.includes('noi dung') || c.includes('dien giai') || c.includes('mo ta cong viec'));
const volumeCol = headerRow.findIndex(c => c.includes('khoi luong'));
const unitCol = headerRow.findIndex(c => c === 'dvt' || c.includes('don vi tinh'));

const parsedRows = rows.slice(headerRowIndex + 1);

const pendingTasks = [];
let currentSectionName = 'Mục chung';

const isMainSectionName = (name) => {
  const norm = name.toLowerCase();
  return norm.startsWith('phần ');
};

parsedRows.forEach((row, index) => {
  const actualContent = row[contentCol] !== undefined ? String(row[contentCol]) : String(row[sttCol] || '');
  const content = actualContent.trim();
  if (!content) return;

  const stt = String(row[sttCol] || '').trim();
  const volumeContract = parseFloat(String(row[volumeCol] || '').replace(/,/g, '')) || 0;
  const cleanUnitVal = String(row[unitCol] || '').replace(/^[-–—_.\s]+$/, '').trim();
  const hasNoVolumeAndUnit = (volumeContract === 0 || !volumeContract) && (!cleanUnitVal || cleanUnitVal === '');
  const isSection = (content.trim().toUpperCase().startsWith('PHẦN ') || isMainSectionName(content) || !String(stt || '').trim().replace(/\.$/, '').includes('.')) && hasNoVolumeAndUnit;

  if (isSection) {
    currentSectionName = `${stt ? stt + '. ' : ''}${content}`;
  }

  const effectiveStt = stt;
  pendingTasks.push({
    stt: effectiveStt,
    name: content,
    isSectionHeader: isSection,
    sectionName: currentSectionName
  });
});

console.log('Total parsed with type binary:', pendingTasks.length);
