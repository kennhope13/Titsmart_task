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

const data = fs.readFileSync('../documents/2. PL01 bang gia tri hop dong THIFACO-TSM rev17.04.26.xlsx');
const wb = XLSX.read(data, { type: 'buffer' });

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

const taskBaselineMap = new Map(); // empty
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
  const rowKey = baselineKey(effectiveStt, content);

  const existingTask = taskBaselineMap.get(rowKey);
  if (!existingTask) {
    pendingTasks.push({
      stt: effectiveStt,
      name: content,
      isSectionHeader: isSection,
      sectionName: currentSectionName
    });
    taskBaselineMap.set(rowKey, { name: content });
  }
});

console.log('Total parsed in pendingTasks:', pendingTasks.length);
console.log('PendingTasks STTs:', pendingTasks.map(t => t.stt).join(', '));
