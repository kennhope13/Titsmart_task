const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const docsDir = path.join(__dirname, '../documents');

// Date conversion utility
function parseExcelDate(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal;
  try {
    const date = new Date((dateVal - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return String(dateVal);
  }
}

// Convert cell to number safely
function num(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Project files to read
const projectFiles = [
  { file: 'NĂM CĂN_ Quản lý KH-VT; CHI PHÍ .xlsx', code: 'NĂM CĂN' },
  { file: 'PHƯỚC LÝ_ Quản lý KH-VT; CHI PHÍ .xlsx', code: 'PHƯỚC LÝ' },
  { file: 'PHƯỚC TÂN_ Quản lý KH-VT; CHI PHÍ .xlsx', code: 'PHƯỚC TÂN' },
  { file: 'QL KH-VT; CHI PHÍ DỰ ÁN ĐẮK R\'LẤP.xlsx', code: 'DAKRLAP' }
];

const allMaterialPlans = [];
const allPurchasingPlans = [];
const allExpenses = [];
const allLaborPayrolls = [];
const allDocumentTracks = [];

// 1. Process Project Cost & Plan Files
projectFiles.forEach(proj => {
  const filePath = path.join(docsDir, proj.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  
  // A. Parse Material Plan
  const planSheetName = wb.SheetNames.find(s => s.includes('KÉ HOẠCH') || s.includes('KẾ HOẠCH'));
  if (planSheetName) {
    const sheet = wb.Sheets[planSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Data starts from row 11 (index 10) or row 10 (index 9)
    // Row 9 (index 8) is header
    const dataRows = rows.slice(10);
    dataRows.forEach((row, idx) => {
      const stt = row[0];
      const jobContent = row[1];
      if (!jobContent) return; // skip empty rows
      
      allMaterialPlans.push({
        id: `pl-${proj.code}-${idx}-${Date.now()}`,
        stt: String(stt || ''),
        projectCode: proj.code,
        jobContent: String(jobContent),
        unit: String(row[2] || ''),
        contractVolume: num(row[3]),
        techSpecModel: String(row[4] || ''),
        techSpecOrigin: String(row[5] || ''),
        progressStatus: String(row[6] || row[7] || ''),
        orderedVolume: num(row[8]),
        orderedStatus: String(row[9] || ''),
        expectedDate: parseExcelDate(row[10]),
        issueContent: String(row[11] || ''),
        issueStatus: String(row[12] || ''),
        docCo: String(row[13] || '').toLowerCase().includes('x') || row[13] === true || String(row[13] || '').includes('1'),
        docCq: String(row[14] || '').toLowerCase().includes('x') || row[14] === true || String(row[14] || '').includes('1'),
        docFireInspection: String(row[15] || '').toLowerCase().includes('x') || row[15] === true || String(row[15] || '').includes('1'),
        dispatchToSite: String(row[16] || '').toLowerCase().includes('x') || row[16] === true || String(row[16] || '').includes('1'),
        dispatchDate: parseExcelDate(row[17]),
        notes: String(row[18] || '')
      });
    });
  }

  // B. Parse Purchasing
  const purchaseSheetName = wb.SheetNames.find(s => s.includes('MUA SẮM'));
  if (purchaseSheetName) {
    const sheet = wb.Sheets[purchaseSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rows.slice(10); // starts after headers
    dataRows.forEach((row, idx) => {
      const stt = row[0];
      const content = row[1];
      if (!content) return;
      
      allPurchasingPlans.push({
        id: `pur-${proj.code}-${idx}-${Date.now()}`,
        stt: String(stt || ''),
        projectCode: proj.code,
        content: String(content),
        unit: String(row[2] || ''),
        volumeContract: num(row[3]),
        volumeOrder: num(row[4]),
        unitPrice: num(row[5]),
        vatRate: num(row[6]),
        vatAmount: num(row[7]),
        totalAmount: num(row[8]),
        prepayPercent: num(row[9]),
        prepayAmount: num(row[10]),
        remainingAmount: num(row[11]),
        orderStatus: String(row[12] || ''),
        contractStatus: String(row[13] || ''),
        paymentDate: parseExcelDate(row[14]),
        invoiceStatus: String(row[15] || ''),
        notes: String(row[16] || '')
      });
    });
  }

  // C. Parse Expenses (THEO DÕI CHI PHÍ CT)
  const expenseSheetName = wb.SheetNames.find(s => s.includes('CHI PHÍ'));
  if (expenseSheetName) {
    const sheet = wb.Sheets[expenseSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Row 13 (index 12) is the start of the list. Wait, in Năm Căn it started at row 15 (index 14)
    // Let's filter rows that have a date in index 1 and some content.
    const dataRows = rows.slice(12);
    dataRows.forEach((row, idx) => {
      const dateVal = row[1];
      const content = row[2];
      if (!dateVal || !content) return; // skip headings like THÁNG 7 or empty rows
      
      allExpenses.push({
        id: `exp-${proj.code}-${idx}-${Date.now()}`,
        stt: String(row[0] || ''),
        projectCode: proj.code,
        date: parseExcelDate(dateVal),
        content: String(content),
        description: String(row[3] || ''),
        unit: String(row[4] || ''),
        quantity: num(row[5]),
        unitPrice: num(row[6]),
        taxAmount: num(row[7]),
        totalAmount: num(row[8]), // THÀNH TIỀN
        incomeAmount: num(row[9]), // THU
        balanceFund: num(row[10]), // TỒN QUỸ
        notes: String(row[11] || ''),
        invoiceUrl: String(row[12] || '')
      });
    });
  }

  // D. Parse Daily Labor (Trang tính6 or TT Công Nhật)
  const laborSheetName = wb.SheetNames.find(s => s.includes('Trang tính6') || s.includes('TT Công Nhật'));
  if (laborSheetName) {
    const sheet = wb.Sheets[laborSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rows.slice(6); // Starts at Row 7 or 8. Header is row 6 (index 5)
    dataRows.forEach((row, idx) => {
      const stt = row[0];
      const dateVal = row[1];
      const content = row[2];
      if (!content) return; // skip empty rows
      
      allLaborPayrolls.push({
        id: `lab-${proj.code}-${idx}-${Date.now()}`,
        stt: String(stt || ''),
        projectCode: proj.code,
        date: String(dateVal || ''),
        content: String(content),
        description: String(row[3] || ''),
        unit: String(row[4] || ''),
        quantity: num(row[5]),
        unitPrice: num(row[6]),
        totalAmount: num(row[7]),
        bankAccount: String(row[8] || ''),
        bankInfo: String(row[9] || ''),
        idCardFrontUrl: String(row[10] || ''),
        idCardBackUrl: String(row[11] || ''),
        paymentStatus: String(row[12] || 'Chưa thanh toán'),
        notes: String(row[13] || '')
      });
    });
  }
});

// 2. Process Document Tracking File
const docFilePath = path.join(docsDir, 'THEO DÕI HỒ SƠ ĐÃ GỬI ĐI.xlsx');
if (fs.existsSync(docFilePath)) {
  const wb = XLSX.readFile(docFilePath);
  const sheetName = wb.SheetNames.find(s => s.includes('HỒ SƠ'));
  if (sheetName) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rows.slice(2); // starts at Row 3 (index 2)
    dataRows.forEach((row, idx) => {
      const stt = row[0];
      const contractNo = row[1];
      const contractName = row[2];
      if (!contractName) return; // skip empty rows
      
      // Try to find the matching projectCode from the project name in row[3]
      let projectCode = String(row[3] || 'KHÁC');
      const upperProj = projectCode.toUpperCase();
      if (upperProj.includes('NĂM CĂN')) projectCode = 'NĂM CĂN';
      else if (upperProj.includes('PHƯỚC LÝ')) projectCode = 'PHƯỚC LÝ';
      else if (upperProj.includes('PHƯỚC TÂN')) projectCode = 'PHƯỚC TÂN';
      else if (upperProj.includes('ĐẮK') || upperProj.includes('DAK')) projectCode = 'DAKRLAP';

      allDocumentTracks.push({
        id: `doc-${idx}-${Date.now()}`,
        stt: String(stt || ''),
        contractNo: String(contractNo || ''),
        contractName: String(contractName),
        projectCode: projectCode,
        company: String(row[4] || ''),
        receiverName: String(row[5] || ''),
        phone: String(row[6] || ''),
        address: String(row[7] || ''),
        sendDate: parseExcelDate(row[8]),
        receiveDate: parseExcelDate(row[9]),
        docStatus: String(row[10] || 'Chưa nhận'),
        side: String(row[11] || ''),
        contractValue: num(row[12]),
        prepayPercent: num(row[13]),
        prepayAmount: num(row[14]),
        paymentStatus: String(row[15] || 'Chưa thanh toán'),
        isCompleted: row[16] === true || String(row[16]).toLowerCase() === 'true' || String(row[16]).includes('1'),
        notes: String(row[17] || '')
      });
    });
  }
}

// 3. Write all extracted data to JSON
const outputData = {
  materialPlans: allMaterialPlans,
  purchasingPlans: allPurchasingPlans,
  expenses: allExpenses,
  laborPayrolls: allLaborPayrolls,
  documentTracks: allDocumentTracks
};

const outputPath = path.join(__dirname, 'src/services/projectManagementSeedData.json');
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log('Seed data extracted successfully!');
console.log('Total Material Plans:', allMaterialPlans.length);
console.log('Total Purchasing Plans:', allPurchasingPlans.length);
console.log('Total Expenses:', allExpenses.length);
console.log('Total Labor Payrolls:', allLaborPayrolls.length);
console.log('Total Document Tracks:', allDocumentTracks.length);
