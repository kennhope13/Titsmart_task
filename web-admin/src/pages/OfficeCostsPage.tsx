import React, { useState, useMemo, useRef } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, hasPermission } from '../services/authStore';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { CustomSelect } from '../components/common/CustomSelect';
import { CostPlanSummaryTable } from './cost-plan/CostPlanSummaryTable';

export const OfficeCostsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { expenses, addExpense, updateExpense, deleteExpense } = useRealtimeStore();

  const currentProjExpenses = useMemo(() => expenses.filter(e => e.projectCode === 'OFFICE').sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()), [expenses]);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'info' }>({ show: false, message: '', type: 'success' });
  const triggerToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [expenseFilterSpender, setExpenseFilterSpender] = useState('all');
  const [expenseFilterContent, setExpenseFilterContent] = useState('all');
  const [expenseFilterUnit, setExpenseFilterUnit] = useState('all');
  const [expenseFilterDateFrom, setExpenseFilterDateFrom] = useState('');
  const [expenseFilterDateTo, setExpenseFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [newExpenseData, setNewExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    content: 'Văn phòng phẩm',
    description: '',
    spenderName: '',
    unit: 'cái',
    quantity: 1,
    unitPrice: 0,
    taxAmount: 0,
    incomeAmount: 0,
    notes: '',
    invoiceUrl: ''
  });

  const [additionalItems, setAdditionalItems] = useState<any[]>([]);

  const expenseContentTypes = useMemo(() => {
    const types = new Set<string>();
    types.add('Quỹ Công Trình');
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
    currentProjExpenses.forEach(e => { if (e.spenderName) names.add(e.spenderName.trim()); });
    return Array.from(names).sort();
  }, [currentProjExpenses]);

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

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-50 overflow-hidden relative">
      <section className="border-b border-slate-200 bg-white pl-3 pr-14 py-4 md:py-0 md:h-12 flex items-center justify-between gap-4 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div><h2 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">CHI PHÍ VĂN PHÒNG</h2></div>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission(user, 'EDIT_EXPENSES') && (
            <button
              onClick={() => setIsNewExpenseOpen(true)}
              className="bg-primary text-white h-[40px] px-5 rounded-lg text-[13px] font-bold hover:opacity-90 flex items-center gap-2 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Thêm chi phí mới
            </button>
          )}
        </div>
      </section>
      <div className="flex-1 overflow-auto p-4 custom-scrollbar flex flex-col gap-4">
        
        {/* TỔNG QUAN CHI PHÍ */}
        <div className="shrink-0 w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
          <CostPlanSummaryTable
            expenses={currentProjExpenses}
            labors={[]}
            onAllocateFund={(name: string, amount?: number) => {
              if (name === 'KHAC') return;
              let targetName = name;
              if (name === '__PROJECT__') targetName = 'CÔNG TY';

              const inputAmount = window.prompt(`Nhập số tiền muốn cấp cho ${targetName} (VND):`, '');
              if (!inputAmount) return;
              const fundVal = parseFloat(inputAmount.replace(/,/g, ''));
              if (isNaN(fundVal) || fundVal <= 0) {
                triggerToast('Số tiền không hợp lệ!', 'warning');
                return;
              }

              addExpense({
                projectCode: 'OFFICE',
                stt: String(currentProjExpenses.length + 1),
                date: new Date().toISOString().split('T')[0],
                content: 'Quỹ Công Trình',
                description: `Cấp quỹ cho ${targetName}`,
                spenderName: targetName,
                unit: 'lần',
                quantity: 1,
                unitPrice: fundVal,
                taxAmount: 0,
                totalAmount: fundVal,
                incomeAmount: fundVal,
                balanceFund: 0,
                notes: 'Tự động cấp quỹ'
              });
              triggerToast(`Đã cấp quỹ ${fundVal.toLocaleString('vi-VN')} đ cho ${targetName}!`, 'success');
            }}
          />
        </div>

        {/* BẢNG CHI PHÍ */}
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="flex items-center gap-3 p-3 bg-white border-b border-slate-200 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium whitespace-nowrap text-xs">Bộ lọc:</span>
              <CustomSelect
                value={expenseFilterSpender}
                onChange={e => setExpenseFilterSpender(e.target.value)}
                className="min-w-[120px] max-w-[200px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs"
              >
                <option value="all">Tất cả người chi</option>
                {expenseSpenderNames.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </CustomSelect>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_month</span>
              <div className="flex items-center gap-1">
                <input type="date" value={expenseFilterDateFrom} onChange={e => setExpenseFilterDateFrom(e.target.value)} className="bg-transparent border-none outline-none text-xs w-[95px] text-slate-700 cursor-pointer" />
                <span className="text-slate-300">|</span>
                <span className="text-slate-400 font-medium whitespace-nowrap text-[11px]">Đến</span>
                <input type="date" value={expenseFilterDateTo} onChange={e => setExpenseFilterDateTo(e.target.value)} className="bg-transparent border-none outline-none text-xs w-[95px] text-slate-700 cursor-pointer" />
              </div>
            </div>

            <div className="relative w-48 shrink-0 ml-auto">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-100 border-none rounded text-xs focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
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
                  {hasPermission(user, 'EDIT_EXPENSES') && <th className="px-2 py-1.5 text-center w-[40px]"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px] text-slate-700 leading-tight">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => { if (hasPermission(user, 'EDIT_EXPENSES')) setEditingExpense(exp); }}>
                    <td className="px-2 py-1.5 font-semibold text-slate-900 whitespace-nowrap">{exp.date ? exp.date.substring(2) : '-'}</td>
                    <td className="px-2 py-1.5 font-semibold line-clamp-2" title={exp.spenderName}>{exp.spenderName || '-'}</td>
                    <td className="px-2 py-1.5">
                      <div className="font-bold text-slate-900 line-clamp-1" title={exp.content}>{exp.content}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={exp.description}>{exp.description}</div>
                    </td>
                    <td className="px-2 py-1.5 text-left">{exp.unit}</td>
                    <td className="px-2 py-1.5 text-right">{exp.quantity || '-'}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{exp.unitPrice ? exp.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{exp.taxAmount ? exp.taxAmount.toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-rose-600 whitespace-nowrap">{exp.totalAmount ? exp.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-emerald-600 whitespace-nowrap">{exp.incomeAmount ? exp.incomeAmount.toLocaleString('vi-VN') : '-'}</td>
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {exp.invoiceUrl ? (
                        <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold whitespace-nowrap">Xem</button>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] max-w-[100px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                    {hasPermission(user, 'EDIT_EXPENSES') && (
                      <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => {
                          if (window.confirm('Xóa chi phí này?')) {
                            deleteExpense(exp.id);
                            triggerToast('Đã xóa', 'success');
                          }
                        }} className="text-slate-400 hover:text-rose-500 p-1">
                          <span className="material-symbols-outlined text-[16px] block">delete</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-2 py-8 text-center text-slate-500">Không có dữ liệu chi phí nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* NEW EXPENSE MODAL */}
      <Modal isOpen={isNewExpenseOpen} onClose={() => setIsNewExpenseOpen(false)} title="Thêm Chi Phí Mới">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const qty = Number(newExpenseData.quantity || 1);
            const price = Number(newExpenseData.unitPrice || 0);
            const vat = Number(newExpenseData.taxAmount || 0);
            const total = qty * price + vat;

            await addExpense({
              projectCode: 'OFFICE',
              stt: String(currentProjExpenses.length + 1),
              date: newExpenseData.date,
              content: newExpenseData.content,
              description: newExpenseData.description,
              spenderName: newExpenseData.spenderName,
              unit: newExpenseData.unit,
              quantity: qty,
              unitPrice: price,
              taxAmount: vat,
              totalAmount: total,
              incomeAmount: Number(newExpenseData.incomeAmount || 0),
              balanceFund: 0,
              notes: newExpenseData.notes,
              invoiceUrl: newExpenseData.invoiceUrl
            });
            setIsNewExpenseOpen(false);
            setNewExpenseData({...newExpenseData, description: '', unitPrice: 0, taxAmount: 0, incomeAmount: 0, notes: '', invoiceUrl: ''});
            triggerToast('Đã thêm thành công!', 'success');
          } catch (err) {
            triggerToast('Lỗi khi lưu', 'warning');
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
            <div><label className="block font-bold mb-1">Số lượng</label><input type="number" step="any" value={newExpenseData.quantity} onChange={(e) => setNewExpenseData({...newExpenseData, quantity: (e.target.value as any)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" step="any" value={newExpenseData.unitPrice} onChange={(e) => setNewExpenseData({...newExpenseData, unitPrice: (e.target.value as any)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" step="any" value={newExpenseData.taxAmount} onChange={(e) => setNewExpenseData({...newExpenseData, taxAmount: (e.target.value as any)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" step="any" value={newExpenseData.incomeAmount} onChange={(e) => setNewExpenseData({...newExpenseData, incomeAmount: (e.target.value as any)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div>
              <label className="block font-bold mb-1 text-slate-500">Tổng cộng (Tạm tính)</label>
              <div className="w-full border rounded-lg p-2 bg-slate-50 font-black text-rose-600">
                {((Number(newExpenseData.quantity || 1) * Number(newExpenseData.unitPrice || 0)) + Number(newExpenseData.taxAmount || 0)).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
          <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={newExpenseData.notes} onChange={(e) => setNewExpenseData({...newExpenseData, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
          <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewExpenseOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" disabled={loading} className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold disabled:opacity-50">Lưu phiếuchi</button></div>
        </form>
      </Modal>

      {/* EDIT EXPENSE MODAL */}
      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Cập nhật Phiếu Chi">
        {editingExpense && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const qty = Number(editingExpense.quantity || 1);
              const price = Number(editingExpense.unitPrice || 0);
              const vat = Number(editingExpense.taxAmount || 0);
              const total = qty * price + vat;
              await updateExpense(editingExpense.id, { ...editingExpense, totalAmount: total });
              setEditingExpense(null);
              triggerToast('Cập nhật thành công', 'success');
            } catch(e) {}
            setLoading(false);
          }} className="space-y-3 text-xs">
            {/* Same layout as new expense */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold mb-1">Ngày chi *</label><input type="date" required value={editingExpense.date} onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
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
              <div><label className="block font-bold mb-1">Số lượng</label><input type="number" step="any" value={editingExpense.quantity} onChange={(e) => setEditingExpense({...editingExpense, quantity: (e.target.value as any)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Đơn giá</label><input type="number" step="any" value={editingExpense.unitPrice} onChange={(e) => setEditingExpense({...editingExpense, unitPrice: (e.target.value as any)})} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold mb-1">VAT (đ)</label><input type="number" step="any" value={editingExpense.taxAmount} onChange={(e) => setEditingExpense({...editingExpense, taxAmount: (e.target.value as any)})} className="w-full border rounded-lg p-2 bg-white" /></div>
              <div><label className="block font-bold mb-1">Thực thu (đ)</label><input type="number" step="any" value={editingExpense.incomeAmount} onChange={(e) => setEditingExpense({...editingExpense, incomeAmount: (e.target.value as any)})} className="w-full border rounded-lg p-2 bg-white" /></div>
            </div>
            <div><label className="block font-bold mb-1">Ghi chú</label><input type="text" value={editingExpense.notes} onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})} className="w-full border rounded-lg p-2 bg-white" /></div>
            <div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" disabled={loading} className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold disabled:opacity-50">Lưu thay đổi</button></div>
          </form>
        )}
      </Modal>

      {/* Preview Image Modal */}
      {previewImage && (
        <Modal isOpen={true} onClose={() => setPreviewImage(null)} title="Hóa Đơn / Chứng từ">
          <img src={previewImage} alt="Hoa don" className="max-w-full max-h-[80vh] object-contain" />
        </Modal>
      )}

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
};
