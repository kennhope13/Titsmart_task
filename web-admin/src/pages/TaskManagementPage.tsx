import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
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

// Helper function to truncate long text cleanly
const truncateText = (text: string, maxLength: number = 40): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const TaskManagementPage: React.FC = () => {
  const { tasks, projects, engineers, addTask, addTasksBatch, updateTask, addProject, addEngineer, assignEngineer, updateTaskProgress, deleteTask } = useRealtimeStore();

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
      alert('Định dạng PDF/DOCX hiện dùng để xuất file. Để nhập dữ liệu tiến độ vào bảng, vui lòng dùng Excel hoặc CSV.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

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
              location: 'Hiá»‡n trÆ°á»ng má»›i',
              progressPercent: 0,
              status: 'active',
              activeTeams: 1,
              totalTasks: 0,
              completedTasks: 0,
              issueTasksCount: 0,
              managerName: 'Ká»¹ sÆ° Nam',
              startDate: todayStamp(),
              endDate: '2025-12-31',
            });
            createdProjectsCount++;
          }

          const targetProjectCode = existingProj ? existingProj.code : codeUpper;

          let startRow = 9;
          for (let rIdx = 0; rIdx < Math.min(rows.length, 15); rIdx++) {
            const r = rows[rIdx];
            if (r && (r.includes('STT') || r.includes('Ná»˜I DUNG CÃ”NG VIá»†C') || r.includes('KHá»I LÆ¯á»¢NG'))) {
              startRow = rIdx + 1;
              break;
            }
          }

          let currentSection = 'Má»¥c chung';

          for (let i = startRow; i < rows.length; i++) {
            const r = rows[i];
            if (!r || (!r[1] && !r[0])) continue;

            const itemName = r[1] || r[0];
            if (!itemName || String(itemName).trim().length === 0) continue;

            const sttVal = r[0] ? String(r[0]).trim() : '';
            const volVal = typeof r[2] === 'number' ? r[2] : (parseFloat(r[2]) || 0);
            const unitVal = r[3] ? String(r[3]).trim() : '';

            const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|Má»¤C\s+[A-Z0-9]+|[A-Z]{1,2})$/i;
            const isSection = romanRegex.test(sttVal) || (volVal === 0 && (!unitVal || unitVal === ''));

            if (isSection) {
              currentSection = `${sttVal ? sttVal + '. ' : ''}${itemName}`;
            }

            importedTasks.push({
              stt: sttVal || `${i - startRow + 1}`,
              code: `TSK-IMP-${Date.now()}-${i}`,
              name: String(itemName).trim(),
              projectCode: targetProjectCode,
              projectName: sheetName,
              volume: volVal,
              unit: unitVal,
              progress: typeof r[4] === 'number' ? r[4] : (parseFloat(r[4]) || 0),
              status: (r[4] >= 1 ? 'Done' : r[4] > 0 ? 'In Progress' : 'Not Started'),
              purchaseStatus: r[5] ? String(r[5]) : 'ChÆ°a Ä‘áº·t hÃ ng',
              constrStatus: r[6] ? String(r[6]) : 'ChÆ°a thi cÃ´ng',
              issue: r[7] ? String(r[7]) : '',
              issueStatus: r[8] ? String(r[8]) : '',
              isDone: r[9] === true || r[4] === 1,
              isSectionHeader: isSection,
              sectionName: currentSection,
              notes: r[10] ? String(r[10]) : '',
              assignedEngineerId: 'eng-1',
              assignedEngineerName: 'Ká»¹ sÆ° Nam',
            });
          }
        });

        if (importedTasks.length > 0) {
          addTasksBatch(importedTasks);
          alert(`Đã nạp thành công ${importedTasks.length} hạng mục ${currentImportFormat.toUpperCase()}!`);
        }
      } catch (err) {
        console.error('Lỗi đọc file:', err);
        alert('Không đọc được file. Vui lòng kiểm tra lại định dạng và cấu trúc dữ liệu.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTaskExportData = () => displayTasks.map((t) => ({
    'STT': t.stt,
    'Má»¤C LA MÃƒ': t.isSectionHeader ? '[TIÃŠU Äá»€ Má»¤C]' : t.sectionName || '',
    'Ná»˜I DUNG CÃ”NG VIá»†C': t.name,
    'Dá»° ÃN': t.projectName,
    'KHá»I LÆ¯á»¢NG': t.isSectionHeader ? '' : t.volume,
    'ÄVT': t.unit || '',
    'TIáº¾N Äá»˜': t.isSectionHeader ? '' : `${Math.round(t.progress * 100)}%`,
    'TÃŒNH TRáº NG MUA HÃ€NG': t.purchaseStatus || '',
    'TÃŒNH TRáº NG THI CÃ”NG': t.constrStatus || '',
    'VÆ¯á»šNG Máº®C/ Tá»’N Äá»ŒNG': t.issue || '',
    'TT Xá»¬ LÃ': t.issueStatus || '',
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
        const line = `${index + 1}. ${row['STT']} | ${row['Ná»˜I DUNG CÃ”NG VIá»†C']} | ${row['Dá»° ÃN']} | ${row['TIáº¾N Äá»˜']} | ${row['HOÀN THÀNH']}`;
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
      : uniqueSectionsForProj[0] || 'I. THIẾT BỊ CHO CHỮA CHÁY';

    addTask({
      stt: stt || (isSectionHeader ? 'I' : '1'),
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

  const totalPureItems = displayTasks.filter((t) => !t.isSectionHeader).length;
  const completedPureItems = displayTasks.filter((t) => !t.isSectionHeader && (t.isDone || t.progress >= 1)).length;

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
            <p className="text-[11px] text-slate-500 mt-0.5">Theo dõi tiến độ, mua hàng, thi công và vướng mắc theo từng hạng mục.</p>
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
            onClick={() => setIsNewTaskModalOpen(true)}
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
              {displayTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 whitespace-nowrap">
                    Không có hạng mục nào phù hợp với bộ lọc đã chọn
                  </td>
                </tr>
              ) : (
                displayTasks.map((t, idx) => {
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
                      
                      {/* INTERACTIVE PROGRESS PERCENTAGE INPUT CELL */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={pct}
                            onChange={(e) => {
                              let val = parseInt(e.target.value, 10);
                              if (isNaN(val)) val = 0;
                              if (val < 0) val = 0;
                              if (val > 100) val = 100;
                              const dec = val / 100;
                              updateTaskProgress(t.id, dec, val === 100);
                            }}
                            className={`w-11 px-1 py-0.5 text-center font-mono font-bold text-xs rounded border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-primary focus:outline-none transition-all ${
                              isFinished
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : pct > 0
                                ? 'border-blue-300 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          />
                          <span className="font-bold text-xs text-slate-400">%</span>
                        </div>
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
            </>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
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
                    <option value="Đã lắp TB + kéo dây">Đã lắp TB + kéo dây</option>
                    <option value="Chưa thi công">Chưa thi công</option>
                  </select>
                </div>
              </div>

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
          </>

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
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
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
    </div>
  );
};
