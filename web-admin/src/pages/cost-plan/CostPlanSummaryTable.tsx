import React, { useMemo, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { ProjectExpense, LaborPayroll } from '../../types';

interface CostPlanSummaryTableProps {
  expenses: ProjectExpense[];
  labors: LaborPayroll[];
  onAllocateFund?: (spenderName: string, amount?: number, date?: string) => void;
}

const money = (value: number) => value.toLocaleString('vi-VN');

export const CostPlanSummaryTable: React.FC<CostPlanSummaryTableProps> = ({ expenses, labors, onAllocateFund }) => {
  const [showAddFundModal, setShowAddFundModal] = useState(false);
  const [fundAmountInput, setFundAmountInput] = useState('');
  const [fundDateInput, setFundDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [editingProjectFund, setEditingProjectFund] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);

  const handleSaveFundModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAllocateFund && fundAmountInput.trim() !== '') {
      const addedVal = Number(fundAmountInput.replace(/[,.]/g, ''));
      if (!isNaN(addedVal) && addedVal > 0) {
        const newTotalFund = summary.totalProjectFund + addedVal;
        onAllocateFund('__PROJECT__', newTotalFund, fundDateInput);
      }
    }
    setShowAddFundModal(false);
    setFundAmountInput('');
  };
  

  

  const summary = useMemo(() => {
    const bySpender: Record<string, { chi: number; quy: number }> = {};
    let totalProjectExpense = 0;
    let totalProjectFund = 0;

    expenses.forEach((exp) => {
      
      
      const name = (exp.spenderName || '').trim() || 'KHÁC';
      if (!bySpender[name]) {
        bySpender[name] = { chi: 0, quy: 0 };
      }
      
      const isFundRow = (exp.content || '').trim().toLowerCase() === 'quỹ';
      const chi = isFundRow ? 0 : (exp.totalAmount || 0);
      const quy = exp.incomeAmount || 0;
      
      bySpender[name].chi += chi;
      bySpender[name].quy += quy;
      
      totalProjectExpense += chi;
      totalProjectFund += quy;
    });

    const totalChi = totalProjectExpense;
    const tonCuoiKy = totalProjectFund - totalProjectExpense;

    const totalLabor = labors.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    return {
      bySpender,
      totalProjectExpense,
      totalProjectFund,
      totalChi,
      tonCuoiKy,
      totalLabor
    };
  }, [expenses, labors]);

  const spenderNames = Object.keys(summary.bySpender).filter(n => n !== 'KHÁC' || summary.bySpender[n].chi > 0 || summary.bySpender[n].quy > 0);

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="flex gap-1 md:gap-3 w-full items-start justify-center p-1 md:p-0">
          
          {/* QUỸ */}
          <table className="border-collapse text-xs md:text-sm flex-1 min-w-[70px] md:min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-0.5 md:py-1 px-1 md:px-2 text-[10px] md:text-[11px] font-bold text-center uppercase whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <span>QUỸ</span>
                    {onAllocateFund && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFundAmountInput('');
                          setFundDateInput(new Date().toISOString().split('T')[0]);
                          setShowAddFundModal(true);
                        }}
                        className="inline-flex items-center justify-center p-0.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Thêm / Nạp Quỹ"
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">add_circle</span>
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-0.5 md:py-1.5 px-1 md:px-2 text-xs md:text-sm font-bold text-slate-800">
                  <span>{money(summary.totalProjectFund)}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỔNG CHI */}
          <table className="border-collapse text-xs md:text-sm flex-1 min-w-[70px] md:min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-0.5 md:py-1 px-1 md:px-2 text-[10px] md:text-[11px] font-bold text-center uppercase whitespace-nowrap">TỔNG CHI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-0.5 md:py-1.5 px-1 md:px-2 text-xs md:text-sm font-bold text-slate-800">
                  {money(summary.totalChi)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỒN CUỐI KỲ */}
          <table className="border-collapse text-xs md:text-sm flex-1 min-w-[70px] md:min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-0.5 md:py-1 px-1 md:px-2 text-[10px] md:text-[11px] font-bold text-center uppercase whitespace-nowrap">TỒN CUỐI KỲ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-0.5 md:py-1.5 px-1 md:px-2 text-xs md:text-sm font-bold text-slate-800">
                  {money(summary.tonCuoiKy)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TRÌNH */}
          <table className="border-collapse text-xs md:text-sm flex-1 min-w-[70px] md:min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-orange-200 text-orange-900 py-0.5 md:py-1 px-1 md:px-2 text-[10px] md:text-[11px] font-bold text-center uppercase whitespace-nowrap">TRÌNH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-0.5 md:py-1.5 px-1 md:px-2 text-xs md:text-sm font-bold text-slate-800 relative">
                  {money(summary.totalProjectExpense)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* CHI TIẾT CÁ NHÂN (Button to open Modal) */}
          <table className="border-collapse text-xs md:text-sm w-28 md:w-44 shrink-0 bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowPersonalModal(true)}>
            <thead>
              <tr>
                <th className="border border-slate-300 bg-emerald-100 text-emerald-900 py-0.5 md:py-1 px-1 md:px-2 text-[10px] md:text-[11px] font-bold text-center uppercase whitespace-nowrap">CHI TIẾT CÁ NHÂN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-0.5 md:py-1.5 px-1 md:px-2 text-xs md:text-sm font-bold text-emerald-700 bg-emerald-50">
                  <div className="flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px] md:text-[18px]">group</span>
                    <span className="hidden sm:inline">Xem chi tiết</span>
                    <span className="sm:hidden text-[11px]">Xem</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>

      <Modal isOpen={showPersonalModal} onClose={() => setShowPersonalModal(false)} title="CHI TIẾT QUỸ CÁ NHÂN" size="xl">
        <div className="flex flex-wrap gap-4 p-2 items-start justify-center">
          {spenderNames.length === 0 && (
            <div className="text-slate-500 italic py-4">Chưa có dữ liệu quỹ cá nhân.</div>
          )}
          {spenderNames.map((name, idx) => {
            const ton = summary.bySpender[name].quy - summary.bySpender[name].chi;
            const colorClass = idx % 3 === 0 ? 'bg-red-100 text-red-800' : idx % 3 === 1 ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800';
            
            return (
              <React.Fragment key={name}>
                {/* TỔNG CHI CÁ NHÂN */}
                <table className="border-collapse text-sm w-44 shrink-0 bg-white shadow-sm">
                  <thead>
                    <tr>
                      <th className={`border border-slate-300 py-1 px-2 text-[10px] font-bold text-center ${colorClass}`}>
                        TỔNG CHI ({name})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800">
                        {money(summary.bySpender[name].chi)}
                        
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* TỒN QUỸ CÁ NHÂN */}
                <table className="border-collapse text-sm w-44 shrink-0 bg-white shadow-sm">
                  <thead>
                    <tr>
                      <th className={`border border-slate-300 py-1 px-2 text-[10px] font-bold text-center ${colorClass}`}>
                        TỒN QUỸ ({name})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800">
                        {money(ton)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* TỔNG QUỸ CÁ NHÂN */}
                <table className="border-collapse text-sm w-44 shrink-0 bg-white shadow-sm">
                  <thead>
                    <tr>
                      <th className={`border border-slate-300 py-1 px-2 text-[10px] font-bold text-center ${colorClass}`}>
                        TỔNG QUỸ ({name})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td 
                        className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          if (onAllocateFund) onAllocateFund(name);
                        }}
                      >
                        <div className="flex items-center justify-center gap-2 group">
                          <span>{money(summary.bySpender[name].quy)}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </React.Fragment>
            );
          })}
        </div>
      </Modal>

      <Modal isOpen={showAddFundModal} onClose={() => setShowAddFundModal(false)} title="THÊM / NẠP QUỸ CÔNG TRÌNH" size="md">
        <form onSubmit={handleSaveFundModal} className="p-4 space-y-4">
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-medium">Quỹ ban đầu / hiện tại:</span>
              <span className="font-bold text-slate-800 text-sm">{money(summary.totalProjectFund)} VNĐ</span>
            </div>
            
            {fundAmountInput.trim() !== '' && !isNaN(Number(fundAmountInput.replace(/[,.]/g, ''))) && Number(fundAmountInput.replace(/[,.]/g, '')) > 0 && (
              <>
                <div className="flex justify-between items-center text-emerald-600 border-t border-blue-100 pt-2">
                  <span className="font-medium">Nạp thêm:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    + {money(Number(fundAmountInput.replace(/[,.]/g, '')))} VNĐ
                  </span>
                </div>
                <div className="flex justify-between items-center text-blue-900 border-t border-blue-200/60 pt-2 font-bold">
                  <span>Tổng quỹ sau khi nạp:</span>
                  <span className="text-base text-blue-700">
                    {money(summary.totalProjectFund + Number(fundAmountInput.replace(/[,.]/g, '')))} VNĐ
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày nạp *
              </label>
              <input
                type="date"
                required
                value={fundDateInput}
                onChange={(e) => setFundDateInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhập số tiền nạp thêm (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={fundAmountInput}
                onChange={(e) => setFundAmountInput(e.target.value)}
                placeholder="Ví dụ: 5000000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddFundModal(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold text-xs hover:opacity-90 transition-opacity shadow-xs"
            >
              Lưu Quỹ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
