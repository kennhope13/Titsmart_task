const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

const numVal = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const normalizeImportText = (txt) => String(txt || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const isMainSectionName = (name) => {
  const upper = name.trim().toUpperCase();
  return upper.startsWith('PHẦN') || upper.startsWith('HẠNG MỤC');
};

const toSnakeCase = (obj) => {
  const snakeObj = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = obj[key];
  }
  return snakeObj;
};

async function runImport() {
  const fileName = '2.Phụ lục 01 Bảng giá HĐ TSM_XLĐTĐ - TBA 110kV Trà Ôn.xlsx';
  const workbook = XLSX.readFile('../documents/' + fileName);
  const selectedProject = 'TRAM_BIEN_AP_110KV_TRA_ON';
  
  const purchasingPayloads = [];
  const materialPayloads = [];
  const pendingTasks = [];

  workbook.SheetNames.forEach((sheetName) => {
    if (sheetName.toLowerCase().includes('tổng hợp') || sheetName.toLowerCase().includes('tong hop')) return;

    const sheet = workbook.Sheets[sheetName];
    const parsedRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    let headerRowIdx = -1;
    let headerRow = [];
    for (let i = 0; i < Math.min(parsedRows.length, 30); i++) {
      const normalizedRow = (parsedRows[i] || []).map(normalizeImportText);
      const hasStt = normalizedRow.some((cell) => cell === 'stt' || cell === 'stt.');
      const hasContent = normalizedRow.some((cell) => cell.includes('noi dung') || cell.includes('mo ta cong viec'));
      if (hasStt && hasContent) {
        headerRowIdx = i;
        headerRow = parsedRows[i];
        break;
      }
    }
    
    if (headerRowIdx === -1) return;

    const normalizedHeaders = headerRow.map(normalizeImportText);
    const sttCol = normalizedHeaders.findIndex((h) => h === 'stt' || h === 'stt.');
    const contentCol = normalizedHeaders.findIndex((h) => h.includes('noi dung') || h.includes('mo ta cong viec'));
    const unitCol = normalizedHeaders.findIndex((h) => h === 'dvt' || h === 'don vi tinh' || h === 'd.v.t');
    const volCol = normalizedHeaders.findIndex((h) => h.includes('khoi luong') || h === 'kl' || h.includes('k.luong'));
    const modelCol = normalizedHeaders.findIndex((h) => h.includes('ma hieu') || h.includes('ky ma hieu'));
    const originCol = normalizedHeaders.findIndex((h) => h.includes('nguon san xuat') || h.includes('xuat xu') || h.includes('nsx'));
    const priceCol = normalizedHeaders.findIndex((h) => h === 'don gia');
    const totalBeforeVatCol = normalizedHeaders.findIndex((h) => h.includes('thanh tien truoc thue vat') || h.includes('thanh tien truoc thue'));
    const vatRateCol = normalizedHeaders.findIndex((h) => h === 'thue vat %' || h === 'thue vat (%)' || h === 'vat %' || h === 'vat(%)');
    const vatAmountCol = normalizedHeaders.findIndex((h) => h === 'tien thue' || h === 'tien vat');
    const totalCol = normalizedHeaders.findIndex((h) => h === 'tong tien' || h === 'thanh tien sau thue');
    const notesCol = normalizedHeaders.findIndex((h) => h === 'ghi chu' || h.includes('ghi chu'));

    let currentMainSectionId = undefined;
    let currentSubSectionId = undefined;
    let globalOrder = 0;
    const sttIdMap = new Map();

    const dataRows = parsedRows.slice(headerRowIdx + 1);
    dataRows.forEach((row, index) => {
      if (row.every((cell) => !cell || String(cell).trim() === '')) return;
      
      const stt = String(row[sttCol] || '').trim();
      const content = String(row[contentCol] || '').trim();
      if (!content) return;
      
      const volumeContract = numVal(row[volCol]);
      const unitPrice = numVal(row[priceCol]);
      const totalBeforeVat = numVal(row[totalBeforeVatCol]);
      
      let rawVatRate = row[vatRateCol];
      let vatRate = 0;
      if (rawVatRate !== undefined && rawVatRate !== '') {
         const strVat = String(rawVatRate).replace('%', '').trim();
         vatRate = parseFloat(strVat);
         if (isNaN(vatRate)) vatRate = 0;
      }
      const vatAmount = numVal(row[vatAmountCol]);
      const totalAmount = numVal(row[totalCol]);

      const cleanStt = String(stt || '').trim().replace(/\.$/, '');
      const hasNoDot = !cleanStt.includes('.');
      const startsWithPhan = content.trim().toUpperCase().startsWith('PHẦN ');
      const cleanUnitVal = String(row[unitCol] || '').replace(/^[-–—_.\s]+$/, '').trim();
      const hasNoVolumeAndUnit = (volumeContract === 0 || !volumeContract) && (!cleanUnitVal || cleanUnitVal === '');

      const isSection = (startsWithPhan || isMainSectionName(content) || hasNoDot) && hasNoVolumeAndUnit && hasNoDot;

      const supplyScope = "unknown";
      const rowId = crypto.randomUUID();
      if (stt) sttIdMap.set(stt, rowId);

      let parentId = undefined;
      if (isSection) {
        currentMainSectionId = rowId;
        currentSubSectionId = undefined;
      } else {
        let isSubFolder = false;
        const nextRow = dataRows[index + 1];
        if (nextRow) {
          const nextStt = String(nextRow[sttCol] || '').trim();
          if (nextStt && nextStt.startsWith(stt + '.')) {
            isSubFolder = true;
          }
        }
        
        let foundDottedParent = false;
        if (stt.includes('.')) {
          const parts = stt.split('.');
          parts.pop();
          const parentStt = parts.join('.');
          if (sttIdMap.has(parentStt)) {
            parentId = sttIdMap.get(parentStt);
            foundDottedParent = true;
          }
        }
        
        if (!foundDottedParent) {
          if (stt && !stt.includes('.')) {
            parentId = currentMainSectionId;
          } else {
            parentId = currentSubSectionId || currentMainSectionId;
          }
        }
        
        if (isSubFolder) {
          currentSubSectionId = rowId;
        }
      }

      const orderTag = `[order:${String(++globalOrder).padStart(5, '0')}]`;
      const baseNote = [isSection ? '[section]' : '', orderTag, String(row[notesCol] || ''), sheetName].filter(Boolean).join(' | ');

      materialPayloads.push({
        id: rowId,
        parentId: parentId || null,
        projectCode: selectedProject,
        stt: stt,
        jobContent: content,
        unit: String(row[unitCol] || ''),
        contractVolume: volumeContract,
        techSpecModel: modelCol >= 0 ? String(row[modelCol] || '') : '',
        techSpecOrigin: originCol >= 0 ? String(row[originCol] || '') : '',
        progressStatus: 'Chưa thi công',
        orderedVolume: 0,
        orderedStatus: 'Chưa đặt hàng',
        expectedDate: '',
        issueContent: '',
        supplyScope,
        notes: baseNote,
      });

      const computedVatAmount = vatAmount || (vatRate ? totalBeforeVat * vatRate / 100 : 0);
      const totalWithVat = totalAmount || totalBeforeVat + computedVatAmount;

      purchasingPayloads.push({
        id: rowId,
        parentId: parentId || null,
        projectCode: selectedProject,
        stt: stt,
        content: content,
        unit: String(row[unitCol] || ''),
        volumeContract,
        volumeOrder: 0,
        unitPrice,
        vatRate,
        vatAmount: computedVatAmount,
        totalAmount: totalWithVat,
        prepayPercent: 0,
        prepayAmount: 0,
        remainingAmount: totalWithVat,
        orderStatus: 'Chưa đặt hàng',
        contractStatus: 'Đã có phụ lục',
        invoiceStatus: 'Chưa xuất',
        notes: baseNote,
      });

      pendingTasks.push({
        id: rowId,
        parent_id: parentId || null,
        stt: stt,
        code: rowId,
        name: content,
        project_code: selectedProject,
        project_name: 'Trạm biến áp 110kV Trà Ôn',
        volume: isSection ? 0 : volumeContract,
        unit: isSection ? '' : String(row[unitCol] || ''),
        progress: 0,
        status: 'Chưa làm',
        purchase_status: isSection ? '' : 'Chưa đặt hàng',
        constr_status: isSection ? '' : 'Chưa thi công',
        is_done: false,
        is_section_header: isSection,
section_name: currentSectionName,
        notes: baseNote
      });
    });
  });

  console.log(`Inserting ${materialPayloads.length} materials...`);
  const mPayloads = materialPayloads.map(toSnakeCase);
  const { error: e1 } = await supabase.from('material_plans').insert(mPayloads);
  if (e1) console.error('Error inserting materials:', e1);

  console.log(`Inserting ${purchasingPayloads.length} purchasings...`);
  const pPayloads = purchasingPayloads.map(toSnakeCase);
  const { error: e2 } = await supabase.from('purchasing_plans').insert(pPayloads);
  if (e2) console.error('Error inserting purchasings:', e2);

  console.log(`Inserting ${pendingTasks.length} tasks...`);
  const { error: e3 } = await supabase.from('tasks').insert(pendingTasks);
  if (e3) console.error('Error inserting tasks:', e3);
  
  console.log('Done!');
}

runImport();
