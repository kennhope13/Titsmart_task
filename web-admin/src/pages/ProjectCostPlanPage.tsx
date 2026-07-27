import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export const ProjectCostPlanPage: React.FC = () => {
  const {
    projects,
    materialPlans,
    purchasingPlans,
    expenses,
    laborPayrolls,
    addMaterialPlan,
    updateMaterialPlan,
    deleteMaterialPlan,
    addPurchasingPlan,
    updatePurchasingPlan,
    deletePurchasingPlan,
    addExpense,
    updateExpense,
    deleteExpense,
    addLaborPayroll,
    updateLaborPayroll,
    deleteLaborPayroll,
  } = useRealtimeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const normalizeImportText = (value: any) => String(value || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\u0111/g, 'd');

        const workbookPreviewText = wb.SheetNames
          .map((name) => {
            const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1 }).slice(0, 12);
            return [name, ...rows.flat().map((cell) => String(cell || ''))].join(' ');
          })
          .join(' ');
        const normalizedWorkbookPreview = normalizeImportText(workbookPreviewText);
        const isAppendixWorkbook = normalizedWorkbookPreview.includes('phu luc 01')
          || normalizedWorkbookPreview.includes('bang chi tiet gia tri hop dong')
          || normalizeImportText(file.name).includes('pl01');
        
        // Ensure this is indeed a Cost Plan / Material Plan workbook
        const costKeywords = ['KẾ HOẠCH', 'KÉ HOẠCH', 'MUA SẮM', 'CHI PHÍ', 'CÔNG NHẬT', 'LƯƠNG'];
        const hasCostSheets = wb.SheetNames.some(name => 
          costKeywords.some(keyword => name.toUpperCase().includes(keyword))
        );
        const forbiddenKeywords = ['TỒN KHO', 'NHẬP KHO', 'XUẤT KHO', 'TONKHO', 'NHAPKHO', 'XUATKHO', 'NHÂN SỰ', 'NHANSU', 'HỒ SƠ GỬI', 'HOSO'];
        const hasForbiddenSheets = wb.SheetNames.some(name => 
          forbiddenKeywords.some(keyword => name.toUpperCase().includes(keyword))
        );
        const hasAppendixBaseline = materialPlans.some((plan) => plan.projectCode === selectedProject)
          || purchasingPlans.some((plan) => plan.projectCode === selectedProject);
        if (hasCostSheets && !isAppendixWorkbook && !hasAppendixBaseline) {
          triggerToast('Vui l\u00f2ng nh\u1eadp ph\u1ee5 l\u1ee5c PL01 tr\u01b0\u1edbc, sau \u0111\u00f3 m\u1edbi nh\u1eadp/c\u1eadp nh\u1eadt c\u00e1c ph\u00e1t sinh.', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        if ((!hasCostSheets && !isAppendixWorkbook) || hasForbiddenSheets) {
          triggerToast('File này không phải là file Quản lý Chi phí/Kế hoạch phù hợp. Vui lòng chọn đúng file dự án!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        const parseExcelDate = (dateVal: any) => {
          if (!dateVal) return '';
          if (typeof dateVal === 'string') return dateVal;
          try {
            const date = new Date((dateVal - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
          } catch (e) {
            return String(dateVal);
          }
        };

        const numVal = (val: any) => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        const baselineKey = (stt: string, content: string) =>
          `${stt.trim()}|${normalizeImportText(content).replace(/\\s+/g, ' ')}`;
        
        const materialBaselineMap = new Map(
          materialPlans
            .filter((plan) => plan.projectCode === selectedProject)
            .map((plan) => [baselineKey(plan.stt || '', plan.jobContent || ''), plan])
        );
        
        const purchasingBaselineMap = new Map(
          purchasingPlans
            .filter((plan) => plan.projectCode === selectedProject)
            .map((plan) => [baselineKey(plan.stt || '', plan.content || ''), plan])
        );

        const importAppendixWorkbook = () => {
          let appendixMaterialCount = 0;
          let appendixPurchasingCount = 0;

          const findAppendixHeaderRow = (rows: any[][]) => {
            for (let i = 0; i < Math.min(rows.length, 30); i++) {
              const normalizedRow = (rows[i] || []).map(normalizeImportText);
              const hasStt = normalizedRow.some((cell) => cell === 'stt' || cell === 'stt.');
              const hasContent = normalizedRow.some((cell) => cell.includes('noi dung') || cell.includes('mo ta cong viec'));
              const hasVolume = normalizedRow.some((cell) => cell.includes('khoi luong'));
              const hasUnitPrice = normalizedRow.some((cell) => cell.includes('don gia'));
              if (hasStt && hasContent && hasVolume && hasUnitPrice) return i;
            }
            return -1;
          };
          const getColumnIndex = (headerRow: any[], candidates: string[], fallback: number) => {
            const normalizedHeader = headerRow.map(normalizeImportText);
            const found = normalizedHeader.findIndex((cell) => candidates.some((candidate) => cell.includes(candidate)));
            return found >= 0 ? found : fallback;
          };

          wb.SheetNames.forEach((sheetName) => {
            const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1, defval: '' });
            const headerRowIndex = findAppendixHeaderRow(rows);
            if (headerRowIndex === -1) return;

            const headerRow = rows[headerRowIndex] || [];
            const sttCol = getColumnIndex(headerRow, ['stt'], 0);
            const contentCol = getColumnIndex(headerRow, ['noi dung', 'mo ta cong viec'], 1);
            const volumeCol = getColumnIndex(headerRow, ['khoi luong'], 2);
            const unitCol = getColumnIndex(headerRow, ['don vi tinh', 'dvt'], 3);
            const modelCol = getColumnIndex(headerRow, ['ma hieu', 'model'], -1);
            const originCol = getColumnIndex(headerRow, ['nguon san xuat', 'xuat xu'], -1);
            const unitPriceCol = getColumnIndex(headerRow, ['don gia'], modelCol >= 0 ? 6 : 4);
            const preTaxCol = getColumnIndex(headerRow, ['thanh tien'], unitPriceCol + 1);
            const vatRateCol = getColumnIndex(headerRow, ['thue vat'], preTaxCol + 1);
            const vatAmountCol = vatRateCol + 1;
            const totalCol = getColumnIndex(headerRow, ['tong tien'], vatAmountCol + 1);
            const notesCol = getColumnIndex(headerRow, ['ghi chu'], totalCol + 1);

            rows.slice(headerRowIndex + 1).forEach((row) => {
              const content = String(row[contentCol] || '').trim();
              if (!content) return;

              const stt = String(row[sttCol] || '').trim();
              const volumeContract = numVal(row[volumeCol]);
              const unitPrice = numVal(row[unitPriceCol]);
              const totalBeforeVat = numVal(row[preTaxCol]) || volumeContract * unitPrice;
              const totalAmount = numVal(row[totalCol]) || totalBeforeVat;
              const vatRate = numVal(row[vatRateCol]);
              const vatAmount = numVal(row[vatAmountCol]);
              const normalizedContent = normalizeImportText(content);
              const isSummaryRow = normalizedContent.includes('tong cong') || (!stt && normalizedContent === 'cong');
              if (isSummaryRow) return;

              const rowKey = baselineKey(stt, content);
              const baseNote = [String(row[notesCol] || ''), sheetName].filter(Boolean).join(' | ');
              const existingMaterial = materialBaselineMap.get(rowKey);
              if (existingMaterial) {
                updateMaterialPlan(existingMaterial.id, {
                  stt,
                  jobContent: content,
                  unit: String(row[unitCol] || ''),
                  contractVolume: volumeContract,
                  techSpecModel: modelCol >= 0 ? String(row[modelCol] || '') : '',
                  techSpecOrigin: originCol >= 0 ? String(row[originCol] || '') : '',
                  notes: existingMaterial.notes || baseNote,
                });
              } else {
                addMaterialPlan({
                  projectCode: selectedProject,
                  stt,
                  jobContent: content,
                  unit: String(row[unitCol] || ''),
                  contractVolume: volumeContract,
                  techSpecModel: modelCol >= 0 ? String(row[modelCol] || '') : '',
                  techSpecOrigin: originCol >= 0 ? String(row[originCol] || '') : '',
                  progressStatus: 'Ch\u01b0a thi c\u00f4ng',
                  orderedVolume: 0,
                  orderedStatus: 'Ch\u01b0a \u0111\u1eb7t h\u00e0ng',
                  issueContent: '',
                  notes: baseNote,
                });
                materialBaselineMap.set(rowKey, { id: '', projectCode: selectedProject, stt, jobContent: content, unit: String(row[unitCol] || ''), contractVolume: volumeContract } as ProjectMaterialPlan);
              }
              appendixMaterialCount++;

              if (volumeContract > 0 || unitPrice > 0 || totalAmount > 0) {
                const computedVatAmount = vatAmount || (vatRate ? totalBeforeVat * vatRate / 100 : 0);
                const totalWithVat = totalAmount || totalBeforeVat + computedVatAmount;

                const existingPurchasing = purchasingBaselineMap.get(rowKey);
                if (existingPurchasing) {
                  updatePurchasingPlan(existingPurchasing.id, {
                    stt,
                    content,
                    unit: String(row[unitCol] || ''),
                    volumeContract,
                    unitPrice,
                    vatRate,
                    vatAmount: computedVatAmount,
                    totalAmount: totalWithVat,
                    remainingAmount: Math.max(0, totalWithVat - (existingPurchasing.prepayAmount || 0)),
                    notes: existingPurchasing.notes || baseNote,
                  });
                } else {
                  addPurchasingPlan({
                    projectCode: selectedProject,
                    stt,
                    content,
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
                    orderStatus: 'Ch\u01b0a \u0111\u1eb7t h\u00e0ng',
                    contractStatus: '\u0110\u00e3 c\u00f3 ph\u1ee5 l\u1ee5c',
                    invoiceStatus: 'Ch\u01b0a xu\u1ea5t',
                    notes: baseNote,
                  });
                  purchasingBaselineMap.set(rowKey, { id: '', projectCode: selectedProject, stt, content, unit: String(row[unitCol] || ''), volumeContract, volumeOrder: 0, unitPrice, vatRate, vatAmount: computedVatAmount, totalAmount: totalWithVat, prepayPercent: 0, prepayAmount: 0, remainingAmount: totalWithVat, orderStatus: '', contractStatus: '', invoiceStatus: '' } as ProjectPurchasing);
                }
                appendixPurchasingCount++;
              }
            });
          });

          return { appendixMaterialCount, appendixPurchasingCount };
        };

        if (isAppendixWorkbook) {
          const { appendixMaterialCount, appendixPurchasingCount } = importAppendixWorkbook();
          if (appendixMaterialCount === 0 && appendixPurchasingCount === 0) {
            triggerToast('Kh\u00f4ng t\u00ecm th\u1ea5y b\u1ea3ng ph\u1ee5 l\u1ee5c PL01 h\u1ee3p l\u1ec7 trong file Excel n\u00e0y.', 'warning');
          } else {
            triggerToast(
              `\u0110\u00e3 nh\u1eadp ph\u1ee5 l\u1ee5c PL01 cho d\u1ef1 \u00e1n ${selectedProject}: ${appendixMaterialCount} d\u00f2ng h\u1ea1ng m\u1ee5c, ${appendixPurchasingCount} d\u00f2ng gi\u00e1 tr\u1ecb h\u1ee3p \u0111\u1ed3ng.`,
              'success'
            );
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const materialSheetName = wb.SheetNames.find(s => s.includes('KÉ HOẠCH') || s.includes('KẾ HOẠCH') || s.includes('KeHoach'));
        const purchasingSheetName = wb.SheetNames.find(s => s.includes('MUA SẮM') || s.includes('MuaSam'));
        const expenseSheetName = wb.SheetNames.find(s => s.includes('CHI PHÍ') || s.includes('ChiPhi'));
        const laborSheetName = wb.SheetNames.find(s => s.includes('Trang tính6') || s.includes('CÔNG NHẬT') || s.includes('TT Công') || s.includes('Luong'));

        let matImportCount = 0;
        let purImportCount = 0;
        let expImportCount = 0;
        let labImportCount = 0;

        const findStartRow = (sheetRows: any[][]) => {
          for (let i = 0; i < Math.min(sheetRows.length, 20); i++) {
            const r = sheetRows[i];
            if (r && (r.includes('STT') || r.includes('stt') || r.includes('Stt') || r.some((cell: any) => String(cell).toLowerCase() === 'stt'))) {
              return i + 1;
            }
          }
          return -1;
        };

        // 1. Parse Material Plan
        if (materialSheetName) {
          const sheet = wb.Sheets[materialSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const jobContent = row[1];
              if (!jobContent) return;
              
              const stt = String(row[0] || '');
              const contentStr = String(jobContent);
              const rKey = baselineKey(stt, contentStr);
              const existing = materialBaselineMap.get(rKey);

              const updateData = {
                progressStatus: String(row[6] || row[7] || 'Chưa thi công'),
                orderedVolume: numVal(row[8]),
                orderedStatus: String(row[9] || 'Chưa đặt hàng'),
                expectedDate: parseExcelDate(row[10]),
                issueContent: String(row[11] || ''),
                docCo: String(row[13] || '').toLowerCase().includes('x') || row[13] === true || String(row[13] || '') === '1',
                docCq: String(row[14] || '').toLowerCase().includes('x') || row[14] === true || String(row[14] || '') === '1',
                docFireInspection: String(row[15] || '').toLowerCase().includes('x') || row[15] === true || String(row[15] || '') === '1',
                dispatchToSite: String(row[16] || '').toLowerCase().includes('x') || row[16] === true || String(row[16] || '') === '1',
                dispatchDate: parseExcelDate(row[17]),
                notes: String(row[18] || '')
              };

              if (existing) {
                updateMaterialPlan(existing.id, {
                  ...existing,
                  ...updateData
                });
              } else {
                addMaterialPlan({
                  projectCode: selectedProject,
                  stt: stt,
                  jobContent: contentStr,
                  unit: String(row[2] || ''),
                  contractVolume: numVal(row[3]),
                  techSpecModel: String(row[4] || ''),
                  techSpecOrigin: String(row[5] || ''),
                  ...updateData
                });
              }
              matImportCount++;
            });
          }
        }

        // 2. Parse Purchasing
        if (purchasingSheetName) {
          const sheet = wb.Sheets[purchasingSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const content = row[1];
              if (!content) return;

              const stt = String(row[0] || '');
              const contentStr = String(content);
              const rKey = baselineKey(stt, contentStr);
              const existing = purchasingBaselineMap.get(rKey);

              const updateData = {
                volumeOrder: numVal(row[4]),
                unitPrice: numVal(row[5]),
                vatRate: numVal(row[6]),
                vatAmount: numVal(row[7]),
                totalAmount: numVal(row[8]),
                prepayPercent: numVal(row[9]),
                prepayAmount: numVal(row[10]),
                remainingAmount: numVal(row[11]),
                orderStatus: String(row[12] || 'Chưa đặt hàng'),
                contractStatus: String(row[13] || 'Chưa ký'),
                paymentDate: parseExcelDate(row[14]),
                invoiceStatus: String(row[15] || 'Chưa xuất'),
                notes: String(row[16] || '')
              };

              if (existing) {
                updatePurchasingPlan(existing.id, {
                  ...existing,
                  ...updateData
                });
              } else {
                addPurchasingPlan({
                  projectCode: selectedProject,
                  stt: stt,
                  content: contentStr,
                  unit: String(row[2] || ''),
                  volumeContract: numVal(row[3]),
                  ...updateData
                });
              }
              purImportCount++;
            });
          }
        }

        // 3. Parse Expense
        if (expenseSheetName) {
          const sheet = wb.Sheets[expenseSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const dateVal = row[1];
              const content = row[2];
              if (!dateVal || !content) return;
              addExpense({
                projectCode: selectedProject,
                stt: String(row[0] || ''),
                date: parseExcelDate(dateVal),
                content: String(content),
                description: String(row[3] || ''),
                unit: String(row[4] || ''),
                quantity: numVal(row[5]),
                unitPrice: numVal(row[6]),
                taxAmount: numVal(row[7]),
                totalAmount: numVal(row[8]),
                incomeAmount: numVal(row[9]),
                balanceFund: numVal(row[10]),
                notes: String(row[11] || ''),
                invoiceUrl: String(row[12] || '')
              });
              expImportCount++;
            });
          }
        }

        // 4. Parse Labor
        if (laborSheetName) {
          const sheet = wb.Sheets[laborSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          const startRow = findStartRow(rows);
          if (startRow !== -1) {
            rows.slice(startRow).forEach(row => {
              const content = row[2];
              if (!content) return;
              addLaborPayroll({
                projectCode: selectedProject,
                stt: String(row[0] || ''),
                date: String(row[1] || ''),
                content: String(content),
                description: String(row[3] || ''),
                unit: String(row[4] || ''),
                quantity: numVal(row[5]),
                unitPrice: numVal(row[6]),
                totalAmount: numVal(row[7]),
                bankAccount: String(row[8] || ''),
                bankInfo: String(row[9] || ''),
                idCardFrontUrl: String(row[10] || ''),
                idCardBackUrl: String(row[11] || ''),
                paymentStatus: String(row[12] || 'Chưa thanh toán'),
                notes: String(row[13] || '')
              });
              labImportCount++;
            });
          }
        }

        let summaryMessage = `Đã nhập dữ liệu dự án ${selectedProject} thành công! \n`;
        if (matImportCount > 0) summaryMessage += `- ${matImportCount} dòng Kế hoạch vật tư \n`;
        if (purImportCount > 0) summaryMessage += `- ${purImportCount} dòng Mua sắm hàng hóa \n`;
        if (expImportCount > 0) summaryMessage += `- ${expImportCount} dòng Chi phí công trình \n`;
        if (labImportCount > 0) summaryMessage += `- ${labImportCount} dòng Lương công nhật`;

        triggerToast(summaryMessage, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        triggerToast('Lỗi phân tích file Excel: ' + err.message, 'warning');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Active Project Code
  const projectOptions = useMemo(() => {
    // Collect all project codes from projects list
    const codes = new Set(projects.map(p => p.code));
    // Also add codes from materialPlans if not present
    materialPlans.forEach(p => codes.add(p.projectCode));
    return Array.from(codes);
  }, [projects, materialPlans]);

  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    if (projectOptions.length > 0) {
      if (!selectedProject || !projectOptions.includes(selectedProject)) {
        setSelectedProject(projectOptions[0]);
      }
    } else {
      setSelectedProject('');
    }
  }, [projectOptions, selectedProject]);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MATERIAL_PLAN' | 'PURCHASING' | 'EXPENSE' | 'LABOR'>('OVERVIEW');

  // Modals state
  const [editingPlan, setEditingPlan] = useState<ProjectMaterialPlan | null>(null);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [editingPurchasing, setEditingPurchasing] = useState<ProjectPurchasing | null>(null);
  const [isNewPurchasingOpen, setIsNewPurchasingOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ProjectExpense | null>(null);
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<LaborPayroll | null>(null);
  const [isNewLaborOpen, setIsNewLaborOpen] = useState(false);

  // ----------------------------------------------------
  // FILTER DATA BY SELECTED PROJECT
  // ----------------------------------------------------
  const currentProjMaterialPlans = useMemo(() => 
    materialPlans.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [materialPlans, selectedProject]
  );

  const currentProjPurchasing = useMemo(() => 
    purchasingPlans.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [purchasingPlans, selectedProject]
  );

  const currentProjExpenses = useMemo(() => 
    expenses.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [expenses, selectedProject]
  );

  const currentProjLabor = useMemo(() => 
    laborPayrolls.filter(p => p.projectCode === selectedProject).sort((a, b) => Number(a.stt || 0) - Number(b.stt || 0)),
    [laborPayrolls, selectedProject]
  );

  // ----------------------------------------------------
  // COMPUTED METRICS
  // ----------------------------------------------------
  const projectMetrics = useMemo(() => {
    // Total cost of materials purchased
    const totalPurchasing = currentProjPurchasing.reduce((sum, p) => sum + p.totalAmount, 0);
    // Total spent (Expenses + Labor)
    const totalExp = currentProjExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalLab = currentProjLabor.reduce((sum, l) => sum + l.totalAmount, 0);
    const totalSpent = totalExp + totalLab;

    // Project Fund (sum of incomeAmount from the Expense transactions)
    const fund = currentProjExpenses.reduce((sum, e) => sum + (e.incomeAmount || 0), 0);

    // Missing certificates (CO/CQ)
    const totalMaterials = currentProjMaterialPlans.length;
    const missingCo = currentProjMaterialPlans.filter(p => !p.docCo).length;
    const missingCq = currentProjMaterialPlans.filter(p => !p.docCq).length;

    // General Material Plan Progress
    const completedTasks = currentProjMaterialPlans.filter(p => p.progressStatus === 'Đã hoàn thành' || p.orderedStatus === 'Đã nhận đủ').length;
    const progressPercent = totalMaterials > 0 ? Math.round((completedTasks / totalMaterials) * 100) : 0;

    return {
      totalPurchasing,
      totalSpent,
      totalExp,
      totalLab,
      fund,
      balance: fund - totalSpent,
      missingCo,
      missingCq,
      progressPercent
    };
  }, [selectedProject, currentProjMaterialPlans, currentProjPurchasing, currentProjExpenses, currentProjLabor]);

  // Chart Data
  const chartData = useMemo(() => {
    return [
      { name: 'Mua sắm VTTB', value: projectMetrics.totalPurchasing },
      { name: 'Chi phí thi công', value: projectMetrics.totalExp },
      { name: 'Chi lương công nhật', value: projectMetrics.totalLab },
    ];
  }, [projectMetrics]);

  const COLORS = ['#0284c7', '#e11d48', '#f59e0b'];

  // ----------------------------------------------------
  // EXPORT TO EXCEL
  // ----------------------------------------------------
  const handleExportExcel = () => {
    let data: any[] = [];
    let sheetName = '';
    
    if (activeTab === 'MATERIAL_PLAN') {
      data = currentProjMaterialPlans.map(p => ({
        'STT': p.stt,
        'Nội dung công việc': p.jobContent,
        'ĐVT': p.unit,
        'Khối lượng HĐ': p.contractVolume,
        'Mã hiệu': p.techSpecModel || '',
        'Nguồn sản xuất': p.techSpecOrigin || '',
        'Tình trạng': p.progressStatus || '',
        'KL Đặt hàng': p.orderedVolume || 0,
        'TT Đặt hàng': p.orderedStatus || '',
        'Ngày có hàng (dự kiến)': p.expectedDate || '',
        'Vướng mắc': p.issueContent || '',
        'Chứng từ CO': p.docCo ? 'Đã có' : 'Chưa có',
        'Chứng từ CQ': p.docCq ? 'Đã có' : 'Chưa có',
        'Đã gửi tới CT': p.dispatchToSite ? 'Đã gửi' : 'Chưa gửi',
        'Ghi chú': p.notes || ''
      }));
      sheetName = 'KeHoachVatTu';
    } else if (activeTab === 'PURCHASING') {
      data = currentProjPurchasing.map(p => ({
        'STT': p.stt,
        'Nội dung': p.content,
        'ĐVT': p.unit,
        'Khối lượng HĐ': p.volumeContract,
        'Khối lượng ĐH': p.volumeOrder,
        'Đơn giá': p.unitPrice,
        'VAT (%)': p.vatRate,
        'Tiền thuế': p.vatAmount,
        'Thành tiền': p.totalAmount,
        'Tạm ứng (%)': p.prepayPercent * 100,
        'Tạm ứng (Tiền)': p.prepayAmount,
        'Thanh toán còn lại': p.remainingAmount,
        'TT Đặt hàng': p.orderStatus,
        'TT Hợp đồng': p.contractStatus,
        'Ngày thanh toán': p.paymentDate || '',
        'Hóa đơn': p.invoiceStatus || '',
        'Ghi chú': p.notes || ''
      }));
      sheetName = 'MuaSamHangHoa';
    } else if (activeTab === 'EXPENSE') {
      data = currentProjExpenses.map(e => ({
        'STT': e.stt,
        'Ngày': e.date,
        'Nội dung': e.content,
        'Diễn giải': e.description,
        'ĐVT': e.unit,
        'Số lượng': e.quantity,
        'Đơn giá': e.unitPrice,
        'Thành tiền': e.totalAmount,
        'Thu': e.incomeAmount || 0,
        'Tồn quỹ': e.balanceFund || 0,
        'Ghi chú': e.notes || '',
        'Link Hóa đơn': e.invoiceUrl || ''
      }));
      sheetName = 'ChiPhiCongTrinh';
    } else if (activeTab === 'LABOR') {
      data = currentProjLabor.map(l => ({
        'STT': l.stt,
        'Ngày': l.date,
        'Nội dung': l.content,
        'Diễn giải': l.description,
        'ĐVT': l.unit,
        'Số lượng': l.quantity,
        'Đơn giá': l.unitPrice,
        'Thành tiền': l.totalAmount,
        'Số tài khoản': l.bankAccount,
        'Tên thụ hưởng': l.bankInfo || '',
        'CCCD Mặt trước': l.idCardFrontUrl || '',
        'CCCD Mặt sau': l.idCardBackUrl || '',
        'Tình trạng': l.paymentStatus,
        'Ghi chú': l.notes || ''
      }));
      sheetName = 'LuongCongNhat';
    } else {
      return; // No export for Overview
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${selectedProject}_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Form states for creating items
  const [newPlanData, setNewPlanData] = useState<Partial<ProjectMaterialPlan>>({
    stt: '', jobContent: '', unit: 'bộ', contractVolume: 1, techSpecModel: '', techSpecOrigin: '', progressStatus: 'Chưa thi công', orderedVolume: 0, orderedStatus: 'Chưa đặt hàng', expectedDate: '', issueContent: '', docCo: false, docCq: false, docFireInspection: false, dispatchToSite: false, notes: ''
  });
  const [newPurchasingData, setNewPurchasingData] = useState<Partial<ProjectPurchasing>>({
    stt: '', content: '', unit: 'bộ', volumeContract: 1, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''
  });
  const [newExpenseData, setNewExpenseData] = useState<Partial<ProjectExpense>>({
    stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''
  });
  const [newLaborData, setNewLaborData] = useState<Partial<LaborPayroll>>({
    stt: '', date: '', content: 'TT tiền công', description: 'Lương thợ điện', unit: 'Công', quantity: 1, unitPrice: 500000, bankAccount: '', bankInfo: '', idCardFrontUrl: '', idCardBackUrl: '', paymentStatus: 'Chưa thanh toán', notes: ''
  });

  return (
    <div className="px-5 py-4 space-y-4">
      {/* HEADER SECTION */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">calculate</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">Kế hoạch & Chi phí Dự án</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Quản lý tổng hợp ngân sách, vật tư kế hoạch, mua sắm vật tư và chi phí chi tiết theo công trình</p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase px-2">Dự án:</span>
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)} 
            className="bg-white border border-slate-200 px-3 py-1.5 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          >
            {projectOptions.length === 0 ? (
              <option value="">-- Chưa có dự án --</option>
            ) : (
              projectOptions.map(code => {
                const proj = projects.find(p => p.code === code);
                return <option key={code} value={code}>{proj?.name || code}</option>;
              })
            )}
          </select>
        </div>
      </section>

      {/* METRICS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Quỹ Công trình</span>
            <span className="material-symbols-outlined text-lg text-blue-500 bg-blue-50 p-1.5 rounded-md">account_balance_wallet</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{projectMetrics.fund.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Dự trù ngân sách của công trường</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng chi thực tế</span>
            <span className="material-symbols-outlined text-lg text-rose-500 bg-rose-50 p-1.5 rounded-md">payments</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{projectMetrics.totalSpent.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Chi công trình ({projectMetrics.totalExp.toLocaleString('vi-VN')}đ) + Lương ({projectMetrics.totalLab.toLocaleString('vi-VN')}đ)</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Tồn quỹ cuối kỳ</span>
            <span className="material-symbols-outlined text-lg text-emerald-500 bg-emerald-50 p-1.5 rounded-md">savings</span>
          </div>
          <div className={`text-2xl font-extrabold mt-2 ${projectMetrics.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>{projectMetrics.balance.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Ngân quỹ còn lại của dự án</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Tiến độ Vật tư</span>
            <span className="material-symbols-outlined text-lg text-amber-500 bg-amber-50 p-1.5 rounded-md">inventory</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-2xl font-extrabold text-slate-900">{projectMetrics.progressPercent}%</div>
            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${projectMetrics.progressPercent}%` }}></div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tỷ lệ vật tư đã hoàn tất cung cấp</div>
        </div>
      </section>

      {/* TABS SELECTOR */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white rounded-t-xl px-4 pt-1 shadow-xs border-x">
        <div className="flex items-center gap-4">
          {[
            { id: 'OVERVIEW', label: 'Tổng Quan & Biểu Đồ', icon: 'monitoring' },
            { id: 'MATERIAL_PLAN', label: 'Kế Hoạch Vật Tư', icon: 'list_alt' },
            { id: 'PURCHASING', label: 'Mua Sắm Hàng Hóa', icon: 'shopping_bag' },
            { id: 'EXPENSE', label: 'Chi Phí Công Trình', icon: 'receipt_long' },
            { id: 'LABOR', label: 'Lương Công Nhật', icon: 'engineering' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'OVERVIEW' && (
          <div className="flex gap-2 pb-1.5">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => {
                if (!selectedProject) {
                  triggerToast('Vui lòng khởi tạo dự án trước khi nhập dữ liệu!', 'warning');
                  return;
                }
                fileInputRef.current?.click();
              }} 
              className="flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_upload</span>
              Nhập Excel
            </button>
            <button 
              onClick={() => {
                if (!selectedProject) {
                  triggerToast('Vui lòng khởi tạo dự án trước khi xuất dữ liệu!', 'warning');
                  return;
                }
                handleExportExcel();
              }} 
              className="flex items-center gap-1 border border-slate-200 bg-white px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              Xuất Excel
            </button>
            <button 
              onClick={() => {
                if (!selectedProject) {
                  triggerToast('Vui lòng khởi tạo dự án trước khi thêm dữ liệu!', 'warning');
                  return;
                }
                if (activeTab === 'MATERIAL_PLAN') setIsNewPlanOpen(true);
                else if (activeTab === 'PURCHASING') setIsNewPurchasingOpen(true);
                else if (activeTab === 'EXPENSE') setIsNewExpenseOpen(true);
                else if (activeTab === 'LABOR') setIsNewLaborOpen(true);
              }} 
              className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm Mới
            </button>
          </div>
        )}
      </div>

      {/* TAB CONTENTS */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl shadow-xs overflow-hidden">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="border border-slate-200 rounded-xl p-4 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Cơ cấu Chi phí & Mua sắm hàng hóa</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${Number(v).toLocaleString('vi-VN')} đ`} />
                    <Legend />
                    <Bar dataKey="value" fill="#0284c7" name="Chi phí thực tế (đ)">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side summary panel */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Chi tiết Báo cáo Tài chính</h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">Chi mua sắm vật tư (Hợp đồng)</span>
                  <span className="font-bold text-slate-800">{projectMetrics.totalPurchasing.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">Chi công trình hiện trường</span>
                  <span className="font-bold text-slate-800">{projectMetrics.totalExp.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">Chi tiền lương công nhật</span>
                  <span className="font-bold text-slate-800">{projectMetrics.totalLab.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">Chứng từ thiếu (CO)</span>
                  <span className="font-bold text-rose-600">{projectMetrics.missingCo} vật tư</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">Chứng từ thiếu (CQ)</span>
                  <span className="font-bold text-rose-600">{projectMetrics.missingCq} vật tư</span>
                </div>
                <div className="flex justify-between py-2.5 bg-slate-50 p-2 rounded-lg font-bold mt-2">
                  <span className="text-slate-700">Tổng quỹ chi tiêu</span>
                  <span className="text-primary">{projectMetrics.fund.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MATERIAL PLAN TAB */}
        {activeTab === 'MATERIAL_PLAN' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-[4%] text-center">STT</th>
                  <th className="p-3 w-[32%]">Nội dung công việc / Thiết bị</th>
                  <th className="p-3 w-[5%] text-center">ĐVT</th>
                  <th className="p-3 w-[8%] text-right">Khối lượng HĐ</th>
                  <th className="p-3 w-[15%]">Tiêu chuẩn kỹ thuật (Hiệu/Nguồn)</th>
                  <th className="p-3 w-[8%] text-center">Tiến độ</th>
                  <th className="p-3 w-[6%] text-right">KL Đặt</th>
                  <th className="p-3 w-[8%] text-center">Trạng thái đặt</th>
                  <th className="p-3 w-[8%] text-center">Ngày cấp hàng</th>
                  <th className="p-3 w-[4%] text-center">CO/CQ</th>
                  <th className="p-3 w-[4%] text-center">Gửi CT</th>
                  <th className="p-3 w-[4%] text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentProjMaterialPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingPlan(plan)}>
                    <td className="p-3 text-center font-bold text-slate-400">{plan.stt || '-'}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 leading-snug">{plan.jobContent}</div>
                      {plan.notes && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{plan.notes}</div>}
                    </td>
                    <td className="p-3 text-center">{plan.unit}</td>
                    <td className="p-3 text-right font-bold">{plan.contractVolume}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{plan.techSpecModel || '-'}</div>
                      <div className="text-[10px] text-slate-400">{plan.techSpecOrigin || '-'}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.progressStatus === 'Đã hoàn thành' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        plan.progressStatus === 'Đang thi công' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {plan.progressStatus || 'Chưa thi công'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">{plan.orderedVolume || 0}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.orderedStatus === 'Đã nhận đủ' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        plan.orderedStatus === 'Đã đặt hàng' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {plan.orderedStatus || 'Chưa đặt'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-600 whitespace-nowrap">
                      {(() => {
                        if (!plan.expectedDate) return '-';
                        const parts = plan.expectedDate.split('-');
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
                        }
                        return plan.expectedDate;
                      })()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${plan.docCo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>CO</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${plan.docCq ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>CQ</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {plan.dispatchToSite ? (
                        <div className="text-emerald-600 font-bold flex flex-col items-center">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span className="text-[9px]">{plan.dispatchDate || 'Đã gửi'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 material-symbols-outlined text-sm">block</span>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => { if(window.confirm('Xóa hạng mục kế hoạch vật tư này?')) deleteMaterialPlan(plan.id) }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {currentProjMaterialPlans.length === 0 && (
                  <tr><td colSpan={12} className="p-8 text-center text-slate-400">Không có dữ liệu kế hoạch vật tư.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PURCHASING TAB */}
        {activeTab === 'PURCHASING' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3 min-w-72">Nội dung</th>
                  <th className="p-3 w-16 text-left">ĐVT</th>
                  <th className="p-3 text-right">Khối lượng HĐ</th>
                  <th className="p-3 text-right">Khối lượng ĐH</th>
                  <th className="p-3 text-right">Đơn giá (đ)</th>
                  <th className="p-3 text-right">Thành tiền (đ)</th>
                  <th className="p-3 text-right">Tạm ứng (đ)</th>
                  <th className="p-3 text-right">Còn lại (đ)</th>
                  <th className="p-3 text-center">TT Đặt hàng</th>
                  <th className="p-3 text-center">Hóa đơn</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentProjPurchasing.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingPurchasing(pur)}>
                    <td className="p-3 text-center font-bold text-slate-400">{pur.stt || '-'}</td>
                    <td className="p-3 font-bold text-slate-900">{pur.content}</td>
                    <td className="p-3 text-left">{pur.unit}</td>
                    <td className="p-3 text-right font-bold">{pur.volumeContract}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">{pur.volumeOrder}</td>
                    <td className="p-3 text-right">{pur.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-primary">{pur.totalAmount.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-rose-600">
                      {pur.prepayAmount.toLocaleString('vi-VN')}
                      <div className="text-[9px] text-slate-400">({pur.prepayPercent * 100}%)</div>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800">{pur.remainingAmount.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pur.orderStatus === 'Đã nhận hàng' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        pur.orderStatus === 'Đang giao hàng' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {pur.orderStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        pur.invoiceStatus?.includes('Đã') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pur.invoiceStatus || 'Chưa'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 max-w-[120px] truncate" title={pur.notes || ''}>
                      {pur.notes || '-'}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => { if(window.confirm('Xóa hạng mục mua sắm này?')) deletePurchasingPlan(pur.id) }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {currentProjPurchasing.length === 0 && (
                  <tr><td colSpan={13} className="p-8 text-center text-slate-400">Không có dữ liệu mua sắm hàng hóa.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* EXPENSE TAB */}
        {activeTab === 'EXPENSE' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Ngày chi</th>
                  <th className="p-3 min-w-56">Nội dung / Diễn giải</th>
                  <th className="p-3 w-16 text-left">ĐVT</th>
                  <th className="p-3 text-right">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá (đ)</th>
                  <th className="p-3 text-right">VAT</th>
                  <th className="p-3 text-right">Thành tiền (đ)</th>
                  <th className="p-3 text-right">Thực thu (đ)</th>
                  <th className="p-3 text-right">Tồn quỹ (đ)</th>
                  <th className="p-3">Ghi chú</th>
                  <th className="p-3 text-center">Hóa đơn</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentProjExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingExpense(exp)}>
                    <td className="p-3 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900">{exp.date}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{exp.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{exp.description}</div>
                    </td>
                    <td className="p-3 text-left">{exp.unit}</td>
                    <td className="p-3 text-right">{exp.quantity}</td>
                    <td className="p-3 text-right">{exp.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-slate-500">{(exp.taxAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-rose-600">-{exp.totalAmount.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold">{(exp.incomeAmount || 0) > 0 ? `+${exp.incomeAmount?.toLocaleString('vi-VN')}` : '-'}</td>
                    <td className="p-3 text-right font-bold text-primary">{(exp.balanceFund || 0) > 0 ? exp.balanceFund?.toLocaleString('vi-VN') : '-'}</td>
                    <td className="p-3 text-slate-500 italic">{exp.notes || '-'}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {exp.invoiceUrl ? (
                        <button onClick={() => window.open(exp.invoiceUrl, '_blank')} className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline">
                          <span className="material-symbols-outlined text-sm">image</span>
                          Xem ảnh
                        </button>
                      ) : (
                        <span className="text-slate-300">Không có</span>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => { if(window.confirm('Xóa phiếu chi này?')) deleteExpense(exp.id) }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {currentProjExpenses.length === 0 && (
                  <tr><td colSpan={11} className="p-8 text-center text-slate-400">Chưa có giao dịch chi phí công trình nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* LABOR TAB */}
        {activeTab === 'LABOR' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Ngày làm</th>
                  <th className="p-3">Họ tên</th>
                  <th className="p-3 min-w-56">Nội dung lương công nhật</th>
                  <th className="p-3 w-16 text-left">ĐVT</th>
                  <th className="p-3 text-right">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá (đ)</th>
                  <th className="p-3 text-right">Thành tiền (đ)</th>
                  <th className="p-3">Tài khoản & Người nhận</th>
                  <th className="p-3 text-center">CCCD</th>
                  <th className="p-3 text-center">Tình trạng</th>
                  <th className="p-3 text-center w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentProjLabor.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingLabor(lab)}>
                    <td className="p-3 text-center font-bold text-slate-400">{lab.stt || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900">{lab.date}</td>
                    <td className="p-3 font-bold text-slate-900">{lab.workerName || '-'}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lab.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{lab.description}</div>
                    </td>
                    <td className="p-3 text-left">{lab.unit}</td>
                    <td className="p-3 text-right">{lab.quantity}</td>
                    <td className="p-3 text-right">{lab.unitPrice.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right font-bold text-primary">{lab.totalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lab.bankInfo}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{lab.bankAccount}</div>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        {lab.idCardFrontUrl ? (
                          <a href={lab.idCardFrontUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline font-bold">Mặt trước</a>
                        ) : null}
                        {lab.idCardBackUrl ? (
                          <a href={lab.idCardBackUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline font-bold">Mặt sau</a>
                        ) : null}
                        {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">Không có</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        lab.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {lab.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => { if(window.confirm('Xóa dòng thanh toán lương công nhật này?')) deleteLaborPayroll(lab.id) }} 
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {currentProjLabor.length === 0 && (
                  <tr><td colSpan={11} className="p-8 text-center text-slate-400">Không có thông tin lương công nhật nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODALS */}
      {/* 1. Modal Kế Hoạch Vật Tư */}
      <Modal isOpen={isNewPlanOpen} onClose={() => setIsNewPlanOpen(false)} title="Thêm hạng mục Kế hoạch Vật tư mới">
        <form onSubmit={(e) => {
          e.preventDefault();
          addMaterialPlan({
            projectCode: selectedProject,
            stt: newPlanData.stt || String(currentProjMaterialPlans.length + 1),
            jobContent: newPlanData.jobContent || '',
            unit: newPlanData.unit || 'bộ',
            contractVolume: Number(newPlanData.contractVolume || 1),
            techSpecModel: newPlanData.techSpecModel || '',
            techSpecOrigin: newPlanData.techSpecOrigin || '',
            progressStatus: newPlanData.progressStatus || 'Chưa thi công',
            orderedVolume: Number(newPlanData.orderedVolume || 0),
            orderedStatus: newPlanData.orderedStatus || 'Chưa đặt hàng',
            expectedDate: newPlanData.expectedDate || '',
            issueContent: newPlanData.issueContent || '',
            docCo: !!newPlanData.docCo,
            docCq: !!newPlanData.docCq,
            docFireInspection: !!newPlanData.docFireInspection,
            dispatchToSite: !!newPlanData.dispatchToSite,
            notes: newPlanData.notes || ''
          });
          setIsNewPlanOpen(false);
          setNewPlanData({stt: '', jobContent: '', unit: 'bộ', contractVolume: 1, techSpecModel: '', techSpecOrigin: '', progressStatus: 'Chưa thi công', orderedVolume: 0, orderedStatus: 'Chưa đặt hàng', expectedDate: '', issueContent: '', docCo: false, docCq: false, docFireInspection: false, dispatchToSite: false, notes: ''});
        }} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold mb-1">Tên vật tư / hạng mục *</label>
            <input type="text" required value={newPlanData.jobContent} onChange={(e) => setNewPlanData({...newPlanData, jobContent: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Đơn vị tính</label><input type="text" value={newPlanData.unit} onChange={(e) => setNewPlanData({...newPlanData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Khối lượng HĐ</label><input type="number" value={newPlanData.contractVolume} onChange={(e) => setNewPlanData({...newPlanData, contractVolume: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Mã hiệu / Quy cách</label><input type="text" value={newPlanData.techSpecModel} onChange={(e) => setNewPlanData({...newPlanData, techSpecModel: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Nguồn sản xuất / Xuất xứ</label><input type="text" value={newPlanData.techSpecOrigin} onChange={(e) => setNewPlanData({...newPlanData, techSpecOrigin: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Tiến độ thi công</label>
              <select value={newPlanData.progressStatus} onChange={(e) => setNewPlanData({...newPlanData, progressStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa thi công">Chưa thi công</option>
                <option value="Đang thi công">Đang thi công</option>
                <option value="Đã hoàn thành">Đã hoàn thành</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Trạng thái đặt hàng</label>
              <select value={newPlanData.orderedStatus} onChange={(e) => setNewPlanData({...newPlanData, orderedStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                <option value="Đã đặt hàng">Đã đặt hàng</option>
                <option value="Đã nhận đủ">Đã nhận đủ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Ngày cấp hàng dự kiến</label>
            <input type="date" value={newPlanData.expectedDate || ''} onChange={(e) => setNewPlanData({...newPlanData, expectedDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-lg border">
            <div className="flex items-center gap-1.5"><input type="checkbox" checked={newPlanData.docCo} onChange={(e) => setNewPlanData({...newPlanData, docCo: e.target.checked})} /> <span className="font-bold">Chứng từ CO</span></div>
            <div className="flex items-center gap-1.5"><input type="checkbox" checked={newPlanData.docCq} onChange={(e) => setNewPlanData({...newPlanData, docCq: e.target.checked})} /> <span className="font-bold">Chứng từ CQ</span></div>
            <div className="flex items-center gap-1.5"><input type="checkbox" checked={newPlanData.dispatchToSite} onChange={(e) => setNewPlanData({...newPlanData, dispatchToSite: e.target.checked})} /> <span className="font-bold">Đã gửi tới CT</span></div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newPlanData.notes} onChange={(e) => setNewPlanData({...newPlanData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewPlanOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu mới</button></div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} title="Cập nhật Kế hoạch Vật tư">
        {editingPlan && (
          <form onSubmit={(e) => {
            e.preventDefault();
            updateMaterialPlan(editingPlan.id, editingPlan);
            setEditingPlan(null);
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">STT</label><input type="text" value={editingPlan.stt} onChange={(e) => setEditingPlan({...editingPlan, stt: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div className="col-span-2"><label className="block font-bold mb-1">Tên vật tư *</label><input type="text" required value={editingPlan.jobContent} onChange={(e) => setEditingPlan({...editingPlan, jobContent: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingPlan.unit} onChange={(e) => setEditingPlan({...editingPlan, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Khối lượng HĐ</label><input type="number" value={editingPlan.contractVolume} onChange={(e) => setEditingPlan({...editingPlan, contractVolume: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Mã hiệu / Quy cách</label><input type="text" value={editingPlan.techSpecModel} onChange={(e) => setEditingPlan({...editingPlan, techSpecModel: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Nguồn gốc</label><input type="text" value={editingPlan.techSpecOrigin} onChange={(e) => setEditingPlan({...editingPlan, techSpecOrigin: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Tiến độ</label>
                <select value={editingPlan.progressStatus} onChange={(e) => setEditingPlan({...editingPlan, progressStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa thi công">Chưa thi công</option>
                  <option value="Đang thi công">Đang thi công</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Trạng thái đặt</label>
                <select value={editingPlan.orderedStatus} onChange={(e) => setEditingPlan({...editingPlan, orderedStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  <option value="Đã đặt hàng">Đã đặt hàng</option>
                  <option value="Đã nhận đủ">Đã nhận đủ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ngày cấp hàng dự kiến</label>
              <input type="date" value={editingPlan.expectedDate || ''} onChange={(e) => setEditingPlan({...editingPlan, expectedDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div className="flex items-center gap-1.5"><input type="checkbox" checked={editingPlan.docCo} onChange={(e) => setEditingPlan({...editingPlan, docCo: e.target.checked})} /> <span className="font-bold">CO</span></div>
              <div className="flex items-center gap-1.5"><input type="checkbox" checked={editingPlan.docCq} onChange={(e) => setEditingPlan({...editingPlan, docCq: e.target.checked})} /> <span className="font-bold">CQ</span></div>
              <div className="flex items-center gap-1.5"><input type="checkbox" checked={editingPlan.dispatchToSite} onChange={(e) => setEditingPlan({...editingPlan, dispatchToSite: e.target.checked})} /> <span className="font-bold">Đã gửi CT</span></div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingPlan.notes} onChange={(e) => setEditingPlan({...editingPlan, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
          </form>
        )}
      </Modal>

      {/* 2. Modal Mua Sắm Hàng Hóa */}
      <Modal isOpen={isNewPurchasingOpen} onClose={() => setIsNewPurchasingOpen(false)} title="Thêm Hợp đồng Mua sắm mới">
        <form onSubmit={(e) => {
          e.preventDefault();
          const contractVol = Number(newPurchasingData.volumeContract || 1);
          const orderVol = Number(newPurchasingData.volumeOrder || 0);
          const unitPrice = Number(newPurchasingData.unitPrice || 0);
          const vat = Number(newPurchasingData.vatRate || 10);
          const prepayPct = Number(newPurchasingData.prepayPercent || 0);
          
          const rawTotal = contractVol * unitPrice;
          const taxAmt = rawTotal * (vat / 100);
          const totalAmt = rawTotal + taxAmt;
          const prepayAmt = totalAmt * prepayPct;
          const remainingAmt = totalAmt - prepayAmt;

          addPurchasingPlan({
            projectCode: selectedProject,
            stt: newPurchasingData.stt || String(currentProjPurchasing.length + 1),
            content: newPurchasingData.content || '',
            unit: newPurchasingData.unit || 'bộ',
            volumeContract: contractVol,
            volumeOrder: orderVol,
            unitPrice: unitPrice,
            vatRate: vat,
            vatAmount: taxAmt,
            totalAmount: totalAmt,
            prepayPercent: prepayPct,
            prepayAmount: prepayAmt,
            remainingAmount: remainingAmt,
            orderStatus: newPurchasingData.orderStatus || 'Chưa đặt hàng',
            contractStatus: newPurchasingData.contractStatus || 'Chưa ký',
            paymentDate: newPurchasingData.paymentDate || '',
            invoiceStatus: newPurchasingData.invoiceStatus || 'Chưa xuất',
            notes: newPurchasingData.notes || ''
          });
          setIsNewPurchasingOpen(false);
          setNewPurchasingData({stt: '', content: '', unit: 'bộ', volumeContract: 1, volumeOrder: 0, unitPrice: 0, vatRate: 10, prepayPercent: 0, orderStatus: 'Chưa đặt hàng', contractStatus: 'Chưa ký', paymentDate: '', invoiceStatus: 'Chưa xuất', notes: ''});
        }} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold mb-1">Tên Hàng hóa / Hợp đồng *</label>
            <input type="text" required value={newPurchasingData.content} onChange={(e) => setNewPurchasingData({...newPurchasingData, content: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newPurchasingData.unit} onChange={(e) => setNewPurchasingData({...newPurchasingData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">KL Hợp đồng</label><input type="number" value={String(newPurchasingData.volumeContract)} onChange={(e) => setNewPurchasingData({...newPurchasingData, volumeContract: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">KL Đơn đặt</label><input type="number" value={String(newPurchasingData.volumeOrder)} onChange={(e) => setNewPurchasingData({...newPurchasingData, volumeOrder: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" value={String(newPurchasingData.unitPrice)} onChange={(e) => setNewPurchasingData({...newPurchasingData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Thuế suất VAT (%)</label><input type="number" value={String(newPurchasingData.vatRate)} onChange={(e) => setNewPurchasingData({...newPurchasingData, vatRate: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Tỷ lệ Tạm ứng (%)</label><input type="number" min="0" max="100" value={String(Math.round((newPurchasingData.prepayPercent || 0) * 100))} onChange={(e) => setNewPurchasingData({...newPurchasingData, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div>
            <label className="block font-bold mb-1">Ngày dự kiến có hàng</label>
            <input type="date" value={newPurchasingData.paymentDate || ''} onChange={(e) => setNewPurchasingData({...newPurchasingData, paymentDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
          </div>
          {(() => {
            const liveContractVol = Number(newPurchasingData.volumeContract || 0);
            const liveUnitPrice = Number(newPurchasingData.unitPrice || 0);
            const liveVatRate = Number(newPurchasingData.vatRate || 0);
            const livePrepayPercent = Number(newPurchasingData.prepayPercent || 0);

            const liveRawTotal = liveContractVol * liveUnitPrice;
            const liveVatAmount = liveRawTotal * (liveVatRate / 100);
            const liveTotalAmount = liveRawTotal + liveVatAmount;
            const livePrepayAmount = liveTotalAmount * livePrepayPercent;
            const liveRemainingAmount = liveTotalAmount - livePrepayAmount;

            return (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600 mt-2">
                <div className="flex justify-between">
                  <span>Thành tiền (chưa VAT):</span>
                  <span className="font-bold text-slate-800">{liveRawTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Thuế VAT ({liveVatRate}%):</span>
                  <span className="font-bold text-slate-800">{liveVatAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                  <span>Tổng tiền (có VAT):</span>
                  <span className="text-primary">{liveTotalAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiền Tạm ứng ({Math.round(livePrepayPercent * 100)}%):</span>
                  <span className="font-bold text-rose-600">{livePrepayAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                  <span>Còn lại phải trả:</span>
                  <span className="text-emerald-600">{liveRemainingAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            );
          })()}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1">TT Đặt hàng</label>
              <select value={newPurchasingData.orderStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, orderStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                <option value="Đã đặt hàng">Đã đặt hàng</option>
                <option value="Đang giao hàng">Đang giao hàng</option>
                <option value="Đã nhận hàng">Đã nhận hàng</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Hợp đồng</label>
              <select value={newPurchasingData.contractStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, contractStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa ký">Chưa ký</option>
                <option value="Đang trình duyệt">Đang trình duyệt</option>
                <option value="Đã ký">Đã ký</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Hóa đơn</label>
              <select value={newPurchasingData.invoiceStatus} onChange={(e) => setNewPurchasingData({...newPurchasingData, invoiceStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa xuất">Chưa xuất</option>
                <option value="Đang kiểm tra">Đang kiểm tra</option>
                <option value="Đã xuất">Đã xuất</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Ghi chú</label>
            <input type="text" placeholder="Nhập ghi chú (nếu có)" value={newPurchasingData.notes} onChange={(e) => setNewPurchasingData({...newPurchasingData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-xs" />
          </div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewPurchasingOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu mới</button></div>
        </form>
      </Modal>

      {/* Edit Purchasing Modal */}
      <Modal isOpen={!!editingPurchasing} onClose={() => setEditingPurchasing(null)} title="Cập nhật Hợp đồng Mua sắm">
        {editingPurchasing && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const contractVol = Number(editingPurchasing.volumeContract || 1);
            const unitPrice = Number(editingPurchasing.unitPrice || 0);
            const vat = Number(editingPurchasing.vatRate || 10);
            const prepayPct = Number(editingPurchasing.prepayPercent || 0);

            const rawTotal = contractVol * unitPrice;
            const taxAmt = rawTotal * (vat / 100);
            const totalAmt = rawTotal + taxAmt;
            const prepayAmt = totalAmt * prepayPct;
            const remainingAmt = totalAmt - prepayAmt;

            updatePurchasingPlan(editingPurchasing.id, {
              ...editingPurchasing,
              vatAmount: taxAmt,
              totalAmount: totalAmt,
              prepayAmount: prepayAmt,
              remainingAmount: remainingAmt
            });
            setEditingPurchasing(null);
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">STT</label><input type="text" value={editingPurchasing.stt} onChange={(e) => setEditingPurchasing({...editingPurchasing, stt: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div className="col-span-2"><label className="block font-bold mb-1">Hạng mục mua sắm *</label><input type="text" required value={editingPurchasing.content} onChange={(e) => setEditingPurchasing({...editingPurchasing, content: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingPurchasing.unit} onChange={(e) => setEditingPurchasing({...editingPurchasing, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">KL Hợp đồng</label><input type="number" value={String(editingPurchasing.volumeContract)} onChange={(e) => setEditingPurchasing({...editingPurchasing, volumeContract: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">KL Đơn đặt</label><input type="number" value={String(editingPurchasing.volumeOrder)} onChange={(e) => setEditingPurchasing({...editingPurchasing, volumeOrder: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" value={String(editingPurchasing.unitPrice)} onChange={(e) => setEditingPurchasing({...editingPurchasing, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Thuế suất VAT (%)</label><input type="number" value={String(editingPurchasing.vatRate)} onChange={(e) => setEditingPurchasing({...editingPurchasing, vatRate: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Tỷ lệ Tạm ứng (%)</label><input type="number" min="0" max="100" value={String(Math.round((editingPurchasing.prepayPercent || 0) * 100))} onChange={(e) => setEditingPurchasing({...editingPurchasing, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ngày dự kiến có hàng</label>
              <input type="date" value={editingPurchasing.paymentDate || ''} onChange={(e) => setEditingPurchasing({...editingPurchasing, paymentDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" />
            </div>
            {(() => {
              const editContractVol = Number(editingPurchasing.volumeContract || 0);
              const editUnitPrice = Number(editingPurchasing.unitPrice || 0);
              const editVatRate = Number(editingPurchasing.vatRate || 0);
              const editPrepayPercent = Number(editingPurchasing.prepayPercent || 0);

              const editRawTotal = editContractVol * editUnitPrice;
              const editVatAmount = editRawTotal * (editVatRate / 100);
              const editTotalAmount = editRawTotal + editVatAmount;
              const editPrepayAmount = editTotalAmount * editPrepayPercent;
              const editRemainingAmount = editTotalAmount - editPrepayAmount;

              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px] font-mono text-slate-600 mt-2">
                  <div className="flex justify-between">
                    <span>Thành tiền (chưa VAT):</span>
                    <span className="font-bold text-slate-800">{editRawTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế VAT ({editVatRate}%):</span>
                    <span className="font-bold text-slate-800">{editVatAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                    <span>Tổng tiền (có VAT):</span>
                    <span className="text-primary">{editTotalAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền Tạm ứng ({Math.round(editPrepayPercent * 100)}%):</span>
                    <span className="font-bold text-rose-600">{editPrepayAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-sans text-xs font-bold text-slate-900">
                    <span>Còn lại phải trả:</span>
                    <span className="text-emerald-600">{editRemainingAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">TT Đặt hàng</label>
                <select value={editingPurchasing.orderStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, orderStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  <option value="Đã đặt hàng">Đã đặt hàng</option>
                  <option value="Đang giao hàng">Đang giao hàng</option>
                  <option value="Đã nhận hàng">Đã nhận hàng</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Hợp đồng</label>
                <select value={editingPurchasing.contractStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, contractStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa ký">Chưa ký</option>
                  <option value="Đang trình duyệt">Đang trình duyệt</option>
                  <option value="Đã ký">Đã ký</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Hóa đơn</label>
                <select value={editingPurchasing.invoiceStatus} onChange={(e) => setEditingPurchasing({...editingPurchasing, invoiceStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa xuất">Chưa xuất</option>
                  <option value="Đang kiểm tra">Đang kiểm tra</option>
                  <option value="Đã xuất">Đã xuất</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-bold mb-1">Ghi chú</label>
              <input type="text" placeholder="Nhập ghi chú (nếu có)" value={editingPurchasing.notes} onChange={(e) => setEditingPurchasing({...editingPurchasing, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-xs" />
            </div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingPurchasing(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
          </form>
        )}
      </Modal>

      {/* 3. Modal Chi Phí Công Trình */}
      <Modal isOpen={isNewExpenseOpen} onClose={() => setIsNewExpenseOpen(false)} title="Tạo Phiếu Chi Công trình mới">
        <form onSubmit={(e) => {
          e.preventDefault();
          const qty = Number(newExpenseData.quantity || 1);
          const price = Number(newExpenseData.unitPrice || 0);
          const vat = Number((newExpenseData as any).vatAmount || 0);
          const total = qty * price + vat;

          addExpense({
            projectCode: selectedProject,
            stt: newExpenseData.stt || String(currentProjExpenses.length + 1),
            date: newExpenseData.date || new Date().toISOString().split('T')[0],
            content: newExpenseData.content || 'Vật tư/ thiết bị',
            description: newExpenseData.description || '',
            unit: newExpenseData.unit || 'cái',
            quantity: qty,
            unitPrice: price,
            taxAmount: vat,
            totalAmount: total,
            incomeAmount: Number((newExpenseData as any).incomeAmount || 0),
            balanceFund: Number((newExpenseData as any).balanceFund || 0),
            notes: newExpenseData.notes || '',
            invoiceUrl: newExpenseData.invoiceUrl || ''
          });
          setIsNewExpenseOpen(false);
          setNewExpenseData({stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''});
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={newExpenseData.date} onChange={(e) => setNewExpenseData({...newExpenseData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Loại nội dung</label><input type="text" value={newExpenseData.content} onChange={(e) => setNewExpenseData({...newExpenseData, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required placeholder="VD: Mua keo non, tắc kê đan..." value={newExpenseData.description} onChange={(e) => setNewExpenseData({...newExpenseData, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newExpenseData.unit} onChange={(e) => setNewExpenseData({...newExpenseData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Số lượng</label><input type="number" value={String(newExpenseData.quantity)} onChange={(e) => setNewExpenseData({...newExpenseData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá (đ)</label><input type="number" value={String(newExpenseData.unitPrice)} onChange={(e) => setNewExpenseData({...newExpenseData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" value={String((newExpenseData as any).vatAmount || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, vatAmount: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" value={String((newExpenseData as any).incomeAmount || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, incomeAmount: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Tồn quỹ (đ)</label><input type="number" value={String((newExpenseData as any).balanceFund || 0)} onChange={(e) => setNewExpenseData({...newExpenseData, balanceFund: Number(e.target.value)} as any)} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          {(() => {
            const liveQty = Number(newExpenseData.quantity || 0);
            const livePrice = Number(newExpenseData.unitPrice || 0);
            const liveVat = Number((newExpenseData as any).vatAmount || 0);
            const liveTotal = liveQty * livePrice + liveVat;
            return (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-xs font-bold">
                <span className="text-slate-600">Thành tiền tự động:</span>
                <span className="text-rose-600">{liveTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            );
          })()}
          <div>
            <label className="block font-bold mb-1">Ảnh Hóa đơn / Chứng từ</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg border border-primary/30 hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Chọn ảnh
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setNewExpenseData({...newExpenseData, invoiceUrl: reader.result as string});
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
              {newExpenseData.invoiceUrl && (
                <div className="flex items-center gap-2">
                  <img src={newExpenseData.invoiceUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border" />
                  <button type="button" onClick={() => setNewExpenseData({...newExpenseData, invoiceUrl: ''})} className="text-rose-500 hover:text-rose-700">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newExpenseData.notes} onChange={(e) => setNewExpenseData({...newExpenseData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewExpenseOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu phiếu chi</button></div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Cập nhật Phiếu Chi Công trình">
        {editingExpense && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const qty = Number(editingExpense.quantity || 1);
            const price = Number(editingExpense.unitPrice || 0);
            const vat = Number(editingExpense.taxAmount || 0);
            const total = qty * price + vat;

            updateExpense(editingExpense.id, {
              ...editingExpense,
              totalAmount: total
            });
            setEditingExpense(null);
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={editingExpense.date} onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Loại nội dung</label><input type="text" value={editingExpense.content} onChange={(e) => setEditingExpense({...editingExpense, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingExpense.unit} onChange={(e) => setEditingExpense({...editingExpense, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Số lượng</label><input type="number" value={String(editingExpense.quantity)} onChange={(e) => setEditingExpense({...editingExpense, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" value={String(editingExpense.unitPrice)} onChange={(e) => setEditingExpense({...editingExpense, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" value={String(editingExpense.taxAmount || 0)} onChange={(e) => setEditingExpense({...editingExpense, taxAmount: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" value={String(editingExpense.incomeAmount || 0)} onChange={(e) => setEditingExpense({...editingExpense, incomeAmount: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Tồn quỹ (đ)</label><input type="number" value={String(editingExpense.balanceFund || 0)} onChange={(e) => setEditingExpense({...editingExpense, balanceFund: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            {(() => {
              const editQty = Number(editingExpense.quantity || 0);
              const editPrice = Number(editingExpense.unitPrice || 0);
              const editVat = Number(editingExpense.taxAmount || 0);
              const editTotal = editQty * editPrice + editVat;
              return (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between text-xs font-bold">
                  <span className="text-slate-600">Thành tiền tự động:</span>
                  <span className="text-rose-600">{editTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              );
            })()}
            <div>
              <label className="block font-bold mb-1">Ảnh Hóa đơn / Chứng từ</label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg border border-primary/30 hover:bg-primary/20 transition-colors">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Chọn ảnh
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setEditingExpense({...editingExpense, invoiceUrl: reader.result as string});
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
                {editingExpense.invoiceUrl && (
                  <div className="flex items-center gap-2">
                    <img src={editingExpense.invoiceUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border" />
                    <button type="button" onClick={() => setEditingExpense({...editingExpense, invoiceUrl: ''})} className="text-rose-500 hover:text-rose-700">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingExpense.notes} onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu thay đổi</button></div>
          </form>
        )}
      </Modal>

      {/* 4. Modal Lương Công Nhật */}
      <Modal isOpen={isNewLaborOpen} onClose={() => setIsNewLaborOpen(false)} title="Thêm Phiếu thanh toán Lương Công nhật mới">
        <form onSubmit={(e) => {
          e.preventDefault();
          const qty = Number(newLaborData.quantity || 1);
          const price = Number(newLaborData.unitPrice || 0);
          const total = qty * price;

          addLaborPayroll({
            projectCode: selectedProject,
            stt: newLaborData.stt || String(currentProjLabor.length + 1),
            date: newLaborData.date || new Date().toISOString().split('T')[0],
            content: newLaborData.content || 'TT tiền công',
            description: newLaborData.description || 'Lương thợ điện',
            unit: newLaborData.unit || 'Công',
            quantity: qty,
            unitPrice: price,
            totalAmount: total,
            workerName: (newLaborData as any).workerName || '',
            bankAccount: newLaborData.bankAccount || '',
            bankInfo: newLaborData.bankInfo || '',
            idCardFrontUrl: newLaborData.idCardFrontUrl || '',
            idCardBackUrl: newLaborData.idCardBackUrl || '',
            paymentStatus: newLaborData.paymentStatus || 'Chưa thanh toán',
            notes: newLaborData.notes || ''
          });
          setIsNewLaborOpen(false);
          setNewLaborData({stt: '', date: '', content: 'TT tiền công', description: 'Lương thợ điện', unit: 'Công', quantity: 1, unitPrice: 500000, bankAccount: '', bankInfo: '', idCardFrontUrl: '', idCardBackUrl: '', paymentStatus: 'Chưa thanh toán', notes: ''});
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày chấm công *</label><input type="text" placeholder="VD: 16,17,18 hoặc 2026-07-27" required value={newLaborData.date} onChange={(e) => setNewLaborData({...newLaborData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Loại thanh toán</label><input type="text" value={newLaborData.content} onChange={(e) => setNewLaborData({...newLaborData, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Họ tên *</label><input type="text" required placeholder="VD: Nguyễn Văn A" value={(newLaborData as any).workerName || ''} onChange={(e) => setNewLaborData({...newLaborData, workerName: e.target.value} as any)} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            <div><label className="block font-bold mb-1">Diễn giải / Chức danh *</label><input type="text" required placeholder="VD: Lương thợ điện, Lương phụ hồ..." value={newLaborData.description} onChange={(e) => setNewLaborData({...newLaborData, description: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newLaborData.unit} onChange={(e) => setNewLaborData({...newLaborData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Số công/Số lượng</label><input type="number" step="0.5" value={newLaborData.quantity} onChange={(e) => setNewLaborData({...newLaborData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá công nhật (đ)</label><input type="number" value={newLaborData.unitPrice} onChange={(e) => setNewLaborData({...newLaborData, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Số tài khoản ngân hàng</label><input type="text" placeholder="0919996466 - BIDV" value={newLaborData.bankAccount} onChange={(e) => setNewLaborData({...newLaborData, bankAccount: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Tên chủ tài khoản *</label><input type="text" placeholder="VD: Nguyễn Chí Công" value={newLaborData.bankInfo} onChange={(e) => setNewLaborData({...newLaborData, bankInfo: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Mặt trước CCCD (Link Drive)</label><input type="text" placeholder="https://drive.google.com/..." value={newLaborData.idCardFrontUrl} onChange={(e) => setNewLaborData({...newLaborData, idCardFrontUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Mặt sau CCCD (Link Drive)</label><input type="text" placeholder="https://drive.google.com/..." value={newLaborData.idCardBackUrl} onChange={(e) => setNewLaborData({...newLaborData, idCardBackUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div>
            <label className="block font-bold mb-1">Tình trạng thanh toán</label>
            <select value={newLaborData.paymentStatus} onChange={(e) => setNewLaborData({...newLaborData, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
              <option value="Chưa thanh toán">Chưa thanh toán</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
            </select>
          </div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewLaborOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu</button></div>
        </form>
      </Modal>

      {/* Edit Labor Modal */}
      <Modal isOpen={!!editingLabor} onClose={() => setEditingLabor(null)} title="Cập nhật Thông tin Lương Công nhật">
        {editingLabor && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const qty = Number(editingLabor.quantity || 1);
            const price = Number(editingLabor.unitPrice || 0);
            const total = qty * price;

            updateLaborPayroll(editingLabor.id, {
              ...editingLabor,
              totalAmount: total
            });
            setEditingLabor(null);
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày làm *</label><input type="text" required value={editingLabor.date} onChange={(e) => setEditingLabor({...editingLabor, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Loại thanh toán</label><input type="text" value={editingLabor.content} onChange={(e) => setEditingLabor({...editingLabor, content: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Họ tên *</label><input type="text" required value={editingLabor.workerName || ''} onChange={(e) => setEditingLabor({...editingLabor, workerName: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
              <div><label className="block font-bold mb-1">Diễn giải/ Chức vụ *</label><input type="text" required value={editingLabor.description} onChange={(e) => setEditingLabor({...editingLabor, description: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingLabor.unit} onChange={(e) => setEditingLabor({...editingLabor, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Số công</label><input type="number" step="0.5" value={editingLabor.quantity} onChange={(e) => setEditingLabor({...editingLabor, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" value={editingLabor.unitPrice} onChange={(e) => setEditingLabor({...editingLabor, unitPrice: Number(e.target.value)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Số tài khoản</label><input type="text" value={editingLabor.bankAccount} onChange={(e) => setEditingLabor({...editingLabor, bankAccount: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Người nhận *</label><input type="text" required value={editingLabor.bankInfo} onChange={(e) => setEditingLabor({...editingLabor, bankInfo: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Mặt trước CCCD</label><input type="text" value={editingLabor.idCardFrontUrl || ''} onChange={(e) => setEditingLabor({...editingLabor, idCardFrontUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Mặt sau CCCD</label><input type="text" value={editingLabor.idCardBackUrl || ''} onChange={(e) => setEditingLabor({...editingLabor, idCardBackUrl: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div>
              <label className="block font-bold mb-1">Tình trạng thanh toán</label>
              <select value={editingLabor.paymentStatus} onChange={(e) => setEditingLabor({...editingLabor, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
              </select>
            </div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingLabor(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu cập nhật</button></div>
          </form>
        )}
      </Modal>
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
