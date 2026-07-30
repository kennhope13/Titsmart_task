import React, { useMemo, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { DocumentTrack } from '../types';

export const DocumentTrackingPage: React.FC = () => {
  const {
    documentTracks,
    addDocumentTrack,
    updateDocumentTrack,
    deleteDocumentTrack,
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
            projectCode: projectCode,
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

        triggerToast(`Đã nhập thành công ${importCount} hồ sơ gửi đi từ file Excel!`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        triggerToast('Lỗi phân tích Excel: ' + err.message, 'warning');
      }
    };
    reader.readAsBinaryString(file);
  };

  const [activeFilterProj, setActiveFilterProj] = useState('all');
  const [activeFilterStatus, setActiveFilterStatus] = useState('all');
  const [activeFilterPayment, setActiveFilterPayment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentTrack | null>(null);

  // Forms state
  const [newDoc, setNewDoc] = useState<Partial<DocumentTrack>>({
    stt: '', contractNo: '', contractName: '', projectCode: 'NĂM CĂN', company: '', receiverName: '', phone: '', address: '', sendDate: new Date().toISOString().split('T')[0], receiveDate: '', docStatus: 'Chưa ký', side: 'Bên trả', contractValue: 0, prepayPercent: 0, prepayAmount: 0, paymentStatus: 'Chưa thanh toán', isCompleted: false, notes: ''
  });

  // Extract project options from data
  const projectOptions = useMemo(() => {
    const projs = new Set<string>();
    documentTracks.forEach(d => {
      if (d.projectCode) projs.add(d.projectCode);
    });
    return Array.from(projs);
  }, [documentTracks]);

  // Extract status options from data
  const docStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    documentTracks.forEach(d => {
      if (d.docStatus) statuses.add(d.docStatus);
    });
    return Array.from(statuses);
  }, [documentTracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return documentTracks.filter(track => {
      const matchProj = activeFilterProj === 'all' || track.projectCode === activeFilterProj;
      const matchStatus = activeFilterStatus === 'all' || track.docStatus === activeFilterStatus;
      const matchPayment = activeFilterPayment === 'all' || track.paymentStatus === activeFilterPayment;
      
      const query = searchTerm.trim().toLowerCase();
      const matchSearch = !query || 
        track.contractNo.toLowerCase().includes(query) ||
        track.contractName.toLowerCase().includes(query) ||
        track.company.toLowerCase().includes(query) ||
        track.receiverName.toLowerCase().includes(query);

      return matchProj && matchStatus && matchPayment && matchSearch;
    });
  }, [documentTracks, activeFilterProj, activeFilterStatus, activeFilterPayment, searchTerm]);

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
      'Dự án': t.projectCode,
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
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50 relative">
      
      {/* HEADER SECTION */}
      <section className="border-b border-slate-200 bg-white px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">drafts</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">Theo dõi Hồ sơ gửi đi</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Quản lý giao nhận công văn, hợp đồng, chứng từ thanh toán tạm ứng và theo dõi công nợ</p>
          </div>
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
            Gửi Hồ Sơ Mới
          </button>
        </div>
      </section>

      <div className="p-6 space-y-4">
      {/* METRICS ROW */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng lượt gửi đi</span>
            <span className="material-symbols-outlined text-lg text-blue-500 bg-blue-50 p-1.5 rounded-md">send</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.totalCount} <span className="text-xs font-semibold text-slate-500">hồ sơ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Lượt gửi hồ sơ đi các dự án</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Đã ký / Đã nhận đủ</span>
            <span className="material-symbols-outlined text-lg text-emerald-500 bg-emerald-50 p-1.5 rounded-md">verified</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.completedDocs} <span className="text-xs font-semibold text-slate-500">hồ sơ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Đã ký kết hoặc chủ đầu tư nhận đủ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng giá trị HĐ</span>
            <span className="material-symbols-outlined text-lg text-rose-500 bg-rose-50 p-1.5 rounded-md">currency_exchange</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.totalContractVal.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Tổng tiền của các hợp đồng đang theo dõi</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng Tạm ứng</span>
            <span className="material-symbols-outlined text-lg text-amber-500 bg-amber-50 p-1.5 rounded-md">account_balance</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{summary.totalPrepayVal.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ</span></div>
          <div className="text-[10px] text-slate-500 mt-1">Số tiền tạm ứng theo DNTU</div>
        </div>
      </section>

      {/* FILTER & SEARCH */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 flex flex-col xl:flex-row justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Tìm theo số HĐ, tên HĐ, đối tác..." 
            className="w-80 max-w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" 
          />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Dự án:</span>
            <select 
              value={activeFilterProj} 
              onChange={(e) => setActiveFilterProj(e.target.value)} 
              className="border border-slate-200 px-2 py-1.5 rounded-md text-xs font-bold text-slate-700 focus:outline-none bg-white"
            >
              <option value="all">Tất cả dự án</option>
              {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Tình trạng HĐ:</span>
            <select 
              value={activeFilterStatus} 
              onChange={(e) => setActiveFilterStatus(e.target.value)} 
              className="border border-slate-200 px-2 py-1.5 rounded-md text-xs font-bold text-slate-700 focus:outline-none bg-white"
            >
              <option value="all">Tất cả tình trạng</option>
              {docStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Thanh toán:</span>
            <select 
              value={activeFilterPayment} 
              onChange={(e) => setActiveFilterPayment(e.target.value)} 
              className="border border-slate-200 px-2 py-1.5 rounded-md text-xs font-bold text-slate-700 focus:outline-none bg-white"
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="Chưa thanh toán">Chưa thanh toán</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
            </select>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-12 text-center">STT</th>
                <th className="p-3.5 min-w-44">Hợp đồng</th>
                <th className="p-3.5">Dự án</th>
                <th className="p-3.5 min-w-44">Đối tác nhận</th>
                <th className="p-3.5 text-center">Ngày gửi</th>
                <th className="p-3.5 text-center">Ngày nhận</th>
                <th className="p-3.5 text-center">Hồ sơ</th>
                <th className="p-3.5 text-right">Giá trị HĐ (đ)</th>
                <th className="p-3.5 text-right">Tạm ứng (đ)</th>
                <th className="p-3.5 text-center">Thanh toán</th>
                <th className="p-3.5 text-center">Hoàn tất</th>
                <th className="p-3.5 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredTracks.map((track) => (
                <tr 
                  key={track.id} 
                  className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer"
                  onClick={() => setEditingDoc(track)}
                >
                  <td className="p-3.5 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                  <td className="p-3.5">
                    <div className="font-extrabold text-slate-900 leading-snug">{track.contractName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{track.contractNo || 'Không số'}</div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-700">{track.projectCode}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{track.company}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{track.receiverName} - {track.phone}</div>
                    {track.address && <div className="text-[10px] text-slate-400 truncate max-w-xs">{track.address}</div>}
                  </td>
                  <td className="p-3.5 text-center">{track.sendDate}</td>
                  <td className="p-3.5 text-center">{track.receiveDate || <span className="text-slate-300">Chưa nhận</span>}</td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      track.docStatus?.includes('ký') || track.docStatus?.includes('đủ') 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {track.docStatus || 'Chưa rõ'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-950">{(track.contractValue || 0).toLocaleString('vi-VN')}</td>
                  <td className="p-3.5 text-right text-rose-600">
                    {(track.prepayAmount || 0).toLocaleString('vi-VN')}
                    <div className="text-[9px] text-slate-400">({(track.prepayPercent || 0) * 100}%)</div>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      track.paymentStatus?.includes('Đã') 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {track.paymentStatus || 'Chưa thanh toán'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => updateDocumentTrack(track.id, { isCompleted: !track.isCompleted })}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg ${
                        track.isCompleted 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                          : 'bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-500'
                      }`}
                      title={track.isCompleted ? 'Đánh dấu chưa hoàn tất' : 'Đánh dấu đã hoàn tất'}
                    >
                      <span className="material-symbols-outlined text-base">task_alt</span>
                    </button>
                  </td>
                  <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => { if(window.confirm('Xóa thông tin theo dõi hồ sơ này?')) deleteDocumentTrack(track.id) }} 
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTracks.length === 0 && (
                <tr><td colSpan={12} className="p-8 text-center text-slate-400">Không có hồ sơ nào phù hợp bộ lọc tìm kiếm.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {/* MODALS */}
      {/* Add New Doc Modal */}
      <Modal isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} title="Thêm thông tin Hồ Sơ Gửi Đi mới">
        <form onSubmit={(e) => {
          e.preventDefault();
          const val = Number(newDoc.contractValue || 0);
          const prepayPct = Number(newDoc.prepayPercent || 0);
          const prepayAmt = val * prepayPct;

          addDocumentTrack({
            stt: newDoc.stt || String(documentTracks.length + 1),
            contractNo: newDoc.contractNo || '',
            contractName: newDoc.contractName || '',
            projectCode: newDoc.projectCode || 'KHÁC',
            company: newDoc.company || '',
            receiverName: newDoc.receiverName || '',
            phone: newDoc.phone || '',
            address: newDoc.address || '',
            sendDate: newDoc.sendDate || '',
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
          setIsNewDocOpen(false);
          setNewDoc({stt: '', contractNo: '', contractName: '', projectCode: 'NĂM CĂN', company: '', receiverName: '', phone: '', address: '', sendDate: new Date().toISOString().split('T')[0], receiveDate: '', docStatus: 'Chưa ký', side: 'Bên trả', contractValue: 0, prepayPercent: 0, prepayAmount: 0, paymentStatus: 'Chưa thanh toán', isCompleted: false, notes: ''});
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Mã/Số Hợp đồng</label><input type="text" value={newDoc.contractNo} onChange={(e) => setNewDoc({...newDoc, contractNo: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Tên Hợp đồng / Hồ sơ *</label><input type="text" required value={newDoc.contractName} onChange={(e) => setNewDoc({...newDoc, contractName: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Thuộc Dự án *</label>
              <select value={newDoc.projectCode} onChange={(e) => setNewDoc({...newDoc, projectCode: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                <option value="NĂM CĂN">NĂM CĂN</option>
                <option value="PHƯỚC LÝ">PHƯỚC LÝ</option>
                <option value="PHƯỚC TÂN">PHƯỚC TÂN</option>
                <option value="DAKRLAP">ĐẮK R'LẤP</option>
                <option value="KHÁC">KHÁC</option>
              </select>
            </div>
            <div><label className="block font-bold mb-1">Công ty / Đối tác nhận *</label><input type="text" required value={newDoc.company} onChange={(e) => setNewDoc({...newDoc, company: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">Người nhận trực tiếp</label><input type="text" value={newDoc.receiverName} onChange={(e) => setNewDoc({...newDoc, receiverName: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">SĐT người nhận</label><input type="text" value={newDoc.phone} onChange={(e) => setNewDoc({...newDoc, phone: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Bên (Ví dụ: Bên trả)</label><input type="text" value={newDoc.side} onChange={(e) => setNewDoc({...newDoc, side: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div><label className="block font-bold mb-1">Địa chỉ nhận hồ sơ</label><input type="text" value={newDoc.address} onChange={(e) => setNewDoc({...newDoc, address: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày gửi đi *</label><input type="date" required value={newDoc.sendDate} onChange={(e) => setNewDoc({...newDoc, sendDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Ngày đối tác nhận</label><input type="date" value={newDoc.receiveDate} onChange={(e) => setNewDoc({...newDoc, receiveDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-lg border">
            <div><label className="block font-bold mb-1">Giá trị HĐ (đ)</label><input type="number" value={newDoc.contractValue} onChange={(e) => setNewDoc({...newDoc, contractValue: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white font-bold" /></div>
            <div><label className="block font-bold mb-1">Tạm ứng (%)</label><input type="number" step="0.05" min="0" max="1" value={newDoc.prepayPercent} onChange={(e) => setNewDoc({...newDoc, prepayPercent: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1">Thanh toán</label>
              <select value={newDoc.paymentStatus} onChange={(e) => setNewDoc({...newDoc, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                <option value="Chưa thanh toán">Chưa thanh toán</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Trạng thái hồ sơ</label>
              <select value={newDoc.docStatus} onChange={(e) => setNewDoc({...newDoc, docStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                <option value="Chưa nhận">Chưa nhận</option>
                <option value="Đã nhận đủ">Đã nhận đủ</option>
                <option value="Đã ký">Đã ký</option>
                <option value="Đã đổi gửi lại">Đã đổi gửi lại</option>
              </select>
            </div>
            <div className="flex items-center pt-5 gap-2"><input type="checkbox" checked={newDoc.isCompleted} onChange={(e) => setNewDoc({...newDoc, isCompleted: e.target.checked})} className="w-4 h-4" /> <span className="font-bold">Đã hoàn tất hồ sơ</span></div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newDoc.notes} onChange={(e) => setNewDoc({...newDoc, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewDocOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Gửi hồ sơ</button></div>
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
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Số HĐ</label><input type="text" value={editingDoc.contractNo} onChange={(e) => setEditingDoc({...editingDoc, contractNo: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Tên Hợp đồng / Hồ sơ *</label><input type="text" required value={editingDoc.contractName} onChange={(e) => setEditingDoc({...editingDoc, contractName: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Thuộc Dự án *</label>
                <select value={editingDoc.projectCode} onChange={(e) => setEditingDoc({...editingDoc, projectCode: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                  <option value="NĂM CĂN">NĂM CĂN</option>
                  <option value="PHƯỚC LÝ">PHƯỚC LÝ</option>
                  <option value="PHƯỚC TÂN">PHƯỚC TÂN</option>
                  <option value="DAKRLAP">ĐẮK R'LẤP</option>
                  <option value="KHÁC">KHÁC</option>
                </select>
              </div>
              <div><label className="block font-bold mb-1">Công ty nhận *</label><input type="text" required value={editingDoc.company} onChange={(e) => setEditingDoc({...editingDoc, company: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">Người nhận</label><input type="text" value={editingDoc.receiverName} onChange={(e) => setEditingDoc({...editingDoc, receiverName: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">SĐT nhận</label><input type="text" value={editingDoc.phone} onChange={(e) => setEditingDoc({...editingDoc, phone: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Bên</label><input type="text" value={editingDoc.side} onChange={(e) => setEditingDoc({...editingDoc, side: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div><label className="block font-bold mb-1">Địa chỉ</label><input type="text" value={editingDoc.address} onChange={(e) => setEditingDoc({...editingDoc, address: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày gửi *</label><input type="date" required value={editingDoc.sendDate} onChange={(e) => setEditingDoc({...editingDoc, sendDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Ngày nhận</label><input type="date" value={editingDoc.receiveDate || ''} onChange={(e) => setEditingDoc({...editingDoc, receiveDate: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-lg border">
              <div><label className="block font-bold mb-1">Giá trị HĐ (đ)</label><input type="number" value={editingDoc.contractValue} onChange={(e) => setEditingDoc({...editingDoc, contractValue: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white font-bold" /></div>
              <div><label className="block font-bold mb-1">Tạm ứng (%)</label><input type="number" step="0.05" min="0" max="1" value={editingDoc.prepayPercent} onChange={(e) => setEditingDoc({...editingDoc, prepayPercent: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div>
                <label className="block font-bold mb-1">Thanh toán</label>
                <select value={editingDoc.paymentStatus} onChange={(e) => setEditingDoc({...editingDoc, paymentStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold">
                  <option value="Chưa thanh toán">Chưa thanh toán</option>
                  <option value="Đã thanh toán">Đã thanh toán</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Trạng thái hồ sơ</label>
                <select value={editingDoc.docStatus} onChange={(e) => setEditingDoc({...editingDoc, docStatus: e.target.value})} className="w-full border rounded-lg p-2 bg-white">
                  <option value="Chưa nhận">Chưa nhận</option>
                  <option value="Đã nhận đủ">Đã nhận đủ</option>
                  <option value="Đã ký">Đã ký</option>
                  <option value="Đã đổi gửi lại">Đã đổi gửi lại</option>
                </select>
              </div>
              <div className="flex items-center pt-5 gap-2"><input type="checkbox" checked={editingDoc.isCompleted} onChange={(e) => setEditingDoc({...editingDoc, isCompleted: e.target.checked})} className="w-4 h-4" /> <span className="font-bold">Đã hoàn tất hồ sơ</span></div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingDoc.notes} onChange={(e) => setEditingDoc({...editingDoc, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingDoc(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Cập nhật</button></div>
          </form>
        )}
      </Modal>
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
