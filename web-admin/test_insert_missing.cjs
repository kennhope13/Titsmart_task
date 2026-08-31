const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nvdonaaxbtqjfmxtlgzb.supabase.co', 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg');

const normalizeImportText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/\u0111/g, 'd');

const baselineKey = (stt, content) =>
  `${stt.trim()}|${normalizeImportText(content).replace(/\s+/g, ' ')}`;

const numVal = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

async function run() {
  // Fetch existing tasks
  const { data: existingTasks } = await supabase.from('tasks').select('stt, name').eq('project_code', 'TRAM_BIEN_AP_110KV_TRA_ON');
  const taskBaselineMap = new Map(existingTasks.map(t => [baselineKey(t.stt || '', t.name || ''), t]));
  console.log('Existing tasks count:', existingTasks.length);

  const data = fs.readFileSync('../documents/2.Phụ lục 01 Bảng giá HĐ TSM_XLĐTĐ - TBA 110kV Trà Ôn.xlsx');
  const wb = XLSX.read(data, { type: 'buffer' });
  const sheetName = 'Scada_TTLL';
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const headerRowIdx = 5;
  const headerRow = rows[headerRowIdx].map(normalizeImportText);
  const sttCol = headerRow.findIndex(c => c === 'stt' || c === 'stt.');
  const contentCol = headerRow.findIndex(c => c.includes('noi dung') || c.includes('dien giai') || c.includes('mo ta cong viec'));
  const volumeCol = headerRow.findIndex(c => c.includes('khoi luong'));
  const unitCol = headerRow.findIndex(c => c === 'dvt' || c.includes('don vi tinh'));

  const parsedRows = rows.slice(headerRowIdx + 1);
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
      const rowId = crypto.randomUUID();
      pendingTasks.push({
        id: rowId,
        stt: effectiveStt,
        code: rowId,
        name: content,
        project_code: 'TRAM_BIEN_AP_110KV_TRA_ON',
        project_name: 'Trạm biến áp 110kV Trà Ôn',
        volume: isSection ? 0 : volumeContract,
        unit: isSection ? '' : String(row[unitCol] || ''),
        progress: 0,
        status: 'Chưa làm',
        purchase_status: isSection ? '' : 'Chưa đặt hàng',
        constr_status: isSection ? '' : 'Chưa thi công',
        is_done: false,
        is_section_header: isSection,
        section_name: currentSectionName
      });
    }
  });

  console.log('Attempting to insert:', pendingTasks.length, 'tasks');
  if (pendingTasks.length > 0) {
    const { data: inserted, error } = await supabase.from('tasks').insert(pendingTasks).select();
    console.log('Error:', error);
    console.log('Inserted count:', inserted ? inserted.length : 0);
  }
}

run();
