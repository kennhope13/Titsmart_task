import React, { useMemo, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { DocumentTrack } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '@/components/common/CustomSelect';

export const DocumentTrackingPage: React.FC = () => {
  const {
    documentTracks,
    projects,
    addDocumentTrack,
    updateDocumentTrack,
    deleteDocumentTrack,
    logActivity
  } = useRealtimeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
    confirmText: 'Xác nhận'
  });

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
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentTrack | null>(null);

  // Forms state
  const [newDoc, setNewDoc] = useState<Partial<DocumentTrack>>({
    stt: '', contractNo: '', contractName: '', projectCode: '', company: '', receiverName: '', phone: '', address: '', sendDate: new Date().toISOString().split('T')[0], receiveDate: '', docStatus: 'Chưa ký', side: 'Bên trả', contractValue: 0, prepayPercent: 0, prepayAmount: 0, paymentStatus: 'Chưa thanh toán', isCompleted: false, notes: ''
  });

  // Helper utilities
  const getSttNumber = (stt?: string) => {
    const parsed = Number(String(stt || '').replace(/\D/g, ''));
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  };

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return [...documentTracks].sort((a, b) => {
      const sttDiff = getSttNumber(a.stt) - getSttNumber(b.stt);
      if (sttDiff !== 0) return sttDiff;
      return String(a.contractNo || '').localeCompare(String(b.contractNo || ''), 'vi');
    });
  }, [documentTracks]);

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
      <section className="border-b border-slate-200 bg-white shadow-sm px-6 pr-[140px] py-4 md:py-0 md:h-[72px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="page-header-title text-2xl text-slate-900 border-l-4 border-primary pl-4 uppercase">Theo dõi Hồ sơ gửi đi</h1>
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
            className="flex items-center gap-1 border border-slate-200 bg-white px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">file_upload</span>
            Nhập Excel
          </button>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-1 border border-slate-200 bg-white px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            Xuất Excel
          </button>
          <button 
            onClick={() => setIsNewDocOpen(true)} 
            className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Thêm hồ sơ mới
          </button>
        </div>
      </section>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden p-0 space-y-0">
      {/* TABS & TABLE */}
      <section className="bg-white flex flex-col flex-1 min-w-0 min-h-0 border-y border-slate-200 rounded-none shadow-none overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-1">
            <div className="flex items-center gap-4">
              {[
              { id: 'overview', label: 'Tổng quan', icon: 'dashboard', count: filteredTracks.length },
              { id: 'delivery', label: 'Giao nhận', icon: 'local_shipping', count: filteredTracks.filter(t => !t.receiveDate).length },
              { id: 'finance', label: 'Tạm ứng - thanh toán', icon: 'payments', count: filteredTracks.filter(t => !t.paymentStatus?.includes('Đã')).length },
              { id: 'completion', label: 'Hoàn tất - ghi chú', icon: 'task_alt', count: filteredTracks.filter(t => t.isCompleted).length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-base leading-none">{tab.icon}</span>
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="text-[11px] font-bold text-slate-500 flex flex-wrap gap-2 py-2">
              <span>{filteredTracks.length} hồ sơ</span>
              <span>{summary.paidCount} đã thanh toán</span>
              <span>{summary.totalPrepayVal.toLocaleString('vi-VN')} đ tạm ứng</span>
            </div>
          </div>

        <div className="overflow-auto custom-scrollbar flex-1">
          {activeTab === 'overview' && (
            <table className="doc-fit-table w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                 <tr>
                   <th className="px-2 py-2 text-center">STT</th>
                   <th className="px-2 py-2">Số hợp đồng</th>
                   <th className="px-2 py-2">Dự án</th>
                   <th className="px-2 py-2">Tên hợp đồng</th>
                   <th className="px-2 py-2">Công ty</th>
                   <th className="px-2 py-2 text-center">Hồ sơ</th>
                   <th className="px-2 py-2 text-center">Thanh toán</th>
                   <th className="px-2 py-2 text-center">Hoàn tất</th>
                   <th className="px-2 py-2 text-center">Xóa</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-2 py-2 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{track.contractNo || '-'}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>
                    <td className="px-2 py-2 font-extrabold text-slate-900 leading-snug">{track.contractName}</td>
                    <td className="px-2 py-2 font-bold text-slate-800">{track.company || '-'}</td>
                    <td className="px-2 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${track.docStatus?.includes('ký') || track.docStatus?.includes('đủ') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{track.docStatus || 'Chưa rõ'}</span></td>
                    <td className="px-2 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${track.paymentStatus?.includes('Đã') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{track.paymentStatus || 'Chưa thanh toán'}</span></td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}><button onClick={() => updateDocumentTrack(track.id, { isCompleted: !track.isCompleted })} className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${track.isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-500'}`}><span className="material-symbols-outlined text-base">task_alt</span></button></td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}><button onClick={() => {
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
                    }} className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"><span className="material-symbols-outlined text-base">delete</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'delivery' && (
            <table className="doc-fit-table w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                 <tr>
                   <th className="px-2 py-2 text-center">STT</th>
                   <th className="px-2 py-2">Số hợp đồng</th>
                   <th className="px-2 py-2">Dự án</th>
                   <th className="px-2 py-2">Công ty</th>
                   <th className="px-2 py-2">Người nhận</th>
                   <th className="px-2 py-2">SĐT</th>
                   <th className="px-2 py-2">Địa chỉ</th>
                   <th className="px-2 py-2 text-center">Ngày gửi</th>
                   <th className="px-2 py-2 text-center">Ngày nhận</th>
                   <th className="px-2 py-2 text-center">Trạng thái</th>
                   <th className="px-2 py-2">Ghi chú</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-2 py-2 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{track.contractNo || '-'}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>
                    <td className="px-2 py-2 font-bold text-slate-800">{track.company || '-'}</td>
                    <td className="px-2 py-2">{track.receiverName || '-'}</td>
                    <td className="px-2 py-2 font-mono">{track.phone || '-'}</td>
                    <td className="px-2 py-2 text-[11px] text-slate-500">{track.address || '-'}</td>
                    <td className="px-2 py-2 text-center">{track.sendDate || '-'}</td>
                    <td className="px-2 py-2 text-center">{track.receiveDate || <span className="text-slate-300">Chưa nhận</span>}</td>
                    <td className="px-2 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${track.docStatus?.includes('ký') || track.docStatus?.includes('đủ') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{track.docStatus || 'Chưa rõ'}</span></td>
                    <td className="px-2 py-2 text-[11px] text-slate-500">{track.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'finance' && (
            <table className="doc-fit-table w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                 <tr>
                   <th className="px-2 py-2 text-center">STT</th>
                   <th className="px-2 py-2">Số hợp đồng</th>
                   <th className="px-2 py-2">Dự án</th>
                   <th className="px-2 py-2">Tên hợp đồng</th>
                   <th className="px-2 py-2">Bên</th>
                   <th className="px-2 py-2 text-right">Giá trị HĐ</th>
                   <th className="px-2 py-2 text-right">% tạm ứng</th>
                   <th className="px-2 py-2 text-right">Số tiền tạm ứng</th>
                   <th className="px-2 py-2 text-center">Thanh toán</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-2 py-2 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{track.contractNo || '-'}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>
                    <td className="px-2 py-2 font-extrabold text-slate-900 leading-snug">{track.contractName}</td>
                    <td className="px-2 py-2">{track.side || '-'}</td>
                    <td className="px-2 py-2 text-right font-bold text-slate-950">{(track.contractValue || 0).toLocaleString('vi-VN')}</td>
                    <td className="px-2 py-2 text-right">{((track.prepayPercent || 0) * 100).toLocaleString('vi-VN')}%</td>
                    <td className="px-2 py-2 text-right font-bold text-rose-600">{(track.prepayAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="px-2 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${track.paymentStatus?.includes('Đã') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{track.paymentStatus || 'Chưa thanh toán'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'completion' && (
            <table className="doc-fit-table w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '23%' }} />
              </colgroup>
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                 <tr>
                   <th className="px-2 py-2 text-center">STT</th>
                   <th className="px-2 py-2">Số hợp đồng</th>
                   <th className="px-2 py-2">Dự án</th>
                   <th className="px-2 py-2">Tên hợp đồng</th>
                   <th className="px-2 py-2 text-center">Hồ sơ</th>
                   <th className="px-2 py-2 text-center">Thanh toán</th>
                   <th className="px-2 py-2 text-center">Hoàn tất</th>
                   <th className="px-2 py-2">Ghi chú</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-2 py-2 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                    <td className="px-2 py-2 font-mono text-[11px]">{track.contractNo || '-'}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>
                    <td className="px-2 py-2 font-extrabold text-slate-900 leading-snug">{track.contractName}</td>
                    <td className="px-2 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${track.docStatus?.includes('ký') || track.docStatus?.includes('đủ') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{track.docStatus || 'Chưa rõ'}</span></td>
                    <td className="px-2 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${track.paymentStatus?.includes('Đã') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{track.paymentStatus || 'Chưa thanh toán'}</span></td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}><button onClick={() => updateDocumentTrack(track.id, { isCompleted: !track.isCompleted })} className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${track.isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-500'}`}><span className="material-symbols-outlined text-base">task_alt</span></button></td>
                    <td className="px-2 py-2 text-[11px] text-slate-500">{track.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {filteredTracks.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">Không có hồ sơ nào phù hợp bộ lọc tìm kiếm.</div>
          )}
        </div>
      </section>
      </div>

      {/* MODALS */}
      {/* Add New Doc Modal */}
      <Modal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} title="Thêm thông tin Hồ Sơ Gửi Đi mới">
        <form onSubmit={async (e) => {
          e.preventDefault();
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
              notes: newDoc.notes || ''
            });
            triggerToast('Thêm hồ sơ mới thành công', 'success');
            setIsNewDocOpen(false);
            setNewDoc({stt: '', contractNo: '', contractName: '', projectCode: '', company: '', receiverName: '', phone: '', address: '', sendDate: new Date().toISOString().split('T')[0], receiveDate: '', docStatus: 'Chưa ký', side: 'Bên trả', contractValue: 0, prepayPercent: 0, prepayAmount: 0, paymentStatus: 'Chưa thanh toán', isCompleted: false, notes: ''});
          } catch (err) {
            console.error(err);
            triggerToast('Lỗi khi thêm hồ sơ mới', 'warning');
          }
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gapx-2 py-2">
            <div className="min-w-0">
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
          <div className="grid grid-cols-2 gapx-2 py-2">
            <div><label className="block font-bold mb-1">Mã/Số Hợp đồng</label><input type="text" value={newDoc.contractNo} onChange={(e) => setNewDoc({...newDoc, contractNo: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Công ty / Đối tác nhận *</label><input type="text" required value={newDoc.company} onChange={(e) => setNewDoc({...newDoc, company: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gapx-2 py-2">
            <div><label className="block font-bold mb-1">Người nhận trực tiếp</label><input type="text" value={newDoc.receiverName} onChange={(e) => setNewDoc({...newDoc, receiverName: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">SĐT người nhận</label><input type="text" value={newDoc.phone} onChange={(e) => setNewDoc({...newDoc, phone: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Bên (Ví dụ: Bên trả)</label><input type="text" value={newDoc.side} onChange={(e) => setNewDoc({...newDoc, side: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div><label className="block font-bold mb-1">Địa chỉ nhận hồ sơ</label><input type="text" value={newDoc.address} onChange={(e) => setNewDoc({...newDoc, address: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="grid grid-cols-2 gapx-2 py-2">
            <div><label className="block font-bold mb-1">Ngày gửi đi *</label><input type="date" required value={newDoc.sendDate} onChange={(e) => setNewDoc({...newDoc, sendDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Ngày đối tác nhận</label><input type="date" value={newDoc.receiveDate} onChange={(e) => setNewDoc({...newDoc, receiveDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gapx-2 py-2 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Giá trị HĐ (đ)</label><input type="number" value={newDoc.contractValue} onChange={(e) => setNewDoc({...newDoc, contractValue: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white font-bold" /></div>
            <div><label className="block font-bold mb-1">Tạm ứng (%)</label><input type="number" step="0.1" min="0" max="100" value={(newDoc.prepayPercent || 0) * 100} onChange={(e) => setNewDoc({...newDoc, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1">Thanh toán</label>
              <CustomSelect value={newDoc.paymentStatus} onChange={(e) => setNewDoc({...newDoc, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
              </CustomSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gapx-2 py-2">
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
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewDocOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Thêm hồ sơ mới</button></div>
        </form>
      </Modal>

      {/* Edit Doc Modal */}
      <Modal isOpen={!!editingDoc} onClose={() => setEditingDoc(null)} title="Cập nhật Theo dõi Hồ sơ Gửi Đi">
        {editingDoc && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const val = Number(editingDoc.contractValue || 0);
            const prepayPct = Number(editingDoc.prepayPercent || 0);
            const prepayAmt = val * prepayPct;

            updateDocumentTrack(editingDoc.id, {
              ...editingDoc,
              prepayAmount: prepayAmt
            });
            setEditingDoc(null);
          }} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gapx-2 py-2">
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
            <div className="grid grid-cols-2 gapx-2 py-2">
              <div><label className="block font-bold mb-1">Số HĐ</label><input type="text" value={editingDoc.contractNo} onChange={(e) => setEditingDoc({...editingDoc, contractNo: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Công ty nhận *</label><input type="text" required value={editingDoc.company} onChange={(e) => setEditingDoc({...editingDoc, company: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gapx-2 py-2">
              <div><label className="block font-bold mb-1">Người nhận</label><input type="text" value={editingDoc.receiverName} onChange={(e) => setEditingDoc({...editingDoc, receiverName: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">SĐT nhận</label><input type="text" value={editingDoc.phone} onChange={(e) => setEditingDoc({...editingDoc, phone: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Bên</label><input type="text" value={editingDoc.side} onChange={(e) => setEditingDoc({...editingDoc, side: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div><label className="block font-bold mb-1">Địa chỉ</label><input type="text" value={editingDoc.address} onChange={(e) => setEditingDoc({...editingDoc, address: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="grid grid-cols-2 gapx-2 py-2">
              <div><label className="block font-bold mb-1">Ngày gửi *</label><input type="date" required value={editingDoc.sendDate} onChange={(e) => setEditingDoc({...editingDoc, sendDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Ngày nhận</label><input type="date" value={editingDoc.receiveDate || ''} onChange={(e) => setEditingDoc({...editingDoc, receiveDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gapx-2 py-2 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Giá trị HĐ (đ)</label><input type="number" value={editingDoc.contractValue} onChange={(e) => setEditingDoc({...editingDoc, contractValue: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white font-bold" /></div>
              <div><label className="block font-bold mb-1">Tạm ứng (%)</label><input type="number" step="0.1" min="0" max="100" value={(editingDoc.prepayPercent || 0) * 100} onChange={(e) => setEditingDoc({...editingDoc, prepayPercent: Number(e.target.value) / 100})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div>
                <label className="block font-bold mb-1">Thanh toán</label>
                <CustomSelect value={editingDoc.paymentStatus} onChange={(e) => setEditingDoc({...editingDoc, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                  <option value="Chưa thanh toán">Chưa thanh toán</option>
                  <option value="Đã thanh toán">Đã thanh toán</option>
                </CustomSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gapx-2 py-2">
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
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingDoc(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
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
    </div>
    </>
  );
};
