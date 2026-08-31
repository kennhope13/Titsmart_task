const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

const normalizeImportText = (text) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
const numVal = (val) => { if (typeof val === 'number') return val; const p = parseFloat(String(val).replace(/,/g, '')); return isNaN(p) ? 0 : p; };
const isMainSectionName = (name) => name.toLowerCase().startsWith('phần ');

async function run() {
  const data = fs.readFileSync('../documents/2.Phụ lục 01 Bảng giá HĐ TSM_XLĐTĐ - TBA 110kV Trà Ôn.xlsx');
  const workbook = XLSX.read(data, { type: 'buffer' });
  const pendingTasks = [];
  const sttIdMap = new Map();
  
  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const normalizedRow = (rows[i] || []).map(normalizeImportText);
      if (normalizedRow.some((cell) => cell === 'stt' || cell === 'stt.') && normalizedRow.some((cell) => cell.includes('noi dung') || cell.includes('mo ta cong viec'))) {
        headerRowIdx = i; break;
      }
    }
    const headerRow = rows[headerRowIdx].map(normalizeImportText);
    const sttCol = headerRow.findIndex((h) => h === 'stt' || h === 'stt.');
    const contentCol = headerRow.findIndex((h) => h.includes('noi dung') || h.includes('mo ta cong viec'));
    const unitCol = headerRow.findIndex((h) => h === 'dvt' || h === 'don vi tinh' || h === 'd.v.t');
    const volCol = headerRow.findIndex((h) => h.includes('khoi luong') || h === 'kl' || h.includes('k.luong'));
    let currentSectionName = 'Mục chung';
    rows.slice(headerRowIdx + 1).forEach((row) => {
      if (row.every((cell) => !cell || String(cell).trim() === '')) return;
      const stt = String(row[sttCol] || '').trim();
      const content = String(row[contentCol] || '').trim();
      if (!content) return;
      const volumeContract = numVal(row[volCol]);
      const cleanStt = String(stt || '').trim().replace(/\.$/, '');
      const hasNoDot = !cleanStt.includes('.');
      const startsWithPhan = content.trim().toUpperCase().startsWith('PHẦN ');
      const cleanUnitVal = String(row[unitCol] || '').replace(/^[-–—_.\s]+$/, '').trim();
      const hasNoVolumeAndUnit = (volumeContract === 0 || !volumeContract) && (!cleanUnitVal || cleanUnitVal === '');
      const isSection = (startsWithPhan || isMainSectionName(content) || hasNoDot) && hasNoVolumeAndUnit;
      if (isSection) currentSectionName = `${stt ? stt + '. ' : ''}${content}`;
      const rowId = crypto.randomUUID();
      
      pendingTasks.push({
        id: rowId,
        stt: stt,
        code: rowId,
        name: content,
        project_code: 'TRAM_BIEN_AP_110KV_TRA_ON',
        project_name: 'Trạm biến áp 110kV Trà Ôn',
        volume: isSection ? 0 : volumeContract,
        unit: isSection ? '' : String(row[unitCol] || ''),
        is_section_header: isSection,
        section_name: currentSectionName
      });
    });
  });
  console.log('Inserting', pendingTasks.length);
  const { data: res, error } = await supabase.from('tasks').insert(pendingTasks).select('stt');
  console.log('Error:', error);
  console.log('Inserted rows:', res ? res.length : 0);
  if (res && res.length < 45) {
    const insertedStts = res.map(r => r.stt);
    console.log('Missing:', pendingTasks.map(t => t.stt).filter(stt => !insertedStts.includes(stt)));
  }
}
run();
