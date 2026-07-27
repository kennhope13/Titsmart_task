import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { OcrUploadPanel } from '../components/common/OcrUploadPanel';
import { WebOcrExtractedData } from '../services/webOcrService';
import { Task } from '../types';

// Convert integer to Roman numeral
const toRoman = (num: number): string => {
  if (num <= 0) return 'I';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  let n = num;
  for (const [letter, value] of lookup) {
    while (n >= value) {
      roman += letter;
      n -= value;
    }
  }
  return roman;
};

const fromRoman = (roman: string): number => {
  const values: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  return roman
    .toUpperCase()
    .split('')
    .reduce((total, char, index, chars) => {
      const value = values[char] || 0;
      const nextValue = values[chars[index + 1]] || 0;
      return total + (value < nextValue ? -value : value);
    }, 0);
};

const extractLeadingRomanNumber = (text: string): number | null => {
  const match = text.trim().match(/^([IVXLCDM]+)(?:[\s.)-]|$)/i);
  if (!match) return null;

  const roman = match[1].toUpperCase();
  return toRoman(fromRoman(roman)) === roman ? fromRoman(roman) : null;
};

type ImportFileFormat = 'xlsx' | 'csv' | 'pdf' | 'docx';
type ExportFileFormat = 'xlsx' | 'csv' | 'pdf' | 'docx';

const todayStamp = () => new Date().toISOString().split('T')[0];

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const normalizeStatusText = (value?: string) => (value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0111/g, 'd');

const purchaseProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'khong co hang' || clean === 'chua dat hang') return 0;
  if (clean === 'dang dat hang') return 0.3;
  if (clean === 'da dat hang') return 0.6;
  if (clean === 'dang giao') return 0.85;
  if (clean === 'da co hang' || clean === 'hang gia cong') return 1;
  return 0;
};

const constructionProgressScore = (status?: string) => {
  const clean = normalizeStatusText(status);
  if (!clean || clean === 'chua thi cong' || clean === 'dang vuong mac') return 0;
  if (clean === 'vuong mac') return 0.2;
  if (clean === 'da keo day' || clean === 'da lap thiet bi vao tu') return 0.4;
  if (clean === 'dang thi cong') return 0.5;
  if (clean === 'da lap tb + keo day') return 0.6;
  if (clean === 'dang ete') return 0.8;
  if (clean === 'da thi cong') return 1;
  return 0;
};

const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);


// Helper function to truncate long text cleanly
const truncateText = (text: string, maxLength: number = 40): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const TaskManagementPage: React.FC = () => {
  const { tasks, projects, engineers, addTask, addTasksBatch, updateTask, addProject, addEngineer, assignEngineer, deleteTask } = useRealtimeStore();

  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('all');
  const [selectedRomanSection, setSelectedRomanSection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Detailed Attribute Filters
  const [filterPurchase, setFilterPurchase] = useState<string>('all');
  const [filterConstr, setFilterConstr] = useState<string>('all');
  const [filterIssue, setFilterIssue] = useState<string>('all');
  const [filterEngineer, setFilterEngineer] = useState<string>('all');

  // Custom Section Menu Popover state
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState<boolean>(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState<string>('');

  // File import/export menu state
  const [isImportMenuOpen, setIsImportMenuOpen] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [currentImportFormat, setCurrentImportFormat] = useState<ImportFileFormat>('xlsx');

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);


  // Edit Task Modal state
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editStt, setEditStt] = useState('');
  const [editName, setEditName] = useState('');
  const [editSectionName, setEditSectionName] = useState('');
  const [editCustomSection, setEditCustomSection] = useState('');
  const [editVolume, setEditVolume] = useState<number>(1);
  const [editUnit, setEditUnit] = useState('cái');
  const [editPurchaseStatus, setEditPurchaseStatus] = useState('Chưa đặt hàng');
  const [editConstrStatus, setEditConstrStatus] = useState('Chưa thi công');
  const [editIssue, setEditIssue] = useState('');
  const [editIssueStatus, setEditIssueStatus] = useState('');
  const [editEngineerId, setEditEngineerId] = useState('eng-1');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New task form state
  const [stt, setStt] = useState('');
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState(projects[0]?.code || 'DAKRLAP');
  const [sectionSelect, setSectionSelect] = useState<string>('default');
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [volume, setVolume] = useState<number>(1);
  const [unit, setUnit] = useState('cái');
  const [purchaseStatus, setPurchaseStatus] = useState('Chưa đặt hàng');
  const [constrStatus, setConstrStatus] = useState('Chưa thi công');
  const [engineerId, setEngineerId] = useState('eng-1');
  const [isSectionHeader, setIsSectionHeader] = useState(false);
  const [ocrIssueDraft, setOcrIssueDraft] = useState('');

  // New project form state
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState(engineers[0]?.id || 'eng-1');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerTitle, setNewManagerTitle] = useState('Chỉ huy trưởng công trình');

  // Extract Unique Roman Numeral Sections for Filter & Dropdowns
  const activeTasksForProj = tasks.filter((t) => selectedProjectCode === 'all' || t.projectCode === selectedProjectCode);
  
  const rawSectionsList = tasks
    .filter((t) => projectCode === 'all' || t.projectCode === projectCode)
    .map((t) => t.sectionName)
    .filter((secName): secName is string => !!secName && secName.trim().length > 0);

  const uniqueSectionsForProj = Array.from(new Set(rawSectionsList));

  const getNextRomanSectionPrefix = () => {
    const maxRomanNumber = uniqueSectionsForProj.reduce((max, sectionName) => {
      const romanNumber = extractLeadingRomanNumber(sectionName);
      return romanNumber ? Math.max(max, romanNumber) : max;
    }, 0);

    return `${toRoman(maxRomanNumber + 1)}. `;
  };

  const globalUniqueSections = Array.from(
    new Set(
      activeTasksForProj
        .map((t) => t.sectionName)
        .filter((secName): secName is string => !!secName && secName.trim().length > 0)
    )
  );

  // AUTO CALCULATE STT WHEN MODAL OPENS OR INPUTS CHANGE
  useEffect(() => {
    if (!isNewTaskModalOpen) return;

    const projTasks = tasks.filter((t) => t.projectCode === projectCode);

    if (isSectionHeader) {
      // Calculate next Roman numeral for section headers
      const sectionHeaderCount = projTasks.filter((t) => t.isSectionHeader).length;
      setStt(toRoman(sectionHeaderCount + 1));
    } else {
      // Calculate next integer STT for items inside current section
      const targetSec = sectionSelect !== 'default' && sectionSelect !== '__CUSTOM__'
        ? sectionSelect
        : uniqueSectionsForProj[0];

      const secItems = projTasks.filter((t) => !t.isSectionHeader && t.sectionName === targetSec);
      setStt(String(secItems.length + 1));
    }
  }, [isNewTaskModalOpen, isSectionHeader, projectCode, sectionSelect, tasks]);

  // Open Edit Task Modal
  const handleOpenEditModal = (t: Task) => {
    setEditingTask(t);
    setEditStt(t.stt || '');
    setEditName(t.name || '');
    setEditSectionName(t.sectionName || '');
    setEditCustomSection('');
    setEditVolume(t.volume || 0);
    setEditUnit(t.unit || 'cái');
    setEditPurchaseStatus(t.purchaseStatus || 'Chưa đặt hàng');
    setEditConstrStatus(t.constrStatus || 'Chưa thi công');
    setEditIssue(t.issue || '');
    setEditIssueStatus(t.issueStatus || '');
    setEditEngineerId(t.assignedEngineerId || 'eng-1');
    setIsEditTaskModalOpen(true);
  };

  // Submit Save Edited Task
  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editName.trim()) return;

    const finalSection = editSectionName === '__CUSTOM__' ? editCustomSection : editSectionName;
    const eng = engineers.find((e) => e.id === editEngineerId);

    updateTask(editingTask.id, {
      stt: editStt,
      name: editName,
      sectionName: finalSection,
      volume: editVolume,
      unit: editUnit,
      purchaseStatus: editPurchaseStatus,
      constrStatus: editConstrStatus,
      issue: editIssue,
      issueStatus: editIssueStatus,
      assignedEngineerId: editEngineerId,
      assignedEngineerName: eng ? eng.name : editingTask.assignedEngineerName,
    });

    setIsEditTaskModalOpen(false);
    setEditingTask(null);
  };

  // Reset all active filters
  const resetAllFilters = () => {
    setSelectedProjectCode('all');
    setSelectedRomanSection('all');
    setSearchTerm('');
    setFilterPurchase('all');
    setFilterConstr('all');
    setFilterIssue('all');
    setFilterEngineer('all');
  };

  const handleStartCustomSection = () => {
    setSectionSelect('__CUSTOM__');
    setCustomSectionInput(getNextRomanSectionPrefix());
  };

  const isAnyFilterActive =
    selectedProjectCode !== 'all' ||
    selectedRomanSection !== 'all' ||
    searchTerm !== '' ||
    filterPurchase !== 'all' ||
    filterConstr !== 'all' ||
    filterIssue !== 'all' ||
    filterEngineer !== 'all';

  const openImportPicker = (format: ImportFileFormat) => {
    setCurrentImportFormat(format);
    setIsImportMenuOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // Dynamic spreadsheet import handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentImportFormat === 'pdf' || currentImportFormat === 'docx') {
      triggerToast('Định dạng PDF/DOCX hiện dùng để xuất file. Để nhập dữ liệu tiến độ vào bảng, vui lòng dùng Excel hoặc CSV.', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Reject if this is a Project Cost Plan / Material Plan / Doc tracking / Inventory workbook
        const forbiddenKeywords = ['KẾ HOẠCH VẬT TƯ', 'KÉ HOẠCH VẬT TƯ', 'MUA SẮM HÀNG HÓA', 'CHI PHÍ CT', 'LƯƠNG CÔNG NHẬT', 'THEO DÕI HỒ SƠ', 'HOSO', 'TỒN', 'NHẬP KHO', 'XUẤT KHO', 'TONKHO', 'NHAPKHO', 'XUATKHO', 'NHÂN SỰ', 'NHANSU'];
        const isForbiddenWorkbook = wb.SheetNames.some(name => 
          forbiddenKeywords.some(keyword => name.toUpperCase().includes(keyword))
        );
        if (isForbiddenWorkbook) {
          triggerToast('File này thuộc phân hệ khác (Chi phí/Kho/Nhân sự/Hồ sơ). Vui lòng không nhập vào tab Tiến độ Công việc!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const importedTasks: any[] = [];
        let createdProjectsCount = 0;

        wb.SheetNames.forEach((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
          if (!rows || rows.length === 0) return;

          const codeUpper = sheetName.toUpperCase().replace(/\s+/g, '_');
          const existingProj = projects.find((p) => p.code.toUpperCase() === codeUpper || p.name.toLowerCase() === sheetName.toLowerCase());

          if (!existingProj) {
            addProject({
              code: codeUpper,
              name: sheetName,
              location: 'Hiện trường mới',
              progressPercent: 0,
              status: 'active',
              activeTeams: 1,
              totalTasks: 0,
              completedTasks: 0,
              issueTasksCount: 0,
              managerName: 'Kỹ sư Nam',
              startDate: todayStamp(),
              endDate: '2025-12-31',
            });
            createdProjectsCount++;
          }

          const targetProjectCode = existingProj ? existingProj.code : codeUpper;

          let startRow = -1;
          let headerRow: any[] = [];
          for (let rIdx = 0; rIdx < Math.min(rows.length, 15); rIdx++) {
            const r = rows[rIdx];
            if (r && (r.includes('STT') || r.includes('stt') || r.includes('Stt') || r.some((cell: any) => String(cell).toLowerCase() === 'stt'))) {
              startRow = rIdx + 1;
              headerRow = r;
              break;
            }
          }

          if (startRow === -1) {
            triggerToast('Không tìm thấy dòng tiêu đề (STT) trong sheet ' + sheetName, 'warning');
            return;
          }

          const cleanText = (str: any) =>
            String(str || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd')
              .trim();

          const getColIdx = (headers: any[], keywords: string[], fallback: number) => {
            const idx = headers.findIndex((h) => {
              const cleaned = cleanText(h);
              return keywords.some((kw) => cleaned.includes(kw));
            });
            return idx >= 0 ? idx : fallback;
          };

          const headerString = headerRow.map(c => String(c || '').toLowerCase()).join('|');
          const isProgress = headerString.includes('nội dung công việc') || headerString.includes('mô tả') || headerString.includes('khối lượng') || headerString.includes('tiến độ') || headerString.includes('đơn vị');
          if (!isProgress) {
            triggerToast('File không đúng cấu trúc Tiến độ Công việc (thiếu cột Nội dung công việc/Khối lượng/Mô tả)!', 'warning');
            return;
          }

          const sttCol = getColIdx(headerRow, ['stt'], 0);
          const nameCol = getColIdx(headerRow, ['noi dung', 'mo ta', 'dien giai', 'hang muc'], 1);
          const volCol = getColIdx(headerRow, ['khoi luong'], 2);
          const unitCol = getColIdx(headerRow, ['don vi', 'dvt'], 3);
          const progressCol = getColIdx(headerRow, ['tien do'], -1);
          const purchaseCol = getColIdx(headerRow, ['mua hang', 'vat tu', 'cung cap'], -1);
          const constrCol = getColIdx(headerRow, ['thi cong', 'xay lap'], -1);
          const issueCol = getColIdx(headerRow, ['vuong mac', 'su co', 'ton dong'], -1);
          const issueStatusCol = getColIdx(headerRow, ['trang thai xu ly', 'tt xu ly'], -1);
          const isDoneCol = getColIdx(headerRow, ['hoan thanh', 'da xong'], -1);
          const notesCol = getColIdx(headerRow, ['ghi chu'], -1);

          let currentSection = 'Mục chung';

          for (let i = startRow; i < rows.length; i++) {
            const r = rows[i];
            if (!r || (!r[nameCol] && !r[sttCol])) continue;

            const itemName = r[nameCol] || r[sttCol];
            if (!itemName || String(itemName).trim().length === 0) continue;

            const sttVal = r[sttCol] ? String(r[sttCol]).trim() : '';
            const volVal = volCol >= 0 ? (typeof r[volCol] === 'number' ? r[volCol] : (parseFloat(r[volCol]) || 0)) : 0;
            const unitVal = unitCol >= 0 ? String(r[unitCol] || '').trim() : '';

            // Bỏ qua dòng tiêu đề phụ hoặc dòng rác
            if (sttVal.toLowerCase() === 'stt' || String(itemName).toLowerCase().includes('mo ta cong viec moi thau')) continue;

            const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|MỤC\s+[A-Z0-9]+|[A-Z]{1,2})$/i;
            const isSection = romanRegex.test(sttVal) || (volVal === 0 && (!unitVal || unitVal === ''));

            if (isSection) {
              currentSection = `${sttVal ? sttVal + '. ' : ''}${itemName}`;
            }

            const rawProgress = progressCol >= 0 ? (typeof r[progressCol] === 'number' ? r[progressCol] : (parseFloat(r[progressCol]) || 0)) : 0;
            const finalProgress = rawProgress > 1 ? rawProgress / 100 : rawProgress;

            importedTasks.push({
              stt: sttVal || `${i - startRow + 1}`,
              code: `TSK-IMP-${Date.now()}-${i}`,
              name: String(itemName).trim(),
              projectCode: targetProjectCode,
              projectName: sheetName,
              volume: volVal,
              unit: unitVal,
              progress: finalProgress,
              status: (finalProgress >= 1 ? 'Done' : finalProgress > 0 ? 'In Progress' : 'Not Started'),
              purchaseStatus: purchaseCol >= 0 && r[purchaseCol] ? String(r[purchaseCol]) : 'Chưa đặt hàng',
              constrStatus: constrCol >= 0 && r[constrCol] ? String(r[constrCol]) : 'Chưa thi công',
              issue: issueCol >= 0 && r[issueCol] ? String(r[issueCol]) : '',
              issueStatus: issueStatusCol >= 0 && r[issueStatusCol] ? String(r[issueStatusCol]) : '',
              isDone: isDoneCol >= 0 ? (r[isDoneCol] === true || String(r[isDoneCol]).toLowerCase() === 'da hoan thanh') : (finalProgress >= 1),
              isSectionHeader: isSection,
              sectionName: currentSection,
              notes: notesCol >= 0 && r[notesCol] ? String(r[notesCol]) : '',
              assignedEngineerId: 'eng-1',
              assignedEngineerName: 'Kỹ sư Nam',
            });
          }
        });

        if (importedTasks.length > 0) {
          addTasksBatch(importedTasks);
          triggerToast(`Đã nạp thành công ${importedTasks.length} hạng mục từ file Excel!`, 'success');
        }
      } catch (err) {
        console.error('Lỗi đọc file:', err);
        triggerToast('Không đọc được file. Vui lòng kiểm tra lại định dạng và cấu trúc dữ liệu.', 'warning');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTaskExportData = () => displayTasks.map((t) => ({
    'STT': t.stt,
    'MỤC LA MÃ': t.isSectionHeader ? '[TIÊU ĐỀ MỤC]' : t.sectionName || '',
    'NỘI DUNG CÔNG VIỆC': t.name,
    'DỰ ÁN': t.projectName,
    'KHỐI LƯỢNG': t.isSectionHeader ? '' : t.volume,
    'ĐVT': t.unit || '',
    'TIẾN ĐỘ': t.isSectionHeader ? '' : `${Math.round(t.progress * 100)}%`,
    'TÌNH TRẠNG MUA HÀNG': t.purchaseStatus || '',
    'TÌNH TRẠNG THI CÔNG': t.constrStatus || '',
    'VƯỚNG MẮC/ TỒN ĐỌNG': t.issue || '',
    'TT XỬ LÝ': t.issueStatus || '',
    'HOÀN THÀNH': t.isDone ? 'Đã hoàn thành' : 'Chưa',
  }));

  const handleExportFile = (format: ExportFileFormat) => {
    setIsExportMenuOpen(false);
    const exportData = getTaskExportData();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const baseFileName = `Tien_Do_Cong_Viec_${todayStamp()}`;

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu Tiến độ');
      XLSX.writeFile(workbook, `${baseFileName}.xlsx`);
      return;
    }

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      downloadBlob(`\uFEFF${csv}`, `${baseFileName}.csv`, 'text/csv;charset=utf-8;');
      return;
    }

    if (format === 'pdf') {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.setFontSize(14);
      pdf.text('Tien Do Cong Viec', 12, 12);
      pdf.setFontSize(8);

      let y = 22;
      exportData.slice(0, 80).forEach((row, index) => {
        if (y > 190) {
          pdf.addPage();
          y = 14;
        }
        const line = `${index + 1}. ${row['STT']} | ${row['NỘI DUNG CÔNG VIỆC']} | ${row['DỰ ÁN']} | ${row['TIẾN ĐỘ']} | ${row['HOÀN THÀNH']}`;
        const wrapped = pdf.splitTextToSize(line, 270);
        pdf.text(wrapped, 12, y);
        y += Math.max(7, wrapped.length * 4);
      });
      pdf.save(`${baseFileName}.pdf`);
      return;
    }

    const rowsHtml = exportData.map((row) => (
      `<tr>${Object.values(row).map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`
    )).join('');
    const headerHtml = Object.keys(exportData[0] || {}).map((key) => `<th>${escapeHtml(key)}</th>`).join('');
    const docHtml = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd5e1;padding:4px;text-align:left}th{background:#eff6ff}</style></head><body><h2>Tiến Độ Công Việc</h2><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    downloadBlob(docHtml, `${baseFileName}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8;');
  };
  const applyOcrToNewTaskForm = (data: WebOcrExtractedData) => {
    const matchedProject = data.projectName
      ? projects.find((project) => {
          const projectName = project.name.toLowerCase();
          const ocrProjectName = data.projectName.toLowerCase();
          return projectName.includes(ocrProjectName) || ocrProjectName.includes(projectName) || project.code.toLowerCase() === ocrProjectName;
        })
      : null;

    const ocrName = data.taskName || data.materialName;
    if (ocrName) setName(ocrName);
    if (matchedProject) setProjectCode(matchedProject.code);
    if (data.quantity) {
      const normalizedQuantity = Number.parseFloat(data.quantity.replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(normalizedQuantity) && normalizedQuantity > 0) setVolume(normalizedQuantity);
    }
    if (data.unit) setUnit(data.unit);

    const isImage = data.sourceFileType?.startsWith('image/') || (!data.sourceFileType && !data.sourceFileName?.match(/\.(xlsx|xls|csv|txt|docx|pdf)$/i));
    const labelHeader = isImage ? 'OCR gốc:' : 'Nội dung tệp gốc:';

    const ocrNotes = [
      data.materialCode ? `Mã vật tư: ${data.materialCode}` : '',
      data.materialName ? `Vật tư: ${data.materialName}` : '',
      data.location ? `Địa điểm: ${data.location}` : '',
      data.dueDate ? `Hạn/Ngày: ${data.dueDate}` : '',
      data.note ? `Ghi chú: ${data.note}` : '',
      (isImage && data.rawText) ? `OCR gốc:\n${data.rawText}` : '',
    ].filter(Boolean).join('\n');

    setOcrIssueDraft(ocrNotes);
    setIsSectionHeader(false);
    triggerToast('Đã trích dữ liệu phụ lục vào form thêm hạng mục. Kiểm tra lại trước khi lưu.', 'success');
  };
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const proj = projects.find((p) => p.code === projectCode);
    const eng = engineers.find((e) => e.id === engineerId);

    const finalSectionName = isSectionHeader
      ? name
      : sectionSelect === '__CUSTOM__'
      ? customSectionInput
      : sectionSelect !== 'default'
      ? sectionSelect
      : uniqueSectionsForProj[0] || 'I. Hạng mục chung';

    const nextStt = String(tasks.filter(t => t.projectCode === projectCode).length + 1);
    addTask({
      stt: stt || (isSectionHeader ? 'I' : nextStt),
      code: `TSK-${Date.now()}`,
      name,
      projectCode,
      projectName: proj ? proj.name : projectCode,
      volume: isSectionHeader ? 0 : volume,
      unit: isSectionHeader ? '' : unit,
      progress: 0,
      status: 'Not Started',
      purchaseStatus: isSectionHeader ? '' : purchaseStatus,
      constrStatus: isSectionHeader ? '' : constrStatus,
      isDone: false,
      isSectionHeader,
      sectionName: finalSectionName,
      assignedEngineerId: engineerId,
      assignedEngineerName: eng ? eng.name : 'Kỹ sư Nam',
    });

    setIsNewTaskModalOpen(false);
    setName('');
    setStt('');
    setOcrIssueDraft('');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const code = newProjCode.trim() ? newProjCode.trim().toUpperCase() : 'PROJ-' + Math.floor(Math.random() * 1000);
    const selectedManager = engineers.find((eng) => eng.id === newProjManagerId);
    const createdManager =
      newProjManagerId === '__NEW__' && newManagerName.trim()
        ? addEngineer({
            name: newManagerName.trim(),
            title: newManagerTitle.trim() || 'Chỉ huy trưởng công trình',
            avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
            phone: '',
            email: '',
          })
        : null;

    const managerName = createdManager?.name || selectedManager?.name || 'Kỹ sư Nam';

    addProject({
      code,
      name: newProjName,
      location: newProjLocation || 'Hiện trường mới',
      progressPercent: 0,
      status: 'active',
      activeTeams: 1,
      totalTasks: 0,
      completedTasks: 0,
      issueTasksCount: 0,
      managerName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2025-12-31',
    });

    setIsNewProjectModalOpen(false);
    setSelectedProjectCode(code);
    setNewProjName('');
    setNewProjCode('');
    setNewProjLocation('');
    setNewProjManagerId(createdManager?.id || engineers[0]?.id || 'eng-1');
    setNewManagerName('');
    setNewManagerTitle('Chỉ huy trưởng công trình');
  };

  // Filter Tasks by Project, Roman Section, Purchase, Construction, Issue, Engineer & Search Term
  const displayTasks = tasks.filter((t) => {
    const matchesProj = selectedProjectCode === 'all' || t.projectCode === selectedProjectCode;

    // Attribute Filters
    const matchesPurchase = filterPurchase === 'all' || t.purchaseStatus === filterPurchase;
    const matchesConstr = filterConstr === 'all' || t.constrStatus === filterConstr;
    const matchesIssue =
      filterIssue === 'all'
        ? true
        : filterIssue === 'has_issue'
        ? !!t.issue
        : !t.issue;
    const matchesEngineer = filterEngineer === 'all' || t.assignedEngineerId === filterEngineer;

    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.issue && t.issue.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.sectionName && t.sectionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.assignedEngineerName?.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedRomanSection === 'all') {
      return (
        matchesProj &&
        matchesPurchase &&
        matchesConstr &&
        matchesIssue &&
        matchesEngineer &&
        matchesSearch
      );
    } else {
      if (t.isSectionHeader) return false;
      const matchesRomanSection = t.sectionName === selectedRomanSection;

      return (

        matchesProj &&
        matchesRomanSection &&
        matchesPurchase &&
        matchesConstr &&
        matchesIssue &&
        matchesEngineer &&
        matchesSearch
      );
    }
  });

  const groupedTasks = React.useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    const order: string[] = [];
    displayTasks.forEach((t) => {
      const sec = t.sectionName || 'Khác';
      if (!groups[sec]) {
        groups[sec] = [];
        order.push(sec);
      }
      groups[sec].push(t);
    });
    
    const flattened: Task[] = [];
    order.forEach((sec) => {
      groups[sec].sort((a, b) => {
        if (a.isSectionHeader && !b.isSectionHeader) return -1;
        if (!a.isSectionHeader && b.isSectionHeader) return 1;
        return 0;
      });
      
      const hasHeader = groups[sec].some(t => t.isSectionHeader);
      if (!hasHeader && sec && sec !== 'Khác') {
        // Automatically inject a header so the section is always properly labeled
        // even if the original header was filtered out or never existed.
        let guessedStt = '';
        let guessedName = sec;
        if (sec.includes('.')) {
          guessedStt = sec.split('.')[0];
          guessedName = sec.substring(sec.indexOf('.') + 1).trim();
        }
        
        flattened.push({
          id: `fake-header-${sec}-${Date.now()}`,
          stt: guessedStt,
          code: '',
          name: guessedName,
          projectCode: groups[sec][0]?.projectCode || '',
          projectName: groups[sec][0]?.projectName || '',
          volume: 0,
          unit: '',
          progress: 0,
          status: 'Not Started',
          purchaseStatus: '',
          constrStatus: '',
          isDone: false,
          isSectionHeader: true,
          sectionName: sec,
        });
      }
      
      flattened.push(...groups[sec]);
    });
    return flattened;
  }, [displayTasks]);

  const totalPureItems = groupedTasks.filter((t) => !t.isSectionHeader).length;
  const completedPureItems = groupedTasks.filter((t) => !t.isSectionHeader && (t.isDone || t.progress >= 1)).length;

  return (
    <div className="px-0 pt-0 pb-4 space-y-0">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
        className="hidden"
      />

      <section className="task-management-screen bg-white border-y border-r border-slate-200 shadow-xs overflow-hidden">
      {/* Page Header */}
      <div className="px-5 py-3 flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">assignment</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">Quản lý Tiến độ Công việc</h2>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-blue-100 whitespace-nowrap">{totalPureItems} hạng mục</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <div className="relative">
            <button
              onClick={() => {
                setIsImportMenuOpen(!isImportMenuOpen);
                setIsExportMenuOpen(false);
              }}
              className="flex items-center gap-1.5 border border-blue-200 bg-blue-50 text-primary px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Nhập file</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

            {isImportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                {([
                  ['xlsx', 'Excel (.xlsx)', 'table_view'],
                  ['csv', 'CSV (.csv)', 'csv'],
                  ['pdf', 'PDF (.pdf)', 'picture_as_pdf'],
                  ['docx', 'Word (.docx)', 'description'],
                ] as Array<[ImportFileFormat, string, string]>).map(([format, label, icon]) => (
                  <button
                    key={format}
                    onClick={() => openImportPicker(format)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-blue-600">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsImportMenuOpen(false);
              }}
              className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base text-emerald-700">download</span>
              <span>Xuất file</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                {([
                  ['xlsx', 'Excel (.xlsx)', 'table_view'],
                  ['csv', 'CSV (.csv)', 'csv'],
                  ['pdf', 'PDF (.pdf)', 'picture_as_pdf'],
                  ['docx', 'Word (.docx)', 'description'],
                ] as Array<[ExportFileFormat, string, string]>).map(([format, label, icon]) => (
                  <button
                    key={format}
                    onClick={() => handleExportFile(format)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm text-emerald-600">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (selectedProjectCode !== 'all') {
                setProjectCode(selectedProjectCode);
              }
              setIsNewTaskModalOpen(true);
            }}
            className="flex items-center gap-1 bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Thêm Hạng mục
          </button>
        </div>
      </div>

      {/* TOOLBAR BỘ LỌC */}
      <div className="px-3 py-3 space-y-3">
        {/* Row 1: Primary Filters (Project & Custom Ultra-Sleek Section Dropdown) + Quick Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Left: Project Selector & Section Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Project Selector */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400">Dự án:</span>
              <select
                value={selectedProjectCode}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setIsNewProjectModalOpen(true);
                  } else {
                    setSelectedProjectCode(e.target.value);
                    setSelectedRomanSection('all');
                  }
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 py-1.5 px-2.5 focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">Tất cả Dự án ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
                <option value="__CREATE_NEW__" className="font-bold text-primary">+ Tạo Dự án Mới...</option>
              </select>
            </div>

            {/* ULTRA-SLEEK MODERN ROMAN SECTION DROPDOWN POPOVER */}
            {selectedProjectCode !== 'all' && (
              <>
                <span className="text-slate-300">|</span>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSectionMenuOpen(!isSectionMenuOpen);
                    }}
                    className={`border rounded-lg text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 transition-all shadow-2xs ${
                      selectedRomanSection !== 'all'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-blue-50/80 border-blue-200 text-primary hover:bg-blue-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">filter_alt</span>
                    <span className="truncate max-w-[220px]">
                      {selectedRomanSection === 'all' ? 'Tất cả Mục La Mã' : selectedRomanSection}
                    </span>
                    <span className="material-symbols-outlined text-sm flex-shrink-0">expand_more</span>
                  </button>

                  {/* ULTRA-SLEEK MODERN DROPDOWN PANEL */}
                  {isSectionMenuOpen && (
                    <>
                      {/* Backdrop overlay to close on outside click */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsSectionMenuOpen(false)}
                      />

                      <div className="absolute left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 space-y-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                        {/* Header */}
                        <div className="flex justify-between items-center px-2 py-1 border-b border-slate-100 font-bold text-slate-700">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-primary">filter_alt</span>
                            Chọn Mục La Mã
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({globalUniqueSections.length} mục)</span>
                        </div>

                        {/* Search inside section list */}
                        <div className="relative px-1">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                            search
                          </span>
                          <input
                            type="text"
                            placeholder="Tìm Mục La Mã..."
                            value={sectionSearchQuery}
                            onChange={(e) => setSectionSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"
                          />
                        </div>

                        {/* Scrollable List of Clean Truncated Items */}
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5 px-0.5">
                          <div
                            onClick={() => {
                              setSelectedRomanSection('all');
                              setIsSectionMenuOpen(false);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer flex justify-between items-center transition-colors ${
                              selectedRomanSection === 'all'
                                ? 'bg-primary text-white font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span>-- Tất cả Mục La Mã --</span>
                            <span className="text-[10px] font-mono opacity-80">
                              {activeTasksForProj.filter((t) => !t.isSectionHeader).length} việc
                            </span>
                          </div>

                          {globalUniqueSections
                            .filter((sec) => sec.toLowerCase().includes(sectionSearchQuery.toLowerCase()))
                            .map((secName) => {
                              const isSelected = selectedRomanSection === secName;
                              const count = activeTasksForProj.filter(
                                (t) => !t.isSectionHeader && t.sectionName === secName
                              ).length;

                              return (
                                <div
                                  key={secName}
                                  onClick={() => {
                                    setSelectedRomanSection(secName);
                                    setIsSectionMenuOpen(false);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                                    isSelected
                                      ? 'bg-primary text-white font-bold'
                                      : 'hover:bg-blue-50 text-slate-800'
                                  }`}
                                >
                                  <span className="truncate text-[11px] font-semibold" title={secName}>
                                    {secName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                      isSelected
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {count}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: Quick Search Box */}
          <div className="relative w-full md:w-56">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm nhanh công việc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Row 2: DETAILED ATTRIBUTE FILTERS */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Lọc chi tiết:
            </span>

            {/* Filter Mua hàng */}
            <select
              value={filterPurchase}
              onChange={(e) => setFilterPurchase(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md py-1 px-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">Mua hàng: Tất cả</option>
              <option value="Đã có hàng">Đã có hàng</option>
              <option value="Đã đặt hàng">Đã đặt hàng</option>
              <option value="Chưa đặt hàng">Chưa đặt hàng</option>
            </select>

            {/* Filter Thi công */}
            <select
              value={filterConstr}
              onChange={(e) => setFilterConstr(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md py-1 px-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">Thi công: Tất cả</option>
              <option value="Đã thi công">Đã thi công</option>
              <option value="Đã lắp TB + kéo dây">Đã lắp TB + kéo dây</option>
              <option value="Chưa thi công">Chưa thi công</option>
            </select>

            {/* Filter Vướng mắc */}
            <select
              value={filterIssue}
              onChange={(e) => setFilterIssue(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md py-1 px-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">Vướng mắc: Tất cả</option>
              <option value="has_issue">Có vướng mắc / tồn đọng</option>
              <option value="no_issue">Không có vướng mắc</option>
            </select>

            {/* Filter Kỹ sư */}
            <select
              value={filterEngineer}
              onChange={(e) => setFilterEngineer(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md py-1 px-2.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">Kỹ sư: Tất cả</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset All Filters Button */}
          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* BANNER HIỂN THỊ MỤC ĐANG LỌC */}
      {selectedRomanSection !== 'all' && (
        <div className="border-t border-blue-100 bg-blue-50 text-primary px-3 py-1.5 text-xs flex justify-between items-center">
          <div className="flex items-center gap-2 truncate">
            <span className="material-symbols-outlined text-base">folder_open</span>
            <span className="font-bold">Đang xem riêng Mục:</span>
            <span className="font-bold text-slate-800 truncate" title={selectedRomanSection}>
              {selectedRomanSection}
            </span>
          </div>
          <button
            onClick={() => setSelectedRomanSection('all')}
            className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 flex-shrink-0 ml-2"
          >
            <span className="material-symbols-outlined text-sm">close</span> Xem tất cả Mục La Mã
          </button>
        </div>
      )}

      {/* Main Data Table */}
      <div className="border-t border-slate-200 flex flex-col">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2 w-[45px] text-center border-b border-slate-200 whitespace-nowrap">STT</th>
                <th className="py-2.5 px-3 w-[34%] border-b border-slate-200 whitespace-nowrap">NỘI DUNG CÔNG VIỆC</th>
                <th className="py-2.5 px-2.5 w-[8%] text-right border-b border-slate-200 whitespace-nowrap">KHỐI LƯỢNG</th>
                <th className="py-2.5 px-2 w-[6%] text-center border-b border-slate-200 whitespace-nowrap">ĐVT</th>
                <th className="py-2.5 px-2.5 w-[10%] text-center border-b border-slate-200 whitespace-nowrap">TIẾN ĐỘ (%)</th>
                <th className="py-2.5 px-2.5 w-[12%] text-center border-b border-slate-200 whitespace-nowrap">MUA HÀNG</th>
                <th className="py-2.5 px-2.5 w-[11%] text-center border-b border-slate-200 whitespace-nowrap">THI CÔNG</th>
                <th className="py-2.5 px-2.5 w-[12%] text-red-600 font-bold border-b border-slate-200 whitespace-nowrap">VƯỚNG MẮC</th>
                <th className="py-2.5 px-2.5 w-[9%] border-b border-slate-200 whitespace-nowrap">KỸ SƯ</th>
                <th className="py-2.5 px-2 w-[40px] text-center border-b border-slate-200 whitespace-nowrap">XOÁ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {groupedTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 whitespace-nowrap">
                    Không có hạng mục nào phù hợp với bộ lọc đã chọn
                  </td>
                </tr>
              ) : (
                groupedTasks.map((t, idx) => {
                  if (t.isSectionHeader) {
                    return (
                      <tr
                        key={t.id}
                        className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary"
                      >
                        <td
                          onClick={() => handleOpenEditModal(t)}
                          className="py-2 px-2 text-center font-mono font-extrabold text-xs text-primary cursor-pointer hover:underline whitespace-nowrap"
                          title="Nhấn để chỉnh sửa Tiêu đề Mục này"
                        >
                          {t.stt}
                        </td>
                        <td
                          colSpan={8}
                          onClick={() => handleOpenEditModal(t)}
                          className="py-2 px-3 uppercase tracking-tight font-extrabold text-xs text-primary cursor-pointer hover:underline whitespace-nowrap"
                          title="Nhấn để chỉnh sửa Tiêu đề Mục này"
                        >
                          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                            <span className="material-symbols-outlined text-base flex-shrink-0">folder_open</span>
                            <span className="truncate">{t.name}</span>
                            <span className="text-[10px] font-normal text-slate-500 lowercase flex-shrink-0">({t.projectName})</span>
                          </div>
                        </td>
                        
                        {/* CLEAN SINGLE DELETE BUTTON */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors inline-flex items-center"
                            title="Xóa tiêu đề mục"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const pct = Math.round((t.progress || 0) * 100);
                  const isFinished = t.isDone || pct >= 100;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        t.issue ? 'bg-amber-50/30' : isFinished ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td
                        onClick={() => handleOpenEditModal(t)}
                        className="py-2 px-2 font-mono text-slate-400 text-center cursor-pointer hover:text-blue-600 whitespace-nowrap font-bold"
                        title="Nhấn để chỉnh sửa STT"
                      >
                        {t.stt || idx + 1}
                      </td>
                      
                      {/* DIRECT CLICK TO EDIT ON WORK CONTENT CELL */}
                      <td
                        onClick={() => handleOpenEditModal(t)}
                        className="py-2 px-3 font-bold text-slate-900 leading-tight cursor-pointer hover:text-blue-600 hover:underline transition-colors truncate"
                        title={t.name}
                      >
                        {t.name}
                      </td>
                      
                      <td
                        onClick={() => handleOpenEditModal(t)}
                        className="py-2 px-2.5 text-right font-mono font-semibold text-slate-900 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                        title="Nhấn để chỉnh sửa khối lượng"
                      >
                        {t.volume ? t.volume.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500 whitespace-nowrap">{t.unit || '-'}</td>
                      <td
                        onClick={() => handleOpenEditModal(t)}
                        className="py-2 px-2.5 text-center whitespace-nowrap cursor-pointer"
                        title="Tiến độ tự tính từ tình trạng mua hàng và tình trạng thi công"
                      >
                        <span
                          className={`inline-flex min-w-12 items-center justify-center px-2 py-0.5 font-mono font-bold text-xs rounded border ${
                            isFinished
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : pct > 0
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>

                      {/* STRICT SINGLE LINE NO WRAP PURCHASE BADGE */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            t.purchaseStatus === 'Đã có hàng'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.purchaseStatus === 'Đã đặt hàng'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.purchaseStatus || 'Chưa đặt'}
                        </span>
                      </td>

                      <td className="py-2 px-2.5 text-center text-slate-600 text-[11px] whitespace-nowrap">
                        {t.constrStatus || 'Chưa làm'}
                      </td>
                      
                      <td
                        onClick={() => handleOpenEditModal(t)}
                        className="py-2 px-2.5 font-semibold text-red-600 cursor-pointer hover:underline truncate"
                        title={t.issue || ''}
                      >
                        {t.issue ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap truncate">
                            <span className="material-symbols-outlined text-red-500 text-xs flex-shrink-0">warning</span>
                            <span className="truncate">{t.issue}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <select
                          value={t.assignedEngineerId || 'eng-1'}
                          onChange={(e) => {
                            const eng = engineers.find((x) => x.id === e.target.value);
                            if (eng) assignEngineer(t.id, eng.id, eng.name);
                          }}
                          className="bg-transparent border border-transparent hover:border-slate-200 rounded px-1 py-0.5 text-xs font-medium text-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          {engineers.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      
                      {/* CLEAN SINGLE DELETE BUTTON */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => deleteTask(t.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors inline-flex items-center"
                          title="Xóa Hạng mục"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Footer */}
        <div className="py-2 px-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <div className="flex items-center gap-1 truncate">
            <span>Đang xem:</span>
            <strong className="text-slate-800 font-bold truncate">
              {selectedRomanSection === 'all' ? 'Tất cả các Mục La Mã' : selectedRomanSection}
            </strong>
          </div>
          <span className="font-mono font-bold text-slate-700 flex-shrink-0">
            Hoàn thành: {completedPureItems} / {totalPureItems} hạng mục
          </span>
        </div>
      </div>


      </section>
      {/* end-task-management-screen */}
      {/* EDIT TASK MODAL */}
      <Modal
        isOpen={isEditTaskModalOpen}
        onClose={() => setIsEditTaskModalOpen(false)}
        title={editingTask?.isSectionHeader ? 'Chỉnh sửa Tiêu đề Mục La Mã' : 'Chỉnh sửa Hạng mục Thi công'}
      >
        <form onSubmit={handleSaveEditTask} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">STT / Mã</label>
              <input
                type="text"
                value={editStt}
                onChange={(e) => setEditStt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Dự án</label>
              <input
                type="text"
                disabled
                value={editingTask?.projectName || ''}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 font-bold text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {!editingTask?.isSectionHeader && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Thuộc Mục La Mã</label>
              <select
                value={editSectionName}
                onChange={(e) => setEditSectionName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/50 font-bold text-primary"
              >
                {uniqueSectionsForProj.map((sec) => (
                  <option key={sec} value={sec}>
                    {truncateText(sec, 45)}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Nhập Mục La Mã mới...</option>
              </select>

              {editSectionName === '__CUSTOM__' && (
                <input
                  type="text"
                  required
                  placeholder="VD: XIII. HỆ THỐNG ĐIỆN CHIẾU SÁNG"
                  value={editCustomSection}
                  onChange={(e) => setEditCustomSection(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
                />
              )}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nội dung Công việc *</label>
            <textarea
              required
              rows={2}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
            />
          </div>

          {!editingTask?.isSectionHeader && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối lượng</label>
                  <input
                    type="number"
                    value={editVolume}
                    onChange={(e) => setEditVolume(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn vị tính (ĐVT)</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label>
                  <select
                    value={editPurchaseStatus}
                    onChange={(e) => setEditPurchaseStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    <option value="Đã có hàng">Đã có hàng</option>
                    <option value="Đã nhận đủ">Đã nhận đủ</option>
                    <option value="Đang giao hàng">Đang giao hàng</option>
                    <option value="Đã đặt hàng">Đã đặt hàng</option>
                    <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label>
                  <select
                    value={editConstrStatus}
                    onChange={(e) => setEditConstrStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    <option value="Đã thi công">Đã thi công</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                    <option value="Đang thi công">Đang thi công</option>
                    <option value="Đã lắp TB + kéo dây">Đã lắp TB + kéo dây</option>
                    <option value="Chưa thi công">Chưa thi công</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-red-600 mb-1">Vướng mắc / Tồn đọng (nếu có)</label>
                  <input
                    type="text"
                    placeholder="VD: Thiếu vật tư cáp..."
                    value={editIssue}
                    onChange={(e) => setEditIssue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-red-50/30 text-red-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái Xử lý Vướng mắc</label>
                  <input
                    type="text"
                    placeholder="VD: Yêu cầu cấp bổ sung..."
                    value={editIssueStatus}
                    onChange={(e) => setEditIssueStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kỹ sư Phụ trách</label>
                  <select
                    value={editEngineerId}
                    onChange={(e) => setEditEngineerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.title})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiến độ tự tính (%)</label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-800">
                    {calculateAutoProgressPercent(editPurchaseStatus, editConstrStatus)}%
                  </div>
                </div>
              </div>
            </>
          )}<div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditTaskModalOpen(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </Modal>

      {/* SLEEK NEW TASK MODAL */}
      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title="Thêm Hạng mục Công việc" size="xl">
        <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
          <OcrUploadPanel onExtracted={applyOcrToNewTaskForm} compact />

          {/* PROJECT & SECTION SELECTION */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Thuộc Dự án *</label>
              <select
                value={projectCode}
                onChange={(e) => {
                  setProjectCode(e.target.value);
                  setSectionSelect('default');
                  setCustomSectionInput('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
              >
                {projects.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Thuộc Mục La Mã *</label>
              <div className="flex items-center gap-1.5">
                <select
                  value={sectionSelect}
                  onChange={(e) => setSectionSelect(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-blue-50/70 font-bold text-primary truncate"
                >
                  <option value="default">-- Chọn Mục La Mã --</option>
                  {uniqueSectionsForProj.map((sec) => (
                    <option key={sec} value={sec} title={sec}>
                      {truncateText(sec, 40)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleStartCustomSection}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center border border-blue-300 bg-blue-50 text-primary rounded-md text-sm font-bold hover:bg-blue-100 transition-all"
                  title="Thêm mục La Mã mới"
                >
                  +
                </button>
              </div>

              {/* Inline input for new section name */}
              {sectionSelect === '__CUSTOM__' && (
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="VD: XIII. HỆ THỐNG ĐIỆN CHIẾU SÁNG"
                  value={customSectionInput}
                  onChange={(e) => setCustomSectionInput(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold text-xs"
                />
              )}
            </div>
          </div>

          {/* ITEM NAME */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên Hạng mục / Thiết bị *</label>
            <input
              type="text"
              required
              placeholder="VD: Máy bơm điện Q=54m3/h; H=30mH2O"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
            />
          </div>

          {/* DETAIL FIELDS */}
          <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối lượng</label>
                  <input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn vị tính (ĐVT)</label>
                  <input
                    type="text"
                    placeholder="VD: cái, bộ, m, m³..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label>
                  <select
                    value={purchaseStatus}
                    onChange={(e) => setPurchaseStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    <option value="Đã có hàng">Đã có hàng</option>
                    <option value="Đã nhận đủ">Đã nhận đủ</option>
                    <option value="Đang giao hàng">Đang giao hàng</option>
                    <option value="Đã đặt hàng">Đã đặt hàng</option>
                    <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label>
                  <select
                    value={constrStatus}
                    onChange={(e) => setConstrStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    <option value="Đã thi công">Đã thi công</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                    <option value="Đang thi công">Đang thi công</option>
                    <option value="Đã lắp TB + kéo dây">Đã lắp TB + kéo dây</option>
                    <option value="Chưa thi công">Chưa thi công</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kỹ sư Phụ trách</label>
                  <select
                    value={engineerId}
                    onChange={(e) => setEngineerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.name} ({eng.title})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiến độ tự tính (%)</label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold text-slate-800">
                    {calculateAutoProgressPercent(purchaseStatus, constrStatus)}%
                  </div>
                </div>
              </div>
          </>

          {ocrIssueDraft && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dữ liệu phụ lục / Ghi chú</label>
              <textarea
                value={ocrIssueDraft}
                onChange={(e) => setOcrIssueDraft(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-slate-50 text-xs font-mono leading-5"
              />
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">
              Lưu Hạng Mục
            </button>
          </div>
        </form>
      </Modal>

      {/* NEW PROJECT MODAL */}
      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Khởi tạo Dự án / Công trình Mới">
        <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên Dự án / Công trình Mới *</label>
            <input
              type="text"
              required
              placeholder="VD: Trạm biến áp 220kV Cà Mau"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã Dự án</label>
              <input
                type="text"
                placeholder="VD: 220KV_CAMAU"
                value={newProjCode}
                onChange={(e) => setNewProjCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Địa điểm công trình</label>
              <input
                type="text"
                placeholder="VD: Cà Mau"
                value={newProjLocation}
                onChange={(e) => setNewProjLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chỉ huy trưởng</label>
            <select
              value={newProjManagerId}
              onChange={(e) => setNewProjManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            >
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
              <option value="__NEW__">+ Thêm người mới...</option>
            </select>

            {newProjManagerId === '__NEW__' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên người mới *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kỹ sư Minh"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức danh</label>
                  <input
                    type="text"
                    placeholder="VD: Chỉ huy trưởng công trình"
                    value={newManagerTitle}
                    onChange={(e) => setNewManagerTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  />
                </div>
              </div>
            )}
          </div><div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">
              Tạo Dự án
            </button>
          </div>
        </form>
      </Modal>
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
