import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';

const parseDateKey = (timestamp: string): string => {
  const value = (timestamp || '').trim();
  if (!value) return 'unknown';

  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString().split('T')[0];
  }

  const parts = value.split(' ');
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const [d, m, y] = datePart.split('/');
  if (y && m && d) return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

  const isoMatch = value.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  return 'unknown';
};

const formatDateLabel = (dateKey: string): string => {
  if (dateKey === 'unknown') return 'Không xác định';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateKey === today) return 'Hôm nay';
  if (dateKey === yesterday) return 'Hôm qua';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

const parseTime = (timestamp: string): string => {
  const value = (timestamp || '').trim();
  if (!value) return '';

  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const parts = value.split(' ');
  if (parts.length > 1) return parts[0];
  return value;
};

// Helper to determine action type for styling
const getActionTypeInfo = (action: string) => {
  const text = action.toLowerCase();
  if (text.includes('xóa') || text.includes('delete') || text.includes('hủy')) {
    return { color: 'text-red-700', bg: 'bg-red-50' };
  }
  if (text.includes('tạo mới') || text.includes('thêm') || text.includes('add') || text.includes('create')) {
    return { color: 'text-emerald-700', bg: 'bg-emerald-50' };
  }
  if (text.includes('chỉnh sửa') || text.includes('cập nhật') || text.includes('update') || text.includes('edit')) {
    return { color: 'text-primary', bg: 'bg-blue-50' };
  }
  return { color: 'text-slate-700', bg: 'bg-slate-100' };
};

const renderActionText = (text: string, fullDetail: boolean = false) => {
    if (!text) return text;
    
    // Check if it has |Detail:
    let mainText = text;
    let detailText = '';
    const detailIndex = text.indexOf(' |Detail:');
    if (detailIndex !== -1) {
      mainText = text.substring(0, detailIndex);
      detailText = text.substring(detailIndex + 9);
    }

    const splitIndex = mainText.indexOf(': ');
    let renderedMain;
    if (splitIndex !== -1) {
      const actionPart = mainText.substring(0, splitIndex + 1);
      const variablePart = mainText.substring(splitIndex + 2);
      renderedMain = (
        <>
          {actionPart} <span className="font-extrabold">{variablePart}</span>
        </>
      );
    } else {
      renderedMain = <>{mainText}</>;
    }

    if (fullDetail && detailText) {
      return (
        <div className="flex flex-col gap-2">
          <div>{renderedMain}</div>
          <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 italic shadow-sm whitespace-pre-wrap">
            {detailText}
          </div>
        </div>
      );
    }
    return renderedMain;
  };

export const ActivityLogPage: React.FC = () => {
  const { activityLogs, projects, fetchActivityLogs } = useRealtimeStore();

  React.useEffect(() => {
    fetchActivityLogs();
  }, []);

  const getProjectName = (projCodeOrName: string) => {
    if (!projCodeOrName) return projCodeOrName;
    const proj = projects.find(p => p.code === projCodeOrName || p.name === projCodeOrName);
    return proj ? proj.name : projCodeOrName;
  };
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      let matchDate = true;
      const logDate = parseDateKey(log.timestamp || '');
      if (dateFrom && logDate !== 'unknown') matchDate = matchDate && logDate >= dateFrom;
      if (dateTo && logDate !== 'unknown') matchDate = matchDate && logDate <= dateTo;

      let matchSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchSearch = 
          (log.action || '').toLowerCase().includes(query) ||
          (log.user || '').toLowerCase().includes(query) ||
          (log.project || '').toLowerCase().includes(query);
      }

      return matchDate && matchSearch;
    });
  }, [activityLogs, dateFrom, dateTo, searchQuery]);

  const handleExportExcel = () => {
    const data = filteredLogs.map((log, index) => ({
      'STT': index + 1,
      'Thời gian': log.timestamp || '',
      'Nhân sự': log.user || '',
      'Dự án': getProjectName(log.project) || '',
      'Thao tác / Hành động': log.action || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhatKyHoatDong');
    XLSX.writeFile(wb, `Nhat_Ky_Hoat_Dong_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const groupedLogs = useMemo(() => {
    return filteredLogs.reduce((acc: Record<string, typeof activityLogs>, log) => {
      const dateKey = parseDateKey(log.timestamp || '');
      const label = formatDateLabel(dateKey);
      const headerText = dateKey !== 'unknown' ? (() => {
        const [y, m, d] = dateKey.split('-');
        return `${d}/${m}/${y}`;
      })() : 'Không xác định';

      const finalLabel = label === headerText ? headerText : `${label} (${headerText})`;
      
      if (!acc[finalLabel]) acc[finalLabel] = [];
      acc[finalLabel].push(log);
      return acc;
    }, {});
  }, [filteredLogs]);

  const hasFilters = dateFrom !== '' || dateTo !== '' || searchQuery !== '';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  let globalIndex = 0;

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-hidden">
      {/* HEADER SECTION */}
      <section className="sticky top-0 z-30 border-b border-slate-200 bg-white px-3 py-2 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 shrink-0 shadow-xs">
        <div className="flex items-center justify-between w-full md:w-auto h-8 md:h-auto pr-12 md:pr-0">
          <h1 className="page-title text-base md:text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">NHẬT KÝ HOẠT ĐỘNG</h1>
          <span className="flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-50 text-primary text-[11px] font-bold border border-blue-100 whitespace-nowrap md:hidden">
            {filteredLogs.length} thao tác
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto justify-end">
          <span className="hidden md:flex items-center justify-center px-3 h-8 rounded-lg bg-blue-50 text-primary text-xs font-bold border border-blue-100 whitespace-nowrap">
            {filteredLogs.length} thao tác
          </span>
          
          <div className="relative hidden md:block w-56 min-w-0">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hành động, nhân sự..."
              className="w-full pl-8 pr-2 h-8 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 h-8 focus-within:ring-1 focus-within:ring-primary transition-all">
              <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Từ</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none w-[100px] cursor-pointer"
              />
              <span className="text-slate-300 mx-1 font-light shrink-0">|</span>
              <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Đến</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none w-[100px] cursor-pointer"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                title="Xóa lọc"
                className="flex items-center justify-center gap-1 px-2.5 h-8 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span className="hidden sm:inline">Xóa lọc</span>
              </button>
            )}

            {/* Export File Dropdown Menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 h-8 px-3 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">file_download</span>
                <span>Xuất file</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[9999] animate-in fade-in zoom-in duration-100">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                      Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                      CSV (.csv)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        window.print();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                      PDF (.pdf)
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                    >
                      <span className="material-symbols-outlined text-base text-blue-600">description</span>
                      Word (.docx)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TABLE SECTION */}
      <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col pb-4">
        <section className="flex-1 grid grid-cols-1 gap-0 overflow-hidden">
          <div className="bg-white border-b border-r border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                  <tr>
                    <th className="text-center p-3 bg-slate-50 w-16">STT</th>
                    <th className="text-left p-3 bg-slate-50 w-40">Thời gian</th>
                    <th className="text-left p-3 bg-slate-50 w-48">Nhân sự</th>
                    
                    <th className="text-left p-3 bg-slate-50 w-64">Dự án</th>
                    <th className="text-left p-3 bg-slate-50">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history_toggle_off</span>
                          <span className="font-semibold text-sm">Chưa có nhật ký hoạt động</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedLogs).map(([dateLabel, logs]) => (
                      <React.Fragment key={dateLabel}>
                        <tr className="bg-slate-50/80 border-t-2 border-slate-200 group">
                          <td colSpan={5} className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary/70 text-[18px]">calendar_month</span>
                              <span className="text-xs font-extrabold text-slate-700">{dateLabel}</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-400 shadow-xs">
                                {logs.filter(log => log.icon !== 'ATTENDANCE_SESSION').length} thao tác
                              </span>
                            </div>
                          </td>
                        </tr>
                        {logs.filter(log => log.icon !== 'ATTENDANCE_SESSION').map((log) => {
                          globalIndex++;
                          const timeStr = parseTime(log.timestamp || '');
                          const actionInfo = getActionTypeInfo(log.action);

                          return (
                            <tr key={log.id} onClick={() => setSelectedLog(log)} className="cursor-pointer hover:bg-slate-50 transition-colors border-t border-slate-100">
                              <td className="p-3 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                                {globalIndex}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-slate-600 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  {timeStr}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-2.5 text-slate-700 font-bold">
                                  <span className="material-symbols-outlined text-[13px] text-slate-500">person</span>
                                  {log.user}
                                </span>
                              </td>
                              
                              <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                                {log.project === 'COMPANY' || !log.project || log.project === 'Hệ thống' ? (
                                  <span className="text-slate-400">-</span>
                                ) : (
                                  <span className="inline-flex items-center gap-2.5 text-indigo-700 font-bold">
                                    <span className="material-symbols-outlined text-[13px]">business_center</span>
                                    {getProjectName(log.project || "")}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`inline-block text-[13px] font-bold ${actionInfo.color} leading-relaxed`}>
                                  {renderActionText(log.action)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Chi tiết Nhật ký hoạt động">
        {selectedLog && (
          <div className="space-y-4 text-sm mt-2">
            <div className="flex flex-col gap-2 border-b pb-3 border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Thời gian</span>
              <span className="font-bold text-slate-800">
                  {(() => {
                    const d = new Date(selectedLog.timestamp);
                    if (!Number.isNaN(d.getTime())) {
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mm = String(d.getMinutes()).padStart(2, '0');
                      const ss = String(d.getSeconds()).padStart(2, '0');
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const yy = d.getFullYear();
                      return `${hh}:${mm}:${ss} ${dd}/${mo}/${yy}`;
                    }
                    return selectedLog.timestamp;
                  })()}
                </span>
            </div>
            <div className="flex flex-col gap-2 border-b pb-3 border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Nhân sự</span>
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-slate-400">person</span>
                {selectedLog.user}
              </span>
            </div>
            
            {selectedLog.project && selectedLog.project !== 'COMPANY' && selectedLog.project !== 'Hệ thống' && (
              <div className="flex flex-col gap-2 border-b pb-3 border-slate-100">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Dự án</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-2.5 text-indigo-700 font-bold">
                    <span className="material-symbols-outlined text-[13px]">business_center</span>
                    {getProjectName(selectedLog.project || "")}
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Thao tác / Nội dung chi tiết</span>
              <div className="mt-1 p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-medium leading-relaxed">
                {renderActionText(selectedLog.action, true)}
              </div>
            </div>
            <div className="pt-4 mt-4 border-t flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-5 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors">
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
