import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission, canManageItem } from '../services/authStore';
import { Modal } from '../components/common/Modal';
import { FileViewerItem } from '../components/common/FileViewerItem';
import { Toast } from '../components/common/Toast';
import { CustomSelect } from '../components/common/CustomSelect';
import { ImageUpload } from '../components/common/ImageUpload';
import { CostPlanSummaryTable } from './cost-plan/CostPlanSummaryTable';
import { AuditInfoCell } from '../components/common/AuditInfoCell';

const formatDateForInput = (d?: string) => {
  if (!d) return '';
  const str = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  try {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString().split('T')[0];
    }
  } catch {}
  return str;
};

export const OfficeCostsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { expenses, engineers, addExpense, updateExpense, deleteExpense } = useRealtimeStore();

  const currentProjExpenses = useMemo(() => expenses.filter(e => e.projectCode === 'OFFICE' || e.projectCode === 'VAN_PHONG').sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()), [expenses]);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'info' }>({ show: false, message: '', type: 'success' });
  const triggerToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; title: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const [highlightExpenseId, setHighlightExpenseId] = useState<string | null>(null);
  const [highlightKeyword, setHighlightKeyword] = useState<string | null>(null);
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);

  const [expenseFilterSpender, setExpenseFilterSpender] = useState('all');
  const [expenseFilterContent, setExpenseFilterContent] = useState('all');
  const [expenseFilterUnit, setExpenseFilterUnit] = useState('all');
  const [expenseFilterDateFrom, setExpenseFilterDateFrom] = useState('');
  const [expenseFilterDateTo, setExpenseFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [newExpenseData, setNewExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    content: 'Văn phòng phẩm',
    description: '',
    spenderName: '',
    unit: '',
    quantity: 1,
    unitPrice: '' as any,
    taxAmount: '' as any,
    incomeAmount: '' as any,
    notes: '',
    invoiceUrl: ''
  });

  const [additionalItems, setAdditionalItems] = useState<any[]>([]);

  const expenseContentTypes = useMemo(() => {
    const types = new Set<string>();
    types.add('Quỹ');
    types.add('Văn phòng phẩm');
    types.add('Vật tư/ thiết bị');
    types.add('Chi phí ăn ở/đi lại');
    types.add('Chi phí điện/nước/mạng');
    types.add('Chi phí vận chuyển');
    currentProjExpenses.forEach(e => { if (e.content) types.add(e.content.trim()); });
    return Array.from(types).sort();
  }, [currentProjExpenses]);

  const expenseSpenderNames = useMemo(() => {
    const names = new Set<string>();
    names.add('CÔNG TY');
    engineers.forEach(e => { if (e.name) names.add(e.name.trim()); });
    currentProjExpenses.forEach(e => { if (e.spenderName) names.add(e.spenderName.trim()); });
    return Array.from(names).sort();
  }, [currentProjExpenses, engineers]);

  const filteredExpenses = useMemo(() => {
    return currentProjExpenses.filter(e => {
      if (expenseFilterSpender !== 'all' && e.spenderName !== expenseFilterSpender) return false;
      if (expenseFilterContent !== 'all' && e.content !== expenseFilterContent) return false;
      if (expenseFilterUnit !== 'all' && e.unit !== expenseFilterUnit) return false;
      if (expenseFilterDateFrom && (!e.date || e.date < expenseFilterDateFrom)) return false;
      if (expenseFilterDateTo && (!e.date || e.date > expenseFilterDateTo)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (e.content?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [currentProjExpenses, expenseFilterSpender, expenseFilterContent, expenseFilterUnit, expenseFilterDateFrom, expenseFilterDateTo, searchQuery]);

  useEffect(() => {
    const idParam = searchParams.get('id') || searchParams.get('expenseId');
    const highlightParam = searchParams.get('highlight') || searchParams.get('search');
    if (idParam) {
      setHighlightExpenseId(idParam);
      setIsHighlightActive(true);
    }
    if (highlightParam) {
      setHighlightKeyword(highlightParam.toLowerCase().trim());
      setIsHighlightActive(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isHighlightActive && (highlightExpenseId || highlightKeyword)) {
      const timer = setTimeout(() => {
        const elem = document.querySelector('.highlighted-expense-row');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
      const fadeTimer = setTimeout(() => setIsHighlightActive(false), 9000);
      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [isHighlightActive, highlightExpenseId, highlightKeyword, filteredExpenses]);

  const handleExportExcel = () => {
    const data = filteredExpenses.map((exp, index) => ({
      'STT': index + 1,
      'Ngày': exp.date || '',
      'Người chi': exp.spenderName || '',
      'Nội dung': exp.content || '',
      'Diễn giải': exp.description || '',
      'ĐVT': exp.unit || '',
      'Số lượng': exp.quantity || 0,
      'Đơn giá (đ)': exp.unitPrice || 0,
      'Thuế VAT (%)': exp.taxAmount || 0,
      'Thành tiền (đ)': exp.totalAmount || 0,
      'Thực thu (đ)': exp.incomeAmount || 0,
      'Ghi chú': exp.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ChiPhiVanPhong');
    XLSX.writeFile(wb, `Chi_Phi_Van_Phong_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50 overflow-hidden relative">
      <section className="border-b border-slate-200 bg-white pl-3 pr-3 md:pr-20 py-3 md:py-0 md:h-12 flex items-center justify-between gap-4 z-50 shrink-0 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div><h2 className="page-title text-base md:text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">CHI PHÍ VĂN PHÒNG</h2></div>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop Export File Dropdown */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 h-[34px] px-3.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs cursor-pointer relative z-50"
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
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-blue-600">description</span>
                    Word (.docx)
                  </button>
                </div>
              </>
            )}
          </div>

          {hasPermission(user, 'EDIT_EXPENSES') && (
            <button
              onClick={() => setIsNewExpenseOpen(true)}
              className="hidden md:flex bg-primary text-white h-[34px] px-3.5 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Thêm chi phí mới
            </button>
          )}
        </div>
      </section>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* TỔNG QUAN CHI PHÍ */}
        <div className="shrink-0 w-full overflow-x-auto bg-white border-b border-slate-200">
          <CostPlanSummaryTable
            expenses={currentProjExpenses}
            labors={[]}
            onAllocateFund={(name: string, amount?: number, date?: string) => {
              if (name === 'KHAC') return;
              let targetName = name;
              if (name === '__PROJECT__') targetName = 'CÔNG TY';

              const currentTotalFund = currentProjExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
              const fundVal = amount !== undefined ? (amount > currentTotalFund ? amount - currentTotalFund : amount) : 0;
              if (fundVal <= 0) return;

              addExpense({
                projectCode: 'OFFICE',
                stt: String(currentProjExpenses.length + 1),
                date: date || new Date().toISOString().split('T')[0],
                content: 'Quỹ',
                description: `Cấp quỹ cho ${targetName}`,
                spenderName: targetName,
                unit: '',
                quantity: 0,
                unitPrice: 0,
                taxAmount: 0,
                totalAmount: 0,
                incomeAmount: fundVal,
                balanceFund: 0,
                notes: user?.name || user?.username || 'Cấp quỹ',
              });
              triggerToast(`Đã cấp quỹ ${fundVal.toLocaleString('vi-VN')} đ cho ${targetName}!`, 'success');
            }}
          />
        </div>

        {/* BẢNG CHI PHÍ */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col min-h-0">
          {/* Mobile Search + Action Row */}
          <div className="md:hidden flex items-center gap-2 p-2.5 bg-white border-b border-slate-200">
            <div className="relative flex-1 min-w-0">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all h-9"
              />
            </div>
            {hasPermission(user, 'EDIT_EXPENSES') && (
              <button
                onClick={() => setIsNewExpenseOpen(true)}
                title="Thêm chi phí mới"
                className="flex items-center justify-center bg-primary text-white h-9 w-9 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            )}
            
            {/* Mobile Export File Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center justify-center h-9 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-all shadow-xs gap-0.5"
                title="Xuất file"
              >
                <span className="material-symbols-outlined text-base">file_download</span>
                <span className="material-symbols-outlined text-xs">expand_more</span>
              </button>
              {showExportMenu && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
              )}
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in duration-100">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportExcel();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-green-600">grid_on</span>
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportExcel();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-teal-600">csv</span>
                    CSV (.csv)
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      window.print();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-red-600">picture_as_pdf</span>
                    PDF (.pdf)
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExportExcel();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-blue-600">description</span>
                    Word (.docx)
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar relative pb-16 md:pb-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                <tr>
                  <th className="px-2 py-1.5 w-[70px]">Ngày</th>
                  <th className="px-2 py-1.5 min-w-[90px]">Người chi</th>
                  <th className="px-2 py-1.5 min-w-[180px]">Nội dung / Diễn giải</th>
                  <th className="px-2 py-1.5 w-10 text-left">ĐVT</th>
                  <th className="px-2 py-1.5 w-10 text-right">SL</th>
                  <th className="px-2 py-1.5 text-right">Đơn giá</th>
                  <th className="px-2 py-1.5 text-right">VAT</th>
                  <th className="px-2 py-1.5 text-right min-w-[85px]">Thành tiền</th>
                  <th className="px-2 py-1.5 text-right min-w-[85px]">Thực thu</th>
                  <th className="px-2 py-1.5 text-center w-[50px]">H.Đơn</th>
                  <th className="px-2 py-1.5 min-w-[80px]">Ghi chú</th>
                  <th className="px-2 py-1.5 min-w-[120px] text-center">NGƯỜI CẬP NHẬT</th>
                  {hasPermission(user, 'EDIT_EXPENSES') && <th className="px-2 py-1.5 text-center w-[40px]"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700 leading-tight">
                {filteredExpenses.map((exp) => {
                  const canManage = canManageItem(user, exp, 'EDIT_EXPENSES');
                  const isHighlighted = isHighlightActive && (
                    (highlightExpenseId && String(exp.id) === String(highlightExpenseId)) ||
                    (highlightKeyword && (
                      exp.content?.toLowerCase().includes(highlightKeyword) ||
                      exp.description?.toLowerCase().includes(highlightKeyword) ||
                      exp.spenderName?.toLowerCase().includes(highlightKeyword)
                    ))
                  );

                  return (
                    <tr
                      key={exp.id}
                      className={`transition-colors align-middle ${
                        isHighlighted
                          ? 'highlighted-expense-row bg-amber-100/60 hover:bg-amber-100/80 border-l-4 border-l-amber-500 border-y border-amber-300/70 ring-1 ring-inset ring-amber-300/50 font-medium'
                          : 'hover:bg-slate-50/50'
                      } ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => {
                        if (canManage) setEditingExpense(exp);
                        else triggerToast('Bạn không có quyền chỉnh sửa mục do người khác tạo', 'warning');
                      }}
                    >
                      <td className="px-2 py-1.5 font-semibold text-slate-900 whitespace-nowrap">{exp.date ? exp.date.substring(2) : '-'}</td>
                      <td className="px-2 py-1.5 font-semibold line-clamp-2" title={exp.spenderName}>{exp.spenderName || '-'}</td>
                      <td className="px-2 py-1.5">
                        <div className="font-bold text-slate-900 line-clamp-1" title={exp.content}>{exp.content}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={exp.description}>{exp.description}</div>
                      </td>
                      <td className="px-2 py-1.5 text-left">{exp.unit}</td>
                      <td className="px-2 py-1.5 text-right">{exp.quantity || '-'}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">{exp.unitPrice ? exp.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">{exp.taxAmount ? `${exp.taxAmount}%` : '-'}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-rose-600 whitespace-nowrap">{exp.totalAmount ? exp.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-emerald-600 whitespace-nowrap">{exp.incomeAmount ? exp.incomeAmount.toLocaleString('vi-VN') : '-'}</td>
                      <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {exp.invoiceUrl ? (
                          <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold whitespace-nowrap">Xem</button>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-2 py-1.5 text-[10px] max-w-[100px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                      <td className="px-2 py-1.5">
                        <AuditInfoCell updatedBy={exp.updatedBy} updatedAt={exp.updatedAt} />
                      </td>
                      <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {canManage ? (
                          <button
                            onClick={() => {
                              setDeleteConfirm({
                                isOpen: true,
                                id: exp.id,
                                title: exp.description || exp.content || 'Chi phí'
                              });
                            }}
                            title="Xóa chi phí"
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] block">delete</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 p-1 inline-block" title="Khóa: Chỉ người tạo hoặc Admin mới có quyền sửa/xóa">
                            <span className="material-symbols-outlined text-[15px] block text-slate-300">lock</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-2 py-8 text-center text-slate-500">Không có dữ liệu chi phí nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* NEW EXPENSE MODAL */}
      <Modal isOpen={isNewExpenseOpen} onClose={() => { setIsNewExpenseOpen(false); setAdditionalItems([]); }} title="Thêm Chi Phí Mới">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const qty = Number(newExpenseData.quantity || 1);
            const price = Number(newExpenseData.unitPrice || 0);
            const vat = Number(newExpenseData.taxAmount || 0);
            const rawTotal = qty * price;
            const vatAmt = vat > 0 ? (vat <= 100 ? (rawTotal * vat / 100) : vat) : 0;
            const total = Math.round(rawTotal + vatAmt);

            await addExpense({
              projectCode: 'OFFICE',
              stt: String(currentProjExpenses.length + 1),
              date: newExpenseData.date || new Date().toISOString().split('T')[0],
              content: newExpenseData.content || 'Văn phòng phẩm',
              description: newExpenseData.description,
              spenderName: newExpenseData.spenderName || user?.name || 'CÔNG TY',
              unit: newExpenseData.unit || '',
              quantity: qty,
              unitPrice: price,
              taxAmount: vat,
              totalAmount: total,
              incomeAmount: Number(newExpenseData.incomeAmount || 0),
              balanceFund: 0,
              notes: newExpenseData.notes || '',
              invoiceUrl: newExpenseData.invoiceUrl || ''
            });

            if (additionalItems.length > 0) {
              await Promise.all(additionalItems.map((item, idx) => {
                const itemQty = Number(item.quantity || 1);
                const itemPrice = Number(item.unitPrice || 0);
                const itemVat = Number(item.taxAmount || 0);
                const itemRaw = itemQty * itemPrice;
                const itemVatAmt = itemVat > 0 ? (itemVat <= 100 ? (itemRaw * itemVat / 100) : itemVat) : 0;
                return addExpense({
                  projectCode: 'OFFICE',
                  stt: String(currentProjExpenses.length + 1 + idx + 1),
                  date: newExpenseData.date || new Date().toISOString().split('T')[0],
                  content: newExpenseData.content || 'Văn phòng phẩm',
                  description: item.description || '',
                  spenderName: newExpenseData.spenderName || user?.name || 'CÔNG TY',
                  unit: item.unit || '',
                  quantity: itemQty,
                  unitPrice: itemPrice,
                  taxAmount: itemVat,
                  totalAmount: Math.round(itemRaw + itemVatAmt),
                  incomeAmount: Number(item.incomeAmount || 0),
                  balanceFund: 0,
                  notes: newExpenseData.notes || '',
                  invoiceUrl: newExpenseData.invoiceUrl || ''
                });
              }));
            }

            setIsNewExpenseOpen(false);
            setAdditionalItems([]);
            setNewExpenseData({...newExpenseData, description: '', unitPrice: 0, taxAmount: 0, incomeAmount: 0, notes: '', invoiceUrl: ''});
            triggerToast('Đã thêm thành công!', 'success');
          } catch (err: any) {
            console.error('Office expense create error:', err);
            triggerToast(`Lỗi khi lưu: ${err?.message || 'Không rõ nguyên nhân'}`, 'warning');
          }
          setLoading(false);
        }} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={newExpenseData.date} onChange={(e) => setNewExpenseData({...newExpenseData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1">Người chi / Nguồn quỹ</label>
              <CustomSelect value={newExpenseData.spenderName} onChange={(e) => setNewExpenseData({...newExpenseData, spenderName: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
                {expenseSpenderNames.map((name, i) => (<option key={i} value={name}>{name}</option>))}
              </CustomSelect>
            </div>
            <div>
              <label className="block font-bold mb-1">Loại nội dung</label>
              <CustomSelect value={newExpenseData.content} onChange={(e) => setNewExpenseData({...newExpenseData, content: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
                {expenseContentTypes.map((type, i) => (<option key={i} value={type}>{type}</option>))}
              </CustomSelect>
            </div>
            <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required value={newExpenseData.description} onChange={(e) => setNewExpenseData({...newExpenseData, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={newExpenseData.unit} onChange={(e) => setNewExpenseData({...newExpenseData, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Số lượng</label><input type="number" step="any" value={newExpenseData.quantity === 0 || (newExpenseData.quantity as any) === '0' ? '' : newExpenseData.quantity} onChange={(e) => setNewExpenseData({...newExpenseData, quantity: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 bg-white" placeholder="0" /></div>
            <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" step="any" value={newExpenseData.unitPrice === 0 || (newExpenseData.unitPrice as any) === '0' ? '' : newExpenseData.unitPrice} onChange={(e) => setNewExpenseData({...newExpenseData, unitPrice: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 font-bold bg-white" placeholder="0" /></div>
          </div>

          {additionalItems.map((item, index) => (
            <div key={index} className="pt-3 mt-3 border-t border-slate-200 relative">
              <button type="button" onClick={() => setAdditionalItems(prev => prev.filter((_, i) => i !== index))} className="absolute right-0 top-3 text-rose-500 hover:text-rose-700 p-1">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
              <div className="grid grid-cols-2 gap-3 pr-8">
                <div><label className="block font-bold mb-1 text-slate-500">Diễn giải/ Chi tiết *</label><input type="text" required value={item.description} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].description = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block font-bold mb-1 text-slate-500">ĐVT</label><input type="text" value={item.unit} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unit = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Số lượng</label><input type="number" step="any" value={item.quantity === 0 || (item.quantity as any) === '0' ? '' : item.quantity} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].quantity = e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" placeholder="0" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Đơn giá</label><input type="number" step="any" value={item.unitPrice === 0 || (item.unitPrice as any) === '0' ? '' : item.unitPrice} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unitPrice = e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" placeholder="0" /></div>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <button type="button" onClick={() => setAdditionalItems([...additionalItems, { description: '', unit: '', quantity: 1, unitPrice: 0, taxAmount: 0, incomeAmount: 0 }])} className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg w-fit cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">add</span> Thêm thiết bị khác
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">VAT (%)</label><input type="number" step="any" placeholder="VD: 8 hoặc 10" value={newExpenseData.taxAmount === 0 || (newExpenseData.taxAmount as any) === '0' ? '' : newExpenseData.taxAmount} onChange={(e) => setNewExpenseData({...newExpenseData, taxAmount: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" step="any" value={newExpenseData.incomeAmount === 0 || (newExpenseData.incomeAmount as any) === '0' ? '' : newExpenseData.incomeAmount} onChange={(e) => setNewExpenseData({...newExpenseData, incomeAmount: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 bg-white" placeholder="0" /></div>
            <div>
              <label className="block font-bold mb-1 text-slate-500">Tổng cộng (Tạm tính)</label>
              <div className="w-full border rounded-lg p-2 bg-slate-50 font-black text-rose-600">
                {(() => {
                  const qty = Number(newExpenseData.quantity || 1);
                  const price = Number(newExpenseData.unitPrice || 0);
                  const baseTotal = qty * price;
                  const vatPercent = Number(newExpenseData.taxAmount || 0);
                  const vatMoney = (baseTotal * vatPercent) / 100;
                  return (baseTotal + vatMoney).toLocaleString('vi-VN');
                })()} đ
              </div>
            </div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newExpenseData.notes} onChange={(e) => setNewExpenseData({...newExpenseData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div>
            <ImageUpload
              label="Hóa đơn / Chứng từ chi (Hình ảnh hoặc PDF)"
              value={newExpenseData.invoiceUrl}
              onChange={(url) => setNewExpenseData({...newExpenseData, invoiceUrl: Array.isArray(url) ? url[0] || '' : url})}
            />
          </div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setIsNewExpenseOpen(false); setAdditionalItems([]); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" disabled={loading} className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold disabled:opacity-50">Lưu phiếu chi</button></div>
        </form>
      </Modal>

      {/* EDIT EXPENSE MODAL */}
      <Modal isOpen={!!editingExpense} onClose={() => { setEditingExpense(null); setAdditionalItems([]); }} title="Cập nhật Phiếu Chi">
        {editingExpense && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const qty = Number(editingExpense.quantity || 1);
              const price = Number(editingExpense.unitPrice || 0);
              const vat = Number(editingExpense.taxAmount || 0);
              const rawTotal = qty * price;
              const vatAmt = vat > 0 ? (vat <= 100 ? (rawTotal * vat / 100) : vat) : 0;
              const total = Math.round(rawTotal + vatAmt);
              const cleanDate = formatDateForInput(editingExpense.date) || new Date().toISOString().split('T')[0];
              await updateExpense(editingExpense.id, { ...editingExpense, date: cleanDate, totalAmount: total });

              if (additionalItems.length > 0) {
                await Promise.all(additionalItems.map((item, idx) => {
                  const itemQty = Number(item.quantity || 1);
                  const itemPrice = Number(item.unitPrice || 0);
                  const itemVat = Number(item.taxAmount || 0);
                  const itemRaw = itemQty * itemPrice;
                  const itemVatAmt = itemVat > 0 ? (itemVat <= 100 ? (itemRaw * itemVat / 100) : itemVat) : 0;
                  return addExpense({
                    projectCode: 'OFFICE',
                    stt: String(currentProjExpenses.length + 1 + idx + 1),
                    date: cleanDate,
                    content: editingExpense.content || 'Văn phòng phẩm',
                    description: item.description || '',
                    spenderName: editingExpense.spenderName || user?.name || 'CÔNG TY',
                    unit: item.unit || '',
                    quantity: itemQty,
                    unitPrice: itemPrice,
                    taxAmount: itemVat,
                    totalAmount: Math.round(itemRaw + itemVatAmt),
                    incomeAmount: Number(item.incomeAmount || 0),
                    balanceFund: 0,
                    notes: editingExpense.notes || '',
                    invoiceUrl: editingExpense.invoiceUrl || ''
                  });
                }));
              }

              setEditingExpense(null);
              setAdditionalItems([]);
              triggerToast('Cập nhật thành công', 'success');
            } catch(e) {}
            setLoading(false);
          }} className="space-y-3 text-xs">
            {/* Same layout as new expense */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={formatDateForInput(editingExpense.date)} onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div>
                <label className="block font-bold mb-1">Người chi / Nguồn quỹ</label>
                <CustomSelect value={editingExpense.spenderName} onChange={(e) => setEditingExpense({...editingExpense, spenderName: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
                  {expenseSpenderNames.map((name, i) => (<option key={i} value={name}>{name}</option>))}
                </CustomSelect>
              </div>
              <div>
                <label className="block font-bold mb-1">Loại nội dung</label>
                <CustomSelect value={editingExpense.content} onChange={(e) => setEditingExpense({...editingExpense, content: e.target.value})} searchable={true} allowCustomInput={true} className="w-full border rounded-lg p-2 bg-white text-xs">
                  {expenseContentTypes.map((type, i) => (<option key={i} value={type}>{type}</option>))}
                </CustomSelect>
              </div>
              <div><label className="block font-bold mb-1">Diễn giải/ Chi tiết *</label><input type="text" required value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">ĐVT</label><input type="text" value={editingExpense.unit} onChange={(e) => setEditingExpense({...editingExpense, unit: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Số lượng</label><input type="number" step="any" value={editingExpense.quantity === 0 || (editingExpense.quantity as any) === '0' ? '' : editingExpense.quantity} onChange={(e) => setEditingExpense({...editingExpense, quantity: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 bg-white" placeholder="0" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" step="any" value={editingExpense.unitPrice === 0 || (editingExpense.unitPrice as any) === '0' ? '' : editingExpense.unitPrice} onChange={(e) => setEditingExpense({...editingExpense, unitPrice: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 font-bold bg-white" placeholder="0" /></div>
            </div>

            {additionalItems.map((item, index) => (
              <div key={index} className="pt-3 mt-3 border-t border-slate-200 relative">
                <button type="button" onClick={() => setAdditionalItems(prev => prev.filter((_, i) => i !== index))} className="absolute right-0 top-3 text-rose-500 hover:text-rose-700 p-1">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div><label className="block font-bold mb-1 text-slate-500">Diễn giải/ Chi tiết *</label><input type="text" required value={item.description} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].description = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block font-bold mb-1 text-slate-500">ĐVT</label><input type="text" value={item.unit} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unit = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                    <div><label className="block font-bold mb-1 text-slate-500">Số lượng</label><input type="number" step="any" value={item.quantity === 0 || (item.quantity as any) === '0' ? '' : item.quantity} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].quantity = e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" placeholder="0" /></div>
                    <div><label className="block font-bold mb-1 text-slate-500">Đơn giá</label><input type="number" step="any" value={item.unitPrice === 0 || (item.unitPrice as any) === '0' ? '' : item.unitPrice} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unitPrice = e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" placeholder="0" /></div>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button type="button" onClick={() => setAdditionalItems([...additionalItems, { description: '', unit: '', quantity: 1, unitPrice: 0, taxAmount: 0, incomeAmount: 0 }])} className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg w-fit cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">add</span> Thêm thiết bị khác
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">VAT (%)</label><input type="number" step="any" placeholder="VD: 8 hoặc 10" value={editingExpense.taxAmount === 0 || (editingExpense.taxAmount as any) === '0' ? '' : editingExpense.taxAmount} onChange={(e) => setEditingExpense({...editingExpense, taxAmount: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" step="any" value={editingExpense.incomeAmount === 0 || (editingExpense.incomeAmount as any) === '0' ? '' : editingExpense.incomeAmount} onChange={(e) => setEditingExpense({...editingExpense, incomeAmount: e.target.value === '' ? '' as any : e.target.value.replace(/^0+(?=\d)/, '') as any})} className="w-full border rounded-lg p-2 bg-white" placeholder="0" /></div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingExpense.notes} onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <ImageUpload
                label="Hóa đơn / Chứng từ chi (Hình ảnh hoặc PDF)"
                value={editingExpense.invoiceUrl}
                onChange={(url) => setEditingExpense({...editingExpense, invoiceUrl: Array.isArray(url) ? url[0] || '' : url})}
              />
            </div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => { setEditingExpense(null); setAdditionalItems([]); }} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" disabled={loading} className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold disabled:opacity-50">Lưu thay đổi</button></div>
          </form>
        )}
      </Modal>

      {/* Preview Image Modal */}
      {previewImage && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewImage(null)}
          title="Hóa Đơn / Chứng từ"
          size="full"
          defaultMaximized={true}
          icon="receipt_long"
        >
          <div className="flex flex-col flex-1 h-full min-h-0">
            <FileViewerItem url={previewImage} index={0} />
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <Modal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm(null)}
          title="Xác nhận xóa chi phí"
          icon="warning"
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-slate-700">
              Bạn có chắc chắn muốn xóa khoản chi phí <strong className="text-rose-600">"{deleteConfirm.title}"</strong> này không?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-lg font-semibold hover:bg-slate-100 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteExpense(deleteConfirm.id);
                    triggerToast('Đã xóa chi phí thành công!', 'success');
                  } catch(e) {
                    triggerToast('Lỗi khi xóa chi phí', 'warning');
                  }
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 text-xs shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
};
