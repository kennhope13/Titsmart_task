import prisma from './prismaClient';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// Helper to convert excel date serial to Date object
function parseExcelDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const clean = dateVal.trim();
    if (!clean) return null;
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  try {
    const date = new Date((dateVal - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
}

// Helper to convert cell to number
function num(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

async function main() {
  const projectCode = 'TRAM_BIEN_AP_110KV_PHUOC_LY';
  
  // Find project in DB
  const project = await prisma.project.findUnique({
    where: { code: projectCode }
  });

  if (!project) {
    console.error(`Project not found in DB with code: ${projectCode}`);
    return;
  }

  console.log(`Found project: ${project.name} (${project.id})`);

  // Path to the excel file
  const filePath = path.join(__dirname, '../../documents/PHƯỚC LÝ_ Quản lý KH-VT; CHI PHÍ .xlsx');
  if (!fs.existsSync(filePath)) {
    console.error(`Excel file not found at: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  console.log('Opened workbook with sheets:', wb.SheetNames);

  // Clear existing records for this project to prevent duplicates
  console.log('Cleaning up existing plans/costs for Phước Lý...');
  await prisma.projectMaterialPlan.deleteMany({ where: { project_id: project.id } });
  await prisma.projectPurchasing.deleteMany({ where: { project_id: project.id } });
  await prisma.projectExpense.deleteMany({ where: { project_id: project.id } });
  await prisma.laborPayroll.deleteMany({ where: { project_id: project.id } });

  // 1. Import Material Plan
  const planSheetName = wb.SheetNames.find(s => s.includes('KÉ HOẠCH') || s.includes('KẾ HOẠCH'));
  let materialPlanCount = 0;
  if (planSheetName) {
    console.log(`Parsing Material Plan sheet: ${planSheetName}`);
    const sheet = wb.Sheets[planSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    // Row 9 is headers (index 8), data starts from index 10 (row 11)
    const dataRows = rows.slice(10);
    
    for (const row of dataRows) {
      const stt = row[0];
      const jobContent = row[1];
      if (!jobContent || String(jobContent).trim() === '') continue; // Skip empty rows

      await prisma.projectMaterialPlan.create({
        data: {
          project_id: project.id,
          stt: stt ? String(stt).trim() : null,
          job_content: String(jobContent).trim(),
          unit: row[2] ? String(row[2]).trim() : '',
          contract_volume: num(row[3]),
          tech_spec_model: row[4] ? String(row[4]).trim() : '',
          tech_spec_origin: row[5] ? String(row[5]).trim() : '',
          progress_status: row[6] ? String(row[6]).trim() : (row[7] ? String(row[7]).trim() : 'Chưa thi công'),
          ordered_volume: num(row[8]),
          ordered_status: row[9] ? String(row[9]).trim() : 'Chưa đặt hàng',
          expected_date: parseExcelDate(row[10]),
          issue_content: row[11] ? String(row[11]).trim() : '',
          issue_status: row[12] ? String(row[12]).trim() : '',
          doc_co: String(row[13] || '').toLowerCase().includes('x') || row[13] === true || String(row[13] || '') === '1',
          doc_cq: String(row[14] || '').toLowerCase().includes('x') || row[14] === true || String(row[14] || '') === '1',
          doc_fire_inspection: String(row[15] || '').toLowerCase().includes('x') || row[15] === true || String(row[15] || '') === '1',
          dispatch_to_site: String(row[16] || '').toLowerCase().includes('x') || row[16] === true || String(row[16] || '') === '1',
          dispatch_date: parseExcelDate(row[17]),
          notes: row[18] ? String(row[18]).trim() : ''
        }
      });
      materialPlanCount++;
    }
    console.log(`Imported ${materialPlanCount} Material Plans.`);
  }

  // 2. Import Purchasing Plans
  const purchaseSheetName = wb.SheetNames.find(s => s.includes('MUA SẮM'));
  let purchasingCount = 0;
  if (purchaseSheetName) {
    console.log(`Parsing Purchasing sheet: ${purchaseSheetName}`);
    const sheet = wb.Sheets[purchaseSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    // Row 9 is header (index 8), data starts from row 11 (index 10)
    const dataRows = rows.slice(10);

    for (const row of dataRows) {
      const stt = row[0];
      const content = row[1];
      if (!content || String(content).trim() === '') continue;

      await prisma.projectPurchasing.create({
        data: {
          project_id: project.id,
          stt: stt ? String(stt).trim() : null,
          content: String(content).trim(),
          unit: row[2] ? String(row[2]).trim() : '',
          volume_contract: num(row[3]),
          volume_order: num(row[4]),
          unit_price: num(row[5]),
          vat_rate: num(row[6]),
          vat_amount: num(row[7]),
          total_amount: num(row[8]),
          prepay_percent: num(row[9]),
          prepay_amount: num(row[10]),
          remaining_amount: num(row[11]),
          order_status: row[12] ? String(row[12]).trim() : 'Chưa đặt hàng',
          contract_status: row[13] ? String(row[13]).trim() : 'Chưa ký',
          payment_date: parseExcelDate(row[14]),
          invoice_status: row[15] ? String(row[15]).trim() : 'Chưa xuất',
          notes: row[16] ? String(row[16]).trim() : ''
        }
      });
      purchasingCount++;
    }
    console.log(`Imported ${purchasingCount} Purchasing Plans.`);
  }

  // 3. Import Expenses
  const expenseSheetName = wb.SheetNames.find(s => s.includes('CHI PHÍ'));
  let expenseCount = 0;
  if (expenseSheetName) {
    console.log(`Parsing Expense sheet: ${expenseSheetName}`);
    const sheet = wb.Sheets[expenseSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    // Starts at row 13 (index 12)
    const dataRows = rows.slice(12);

    for (const row of dataRows) {
      const stt = row[0];
      const dateVal = row[1];
      const content = row[2];
      
      // Skip row if it doesn't have content or date
      if (!content || String(content).trim() === '' || !dateVal) continue;
      
      const expDate = parseExcelDate(dateVal);
      if (!expDate) continue;

      await prisma.projectExpense.create({
        data: {
          project_id: project.id,
          stt: stt ? String(stt).trim() : null,
          expense_date: expDate,
          content: String(content).trim(),
          description: row[3] ? String(row[3]).trim() : '',
          unit: row[4] ? String(row[4]).trim() : '',
          quantity: num(row[5]),
          unit_price: num(row[6]),
          tax_amount: num(row[7]),
          total_amount: num(row[8]),
          income_amount: num(row[9]),
          balance_fund: num(row[10]),
          notes: row[11] ? String(row[11]).trim() : '',
          invoice_url: row[12] ? String(row[12]).trim() : ''
        }
      });
      expenseCount++;
    }
    console.log(`Imported ${expenseCount} Expenses.`);
  }

  // 4. Import Labor Payroll (Trang tính6 or TT Công nhật)
  const laborSheetName = wb.SheetNames.find(s => s.includes('Trang tính6') || s.includes('TT Công') || s.includes('Luong') || s.includes('CÔNG NHẬT'));
  let laborCount = 0;
  if (laborSheetName) {
    console.log(`Parsing Labor sheet: ${laborSheetName}`);
    const sheet = wb.Sheets[laborSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    // Header is row 6 (index 5), data starts at row 7 (index 6)
    const dataRows = rows.slice(6);

    for (const row of dataRows) {
      const stt = row[0];
      const dateVal = row[1];
      const content = row[2];
      
      if (!content || String(content).trim() === '' || !dateVal) continue;

      const payrollDate = parseExcelDate(dateVal) || new Date();

      await prisma.laborPayroll.create({
        data: {
          project_id: project.id,
          stt: stt ? String(stt).trim() : null,
          payroll_date: payrollDate,
          content: String(content).trim(),
          description: row[3] ? String(row[3]).trim() : '',
          worker_name: row[2] ? String(row[2]).trim() : '', // using content or name if available
          unit: row[4] ? String(row[4]).trim() : '',
          quantity: num(row[5]),
          unit_price: num(row[6]),
          total_amount: num(row[7]),
          bank_account: row[8] ? String(row[8]).trim() : '',
          bank_info: row[9] ? String(row[9]).trim() : '',
          id_card_front_url: row[10] ? String(row[10]).trim() : '',
          id_card_back_url: row[11] ? String(row[11]).trim() : '',
          payment_status: row[12] ? String(row[12]).trim() : 'Chưa thanh toán',
          notes: row[13] ? String(row[13]).trim() : ''
        }
      });
      laborCount++;
    }
    console.log(`Imported ${laborCount} Labor Payrolls.`);
  }

  console.log('\nSeeding completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
