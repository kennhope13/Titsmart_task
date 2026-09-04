import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useParams, useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission } from '../services/authStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { DocumentTrack } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '@/components/common/CustomSelect';
import { FileUpload } from '../components/common/FileUpload';

export const DocumentTrackingPage: React.FC = () => {
  const { documentTracks, projects, updateProject, addDocumentTrack, updateDocumentTrack, deleteDocumentTrack, logActivity } = useRealtimeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileViewerUrls, setFileViewerUrls] = useState<string[] | null>(null);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
    confirmText: 'Xác nhận'
  });

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
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

        // Ensure this is a Document Tracking workbook
        const hasDocSheets = wb.SheetNames.some(name => 
          name.toUpperCase().includes('HỒ SƠ') || name.toUpperCase().includes('HOSO')
        );
        const forbiddenKeywords = ['TỒN KHO', 'NHẬP KHO', 'XUẤT KHO', 'TONKHO', 'NHAPKHO', 'XUATKHO', 'NHÂN SỰ', 'NHANSU', 'CHI PHÍ', 'CÔNG NHẬT'];
        const hasForbiddenSheets = wb.SheetNames.some(name => 
          forbiddenKeywords.some(keyword => name.toUpperCase().includes(keyword))
        );
        if (!hasDocSheets || hasForbiddenSheets) {
          triggerToast('File này không phải là file Theo dõi Hồ sơ phù hợp!', 'warning');
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

        const sheetName = wb.SheetNames.find(s => s.includes('HỒ SƠ') || s.includes('HoSo')) || wb.SheetNames[0];
        if (!sheetName) {
          triggerToast('Không tìm thấy sheet hồ sơ nào!', 'warning');
          return;
        }

        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (!rows || rows.length === 0) {
          triggerToast('Sheet không có dữ liệu!', 'warning');
          return;
        }

        let startRowIndex = -1;
        let headerRow: any[] = [];
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const r = rows[i];
          if (r && (r.includes('STT') || r.includes('Số hợp đồng') || r.includes('SỐ HỢP ĐỒNG') || r.includes('stt') || r.some((cell: any) => String(cell).toLowerCase() === 'stt'))) {
            startRowIndex = i + 1;
            headerRow = r;
            break;
          }
        }

        if (startRowIndex === -1) {
          triggerToast('Không tìm thấy dòng tiêu đề (STT) trong file Excel!', 'warning');
          return;
        }

        const headerString = headerRow.map(c => String(c || '').toLowerCase()).join('|');
        const isDocTracking = headerString.includes('hợp đồng') || headerString.includes('người nhận') || headerString.includes('ngày gửi') || headerString.includes('tạm ứng') || headerString.includes('hồ sơ');
        if (!isDocTracking) {
          triggerToast('File không đúng cấu trúc của Theo dõi Hồ sơ (thiếu cột Số hợp đồng/Người nhận/Tạm ứng)!', 'warning');
          return;
        }

        const dataRows = rows.slice(startRowIndex);
        let importCount = 0;

        dataRows.forEach((row) => {
          const contractName = row[2];
          if (!contractName) return;

          let projectCode = String(row[3] || 'KHÁC');
          const upperProj = projectCode.toUpperCase();
          if (upperProj.includes('NĂM CĂN')) projectCode = 'NĂM CĂN';
          else if (upperProj.includes('PHƯỚC LÝ')) projectCode = 'PHƯỚC LÝ';
          else if (upperProj.includes('PHƯỚC TÂN')) projectCode = 'PHƯỚC TÂN';
          else if (upperProj.includes('ĐẮK') || upperProj.includes('DAK')) projectCode = 'DAKRLAP';

          addDocumentTrack({
            stt: String(row[0] || ''),
            contractNo: String(row[1] || ''),
            contractName: String(contractName),
            company: String(row[4] || ''),
            receiverName: String(row[5] || ''),
            phone: String(row[6] || ''),
            address: String(row[7] || ''),
            sendDate: parseExcelDate(row[8]),
            receiveDate: parseExcelDate(row[9]),
            docStatus: String(row[10] || 'Chưa nhận'),
            side: String(row[11] || ''),
            contractValue: numVal(row[12]),
            prepayPercent: numVal(row[13]),
            prepayAmount: numVal(row[14]),
            paymentStatus: String(row[15] || 'Chưa thanh toán'),
            isCompleted: row[16] === true || String(row[16]).toLowerCase() === 'true' || String(row[16]).includes('1'),
            notes: String(row[17] || '')
          });
          importCount++;
        });
        logActivity(`Đã nhập ${importCount} hồ sơ gửi đi từ file Excel`, 'COMPANY');
        triggerToast(`Đã nhập thành công ${importCount} hồ sơ gửi đi từ file Excel!`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        triggerToast('Lỗi phân tích Excel: ' + err.message, 'warning');
      }
    };
    reader.readAsBinaryString(file);
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'delivery' | 'finance' | 'completion'>('overview');

  // Modals state
  const outletContext = useOutletContext<any>();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalNode(document.getElementById('project-header-actions')); }, []);
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentTrack | null>(null);

  // Forms state
  const [newDoc, setNewDoc] = useState<Partial<DocumentTrack>>({
    docType: 'Giao',
    stt: '', contractNo: '', contractName: '', projectCode: '', company: '', receiverName: '', phone: '', address: '', sendDate: new Date().toISOString().split('T')[0], receiveDate: '', docStatus: 'Chưa ký', side: 'Bên trả', contractValue: 0, prepayPercent: 0, prepayAmount: 0, paymentStatus: 'Chưa thanh toán', isCompleted: false, notes: ''
  });

  // Helper utilities
  const getSttNumber = (stt?: string) => {
    const parsed = Number(String(stt || '').replace(/\D/g, ''));
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  };

  const { projectId } = useParams();
  const { user } = useAuthStore();

  const resolvedProjectCode = useMemo(() => {
    if (!projectId) return '';
    const proj = projects.find(p => p.id === projectId || p.code === projectId);
    return proj ? proj.code : '';
  }, [projectId, projects]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [diagramUploadUrl, setDiagramUploadUrl] = useState<string[]>([]);

  // Filters state
  const [filterProjectCode, setFilterProjectCode] = useState('all');

  useEffect(() => {
    if (resolvedProjectCode) {
      setFilterProjectCode(resolvedProjectCode);
      setNewDoc(prev => ({ ...prev, projectCode: resolvedProjectCode }));
    }
  }, [resolvedProjectCode]);
  const [filterDocStatus, setFilterDocStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterDocType, setFilterDocType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const docProjectOptions = useMemo(() => {
    const pCodes = new Set<string>();
    documentTracks.forEach(t => {
      const code = t.projectCode || projects.find(p => p.id === (t as any).projectId)?.code;
      if (code) pCodes.add(code);
    });
    return Array.from(pCodes).sort();
  }, [documentTracks, projects]);

  const docStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    documentTracks.forEach(t => { if (t.docStatus) statuses.add(t.docStatus); });
    return Array.from(statuses).sort();
  }, [documentTracks]);

  const paymentStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    documentTracks.forEach(t => { if (t.paymentStatus) statuses.add(t.paymentStatus); });
    return Array.from(statuses).sort();
  }, [documentTracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    let result = [...documentTracks];
    
    if (filterProjectCode !== 'all') {
      result = result.filter(t => (t.projectCode || projects.find(p => p.id === (t as any).projectId)?.code) === filterProjectCode);
    }
    if (filterDocStatus !== 'all') {
      result = result.filter(t => t.docStatus === filterDocStatus);
    }
    if (filterPaymentStatus !== 'all') {
      result = result.filter(t => t.paymentStatus === filterPaymentStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.contractNo || '').toLowerCase().includes(q) ||
        (t.contractName || '').toLowerCase().includes(q) ||
        (t.company || '').toLowerCase().includes(q) ||
        (t.receiverName || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const sttDiff = getSttNumber(a.stt) - getSttNumber(b.stt);
      if (sttDiff !== 0) return sttDiff;
      return String(a.contractNo || '').localeCompare(String(b.contractNo || ''), 'vi');
    });
  }, [documentTracks, filterProjectCode, filterDocStatus, filterPaymentStatus, searchQuery, projects]);

  // Computed summary metrics
  const summary = useMemo(() => {
    const totalCount = filteredTracks.length;
    const completedDocs = filteredTracks.filter(t => t.docStatus === 'Đã ký' || t.docStatus === 'Đã nhận đủ').length;
    const paidCount = filteredTracks.filter(t => t.paymentStatus?.includes('Đã')).length;
    const totalContractVal = filteredTracks.reduce((sum, t) => sum + (t.contractValue || 0), 0);
    const totalPrepayVal = filteredTracks.reduce((sum, t) => sum + (t.prepayAmount || 0), 0);

    return {
      totalCount,
      completedDocs,
      paidCount,
      totalContractVal,
      totalPrepayVal
    };
  }, [filteredTracks]);

  const handleExportExcel = () => {
    const data = filteredTracks.map(t => ({
      'STT': t.stt,
      'Số hợp đồng': t.contractNo,
      'Tên hợp đồng': t.contractName,
      'Công ty': t.company,
      'Người nhận': t.receiverName,
      'Số điện thoại': t.phone,
      'Địa chỉ': t.address,
      'Ngày gửi': t.sendDate,
      'Ngày nhận': t.receiveDate || '',
      'Trạng thái hồ sơ': t.docStatus,
      'Bên': t.side || '',
      'Giá trị HĐ (đ)': t.contractValue,
      'Tạm ứng (%)': t.prepayPercent * 100,
      'Số tiền tạm ứng (đ)': t.prepayAmount,
      'Trạng thái thanh toán': t.paymentStatus,
      'Hoàn tất': t.isCompleted ? 'Hoàn tất' : 'Chưa hoàn tất',
      'Ghi chú': t.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TheoDoiHoSo');
    XLSX.writeFile(wb, `Theo_Doi_Ho_So_Gui_Di_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <>
      <style>{`.doc-tracking-page .page-header-title { font-family: 'Inter', sans-serif !important; font-weight: 900 !important; }`}</style>
      <div className="doc-tracking-page flex flex-col flex-1 h-full bg-slate-50 relative overflow-hidden">
      
      {/* HEADER SECTION */}
            {!projectId && (
        <section className="border-b border-slate-200 bg-white shadow-sm px-6 pr-14 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="page-header-title text-lg text-slate-900 border-l-4 border-primary pl-2 uppercase">Theo dõi Hồ sơ gửi đi</h1>
          </div>

          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_upload</span>
              Nhập Excel
            </button>
            <button 
              onClick={handleExportExcel} 
              className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              Xuất Excel
            </button>
            <button 
              onClick={() => setIsNewDocOpen(true)} 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm hồ sơ mới
            </button>
          </div>
        </section>
      )}

      {projectId && portalNode && createPortal(
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-1.5 border border-slate-200 bg-white h-[34px] px-3 rounded-lg text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">file_upload</span>
            Nhập Excel
          </button>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-1.5 border border-slate-200 bg-white h-[34px] px-3 rounded-lg text-[12px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">file_download</span>
            Xuất Excel
          </button>
          <button 
            onClick={() => setIsNewDocOpen(true)} 
            className="flex items-center gap-1.5 bg-primary text-white h-[34px] px-3 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Thêm hồ sơ mới
          </button>
          
        </div>
      , portalNode)}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden p-0 space-y-0">
      {/* TABS & TABLE */}
      <section className="bg-white flex flex-col flex-1 min-w-0 min-h-0 border-y border-slate-200 rounded-none shadow-none overflow-hidden">

          <div className="flex border-b border-slate-200 bg-white px-4 py-2 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 font-bold text-slate-500 whitespace-nowrap">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
              </div>
              
              {!projectId && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Dự án:</span>
                  <CustomSelect
                    value={filterProjectCode}
                    onChange={e => setFilterProjectCode(e.target.value)}
                    className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                  >
                    <option value="all">Tất cả</option>
                    {docProjectOptions.map(opt => (
                      <option key={opt} value={opt}>{projects.find(p => p.code === opt)?.name || opt}</option>
                    ))}
                  </CustomSelect>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Trạng thái hồ sơ:</span>
                <CustomSelect
                  value={filterDocStatus}
                  onChange={e => setFilterDocStatus(e.target.value)}
                  className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                >
                  <option value="all">Tất cả</option>
                  {docStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </CustomSelect>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium whitespace-nowrap">Thanh toán:</span>
                <CustomSelect
                  value={filterPaymentStatus}
                  onChange={e => setFilterPaymentStatus(e.target.value)}
                  className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                >
                  <option value="all">Tất cả</option>
                  {paymentStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </CustomSelect>
              </div>
            </div>

            <div className="flex items-center">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Tìm số HĐ, công ty..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-1 border border-slate-200 rounded-md text-xs w-[200px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="doc-fit-table w-full text-left border-collapse ">
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 leading-tight">
                 <tr>
                   <th className="p-1 text-center whitespace-nowrap">STT</th>
                   <th className="p-1 text-center whitespace-nowrap">Bên</th>
                   {!projectId && <th className="p-1 whitespace-nowrap">Dự án</th>}
                   <th className="p-1 min-w-[90px]">Số hợp đồng</th>
                   <th className="p-1 min-w-[150px]">Tên hợp đồng</th>
                   <th className="p-1 min-w-[120px]">Công ty / Đối tác</th>
                   <th className="p-1 min-w-[80px]">Người nhận</th>
                   <th className="p-1 text-center whitespace-nowrap">Ngày gửi</th>
                   <th className="p-1 text-center whitespace-nowrap">Ngày nhận</th>
                   <th className="p-1 text-right min-w-[90px]">Giá trị HĐ (đ)</th>
                   <th className="p-1 text-center min-w-[70px]">Tạm ứng</th>
                   <th className="p-1 text-center min-w-[80px]">Thanh toán</th>
                   <th className="p-1 text-center whitespace-nowrap">File</th>
                   <th className="p-1 text-center whitespace-nowrap">Hồ sơ</th>
                   <th className="p-1 text-center whitespace-nowrap">Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 leading-tight">
                {filteredTracks.map((track, index) => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-1 py-1 text-center font-bold text-slate-400 w-6">{index + 1}</td>
                    <td className="px-1 py-1 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        track.side === 'Bên nhận' ? 'bg-emerald-50 text-emerald-600' :
                        track.side === 'Bên gửi' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {track.side || 'Bên trả'}
                      </span>
                    </td>
                    {!projectId && <td className="px-1 py-1 text-[13px] font-bold text-slate-600">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>}
                    <td className="px-1 py-1 font-mono text-[11px] break-words break-all">{track.contractNo || '-'}</td>
                    <td className="px-1 py-1"><div className="font-extrabold text-slate-900 leading-snug max-w-[160px] whitespace-normal line-clamp-2" title={track.contractName}>{track.contractName}</div></td>
                    <td className="px-1 py-1"><div className="font-bold text-slate-800 max-w-[130px] whitespace-normal line-clamp-2" title={track.company}>{track.company || '-'}</div></td>
                    <td className="px-1 py-1">
                      <div className="font-semibold text-slate-700">{track.receiverName || '-'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{track.phone || ''}</div>
                    </td>
                    <td className="px-1 py-1 text-center whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${track.sendDate ? 'bg-slate-100 text-slate-700' : 'text-slate-300'}`}>{track.sendDate ? new Date(track.sendDate).toLocaleDateString('vi-VN') : '-'}</span></td>
                    <td className="px-1 py-1 text-center whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${track.receiveDate ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-300'}`}>{track.receiveDate ? new Date(track.receiveDate).toLocaleDateString('vi-VN') : '-'}</span></td>
                    <td className="px-1 py-1 text-right font-bold text-slate-950">{(track.contractValue || 0).toLocaleString('vi-VN')}</td>
                    <td className="px-1 py-1 text-center">
                      <div className="font-bold text-blue-700">{(track.prepayPercent ? (track.prepayPercent * 100).toFixed(1) : '0')}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{(track.prepayAmount || 0).toLocaleString('vi-VN')}đ</div>
                    </td>
                    <td className="px-1 py-1 text-center"><span className={`text-[10px] font-bold ${track.paymentStatus?.includes('Đã') ? 'text-emerald-700' : 'text-rose-700'}`}>{track.paymentStatus || 'Chưa thanh toán'}</span></td>
                    <td className="px-1 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                      {track.fileUrls && track.fileUrls.length > 0 ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFileViewerUrls(track.fileUrls || []); }} title="Xem file đính kèm" className="relative inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">description</span>
                          {track.fileUrls.length > 1 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold px-1 rounded-full">{track.fileUrls.length}</span>}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-1 py-1 text-center"><span className={`text-[10px] font-bold ${track.docStatus?.includes('ký') || track.docStatus?.includes('đủ') ? 'text-emerald-700' : 'text-amber-700'}`}>{track.docStatus || 'Chưa rõ'}</span></td>
                    
                    <td className="px-1 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => updateDocumentTrack(track.id, { isCompleted: !track.isCompleted })} title="Đánh dấu hoàn tất" className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${track.isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-500'}`}><span className="material-symbols-outlined text-base">task_alt</span></button>
                        <button onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Xóa thông tin theo dõi hồ sơ',
                            message: `Bạn chắc chắn muốn xóa hồ sơ hợp đồng "${track.contractNo || track.contractName || 'này'}"?`,
                            onConfirm: () => {
deleteDocumentTrack(track.id);
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            },
                            isDestructive: true,
                            confirmText: 'Xóa'
                          });
                        }} title="Xóa hồ sơ" className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

        </div>

      </section>
      </div>

      {/* MODALS */}
      {/* Add New Doc Modal */}
      <Modal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} title="Thêm thông tin Hồ Sơ Gửi Đi mới">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (isSubmitting) return;
          setIsSubmitting(true);
          try {
            const val = Number(newDoc.contractValue || 0);
            const prepayPct = Number(newDoc.prepayPercent || 0);
            const prepayAmt = val * prepayPct;

            await addDocumentTrack({
              stt: newDoc.stt || String(documentTracks.length + 1),
              contractNo: newDoc.contractNo || '',
              contractName: newDoc.contractName || '',
              projectCode: newDoc.projectCode || '',
              company: newDoc.company || '',
              receiverName: newDoc.receiverName || '',
              phone: newDoc.phone || '',
              address: newDoc.address || '',
              sendDate: newDoc.sendDate || new Date().toISOString().split('T')[0],
              receiveDate: newDoc.receiveDate || '',
              docStatus: newDoc.docStatus || 'Chưa ký',
              side: newDoc.side || 'Bên trả',
              contractValue: val,
              prepayPercent: prepayPct,
              prepayAmount: prepayAmt,
              paymentStatus: newDoc.paymentStatus || 'Chưa thanh toán',
              isCompleted: !!newDoc.isCompleted,
              notes: newDoc.notes || '',
              fileUrls: newDoc.fileUrls || [],
              docType: newDoc.docType || 'Giao'
            });
            triggerToast(`Đã thêm hồ sơ \"${newDoc.contractNo || newDoc.contractName || 'hồ sơ mới'}\" thành công!`, 'success');
            setIsNewDocOpen(false);
            setNewDoc({stt: '', contractNo: '', contractName: '', projectCode: '', company: '', receiverName: '', phone: '', address: '', sendDate: new Date().toISOString().split('T')[0], receiveDate: '', docStatus: 'Chưa ký', side: 'Bên trả', contractValue: 0, prepayPercent: 0, prepayAmount: 0, paymentStatus: 'Chưa thanh toán', isCompleted: false, notes: '', fileUrls: [], docType: 'Giao'});
          } catch (err: any) {
            triggerToast('Lỗi khi thêm hồ sơ: ' + (err.message || 'Xin thử lại'), 'warning');
          } finally {
            setIsSubmitting(false);
          }
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gapx-1 py-1">
            <div className="min-w-0">
              <label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
              <CustomSelect required value={newDoc.docType || 'Giao'} onChange={(e) => setNewDoc({...newDoc, docType: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
              </CustomSelect>
              <label className="block font-bold mb-1 truncate">Dự án *</label>
              <CustomSelect required value={newDoc.projectCode} onChange={(e) => setNewDoc({...newDoc, projectCode: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold truncate">
                <option value="">-- Chọn dự án --</option>
                {projects.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </CustomSelect>
            </div>
            <div><label className="block font-bold mb-1">Tên Hợp đồng / Hồ sơ *</label><input type="text" required value={newDoc.contractName} onChange={(e) => setNewDoc({...newDoc, contractName: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gapx-1 py-1">
            <div><label className="block font-bold mb-1">Mã/Số Hợp đồng</label><input type="text" value={newDoc.contractNo} onChange={(e) => setNewDoc({...newDoc, contractNo: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Công ty / Đối tác nhận *</label><input type="text" required value={newDoc.company} onChange={(e) => setNewDoc({...newDoc, company: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gapx-1 py-1">
            <div><label className="block font-bold mb-1">Người nhận trực tiếp</label><input type="text" value={newDoc.receiverName} onChange={(e) => setNewDoc({...newDoc, receiverName: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">SĐT người nhận</label><input type="text" value={newDoc.phone} onChange={(e) => setNewDoc({...newDoc, phone: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1">Bên</label>
              <CustomSelect value={newDoc.side || ''} onChange={(e) => setNewDoc({...newDoc, side: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="">-- Chọn bên --</option>
                <option value="Bên nhận">Bên nhận</option>
                <option value="Bên gửi">Bên gửi</option>
                <option value="Bên trả">Bên trả</option>
              </CustomSelect>
            </div>
          </div>
          <div><label className="block font-bold mb-1">Địa chỉ nhận hồ sơ</label><input type="text" value={newDoc.address} onChange={(e) => setNewDoc({...newDoc, address: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="grid grid-cols-2 gapx-1 py-1">
            <div><label className="block font-bold mb-1">Ngày gửi đi</label><input type="date" value={newDoc.sendDate} onChange={(e) => setNewDoc({...newDoc, sendDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Ngày nhận</label><input type="date" value={newDoc.receiveDate} onChange={(e) => setNewDoc({...newDoc, receiveDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gapx-1 py-1 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Giá trị HĐ (đ)</label><input type="number" step="any" value={newDoc.contractValue} onChange={(e) => setNewDoc({...newDoc, contractValue: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white font-bold" /></div>
            <div><label className="block font-bold mb-1">Tạm ứng (%)</label><input type="number" step="0.1" min="0" max="100" value={(newDoc.prepayPercent || 0) * 100} onChange={(e) => setNewDoc({...newDoc, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1">Thanh toán</label>
              <CustomSelect value={newDoc.paymentStatus} onChange={(e) => setNewDoc({...newDoc, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
              </CustomSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gapx-1 py-1">
            <div>
              <label className="block font-bold mb-1">Trạng thái hồ sơ</label>
              <CustomSelect value={newDoc.docStatus} onChange={(e) => setNewDoc({...newDoc, docStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa nhận">Chưa nhận</option>
                <option value="Đã nhận đủ">Đã nhận đủ</option>
                <option value="Đã ký">Đã ký</option>
                <option value="Đã đổi gửi lại">Đã đổi gửi lại</option>
              </CustomSelect>
            </div>
            <div className="flex items-center pt-5 gap-2"><input type="checkbox" checked={newDoc.isCompleted} onChange={(e) => setNewDoc({...newDoc, isCompleted: e.target.checked})} className="w-4 h-4" /> <span className="font-bold">Đã hoàn tất hồ sơ</span></div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newDoc.notes} onChange={(e) => setNewDoc({...newDoc, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <FileUpload multiple label="File đính kèm" value={newDoc.fileUrls} onChange={(urls) => setNewDoc({...newDoc, fileUrls: Array.isArray(urls) ? urls : [urls]})} />
          <div className="pt-3 border-t flex justify-end gap-2">
            <button disabled={isSubmitting} type="button" onClick={() => setIsNewDocOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-50">Hủy</button>
            <button disabled={isSubmitting} type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Đang thêm...' : 'Thêm hồ sơ mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Doc Modal */}
      <Modal isOpen={!!editingDoc} onClose={() => setEditingDoc(null)} title="Cập nhật Theo dõi Hồ sơ Gửi Đi">
        {editingDoc && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              const val = Number(editingDoc.contractValue || 0);
              const prepayPct = Number(editingDoc.prepayPercent || 0);
              const prepayAmt = val * prepayPct;

              await updateDocumentTrack(editingDoc.id, {
                ...editingDoc,
                prepayAmount: prepayAmt
              });
              triggerToast(`Đã cập nhật hồ sơ \"${editingDoc.contractNo || editingDoc.contractName || 'hồ sơ'}\" thành công!`, 'success');
              setEditingDoc(null);
            } catch (err: any) {
              triggerToast('Lỗi khi cập nhật hồ sơ: ' + (err.message || 'Xin thử lại'), 'warning');
            } finally {
              setIsSubmitting(false);
            }
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gapx-1 py-1">
              <div className="min-w-0">
                <label className="block font-bold mb-1 truncate">Dự án *</label>
                <CustomSelect required value={editingDoc.projectCode || projects.find(p => p.id === (editingDoc as any).projectId)?.code || ''} onChange={(e) => setEditingDoc({...editingDoc, projectCode: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold truncate">
                  <option value="">-- Chọn dự án --</option>
                  {projects.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </CustomSelect>
              </div>
              <div><label className="block font-bold mb-1">Tên Hợp đồng / Hồ sơ *</label><input type="text" required value={editingDoc.contractName} onChange={(e) => setEditingDoc({...editingDoc, contractName: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gapx-1 py-1">
              <div><label className="block font-bold mb-1">Số HĐ</label><input type="text" value={editingDoc.contractNo} onChange={(e) => setEditingDoc({...editingDoc, contractNo: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Công ty nhận *</label><input type="text" required value={editingDoc.company} onChange={(e) => setEditingDoc({...editingDoc, company: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gapx-1 py-1">
              <div><label className="block font-bold mb-1">Người nhận</label><input type="text" value={editingDoc.receiverName} onChange={(e) => setEditingDoc({...editingDoc, receiverName: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">SĐT nhận</label><input type="text" value={editingDoc.phone} onChange={(e) => setEditingDoc({...editingDoc, phone: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div>
                <label className="block font-bold mb-1">Bên</label>
                <CustomSelect value={editingDoc.side || ''} onChange={(e) => setEditingDoc({...editingDoc, side: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="">-- Chọn bên --</option>
                  <option value="Bên nhận">Bên nhận</option>
                  <option value="Bên gửi">Bên gửi</option>
                  <option value="Bên trả">Bên trả</option>
                </CustomSelect>
              </div>
            </div>
            <div><label className="block font-bold mb-1">Địa chỉ</label><input type="text" value={editingDoc.address} onChange={(e) => setEditingDoc({...editingDoc, address: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="grid grid-cols-2 gapx-1 py-1">
              <div><label className="block font-bold mb-1">Ngày gửi</label><input type="date" value={editingDoc.sendDate} onChange={(e) => setEditingDoc({...editingDoc, sendDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Ngày nhận</label><input type="date" value={editingDoc.receiveDate || ''} onChange={(e) => setEditingDoc({...editingDoc, receiveDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gapx-1 py-1 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Giá trị HĐ (đ)</label><input type="number" step="any" value={editingDoc.contractValue} onChange={(e) => setEditingDoc({...editingDoc, contractValue: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white font-bold" /></div>
              <div><label className="block font-bold mb-1">Tạm ứng (%)</label><input type="number" step="0.1" min="0" max="100" value={(editingDoc.prepayPercent || 0) * 100} onChange={(e) => setEditingDoc({...editingDoc, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div>
                <label className="block font-bold mb-1">Thanh toán</label>
                <CustomSelect value={editingDoc.paymentStatus} onChange={(e) => setEditingDoc({...editingDoc, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                  <option value="Chưa thanh toán">Chưa thanh toán</option>
                  <option value="Đã thanh toán">Đã thanh toán</option>
                </CustomSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gapx-1 py-1">
              <div>
                <label className="block font-bold mb-1">Trạng thái hồ sơ</label>
                <CustomSelect value={editingDoc.docStatus} onChange={(e) => setEditingDoc({...editingDoc, docStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa nhận">Chưa nhận</option>
                  <option value="Đã nhận đủ">Đã nhận đủ</option>
                  <option value="Đã ký">Đã ký</option>
                  <option value="Đã đổi gửi lại">Đã đổi gửi lại</option>
                </CustomSelect>
              </div>
              <div className="flex items-center pt-5 gap-2"><input type="checkbox" checked={editingDoc.isCompleted} onChange={(e) => setEditingDoc({...editingDoc, isCompleted: e.target.checked})} className="w-4 h-4" /> <span className="font-bold">Đã hoàn tất hồ sơ</span></div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingDoc.notes} onChange={(e) => setEditingDoc({...editingDoc, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <FileUpload multiple label="File đính kèm" value={editingDoc.fileUrls} onChange={(urls) => setEditingDoc({...editingDoc, fileUrls: Array.isArray(urls) ? urls : [urls]})} />
            <div className="pt-3 border-t flex justify-end gap-2">
              <button disabled={isSubmitting} type="button" onClick={() => setEditingDoc(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100 disabled:opacity-50">Hủy</button>
              <button disabled={isSubmitting} type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
                {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        confirmText={confirmConfig.confirmText}
      />
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />

      {fileViewerUrls && (
        <Modal isOpen={true} onClose={() => setFileViewerUrls(null)} title="Tài liệu đính kèm" size="xl">
          <div className="flex flex-col space-y-4">
            {fileViewerUrls.map((url, index) => {
              const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i);
              return (
                <div key={index} className="flex flex-col border rounded p-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold truncate w-3/4">Tài liệu {index + 1}</span>
                    <a href={`${url}?download=`} download target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-primary text-white h-[34px] px-3 rounded-lg text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                      <span className="material-symbols-outlined text-[14px]">download</span> Tải về
                    </a>
                  </div>
                  {isImage ? (
                    <img src={url} alt={`File ${index + 1}`} className="w-full object-contain max-h-[60vh] bg-slate-100" />
                  ) : (
                    <iframe src={url} className="w-full h-[60vh] bg-slate-100" title={`File ${index + 1}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
      
    </>
  );
};
