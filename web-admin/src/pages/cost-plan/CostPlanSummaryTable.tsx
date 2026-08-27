import React, { useMemo, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { ProjectExpense, LaborPayroll } from '../../types';

interface CostPlanSummaryTableProps {
  expenses: ProjectExpense[];
  labors: LaborPayroll[];
  onAllocateFund?: (spenderName: string, amount?: number) => void;
}

const money = (value: number) => value.toLocaleString('vi-VN');

export const CostPlanSummaryTable: React.FC<CostPlanSummaryTableProps> = ({ expenses, labors, onAllocateFund }) => {
  const [editingProjectFund, setEditingProjectFund] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [projectFundInput, setProjectFundInput] = useState('');
  

  

  const summary = useMemo(() => {
    const bySpender: Record<string, { chi: number; quy: number }> = {};
    let totalProjectExpense = 0;
    let totalProjectFund = 0;

    expenses.forEach((exp) => {
      
      
      const name = (exp.spenderName || '').trim() || 'KHÁC';
      if (!bySpender[name]) {
        bySpender[name] = { chi: 0, quy: 0 };
      }
      
      const chi = exp.totalAmount || 0;
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
        <div className="flex gap-3 w-full items-start justify-center">
          
          {/* QUỸ CÔNG TRÌNH */}
          <table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-1 px-2 text-[11px] font-bold text-center uppercase">QUỸ CÔNG TRÌNH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td 
                  className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    if (!editingProjectFund) {
                      setProjectFundInput(summary.totalProjectFund.toString());
                      setEditingProjectFund(true);
                    }
                  }}
                >
                  {editingProjectFund ? (
                    <input
                      autoFocus
                      type="number"
                      className="w-full text-center border-2 border-primary rounded outline-none px-1 text-slate-900"
                      value={projectFundInput}
                      onChange={e => setProjectFundInput(e.target.value)}
                      onBlur={() => {
                        setEditingProjectFund(false);
                        if (onAllocateFund && projectFundInput.trim() !== '') {
                          const val = Number(projectFundInput);
                          if (!isNaN(val) && val !== summary.totalProjectFund) {
                            onAllocateFund('__PROJECT__', val);
                          }
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-2 group">
                      <span>{money(summary.totalProjectFund)}</span>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỔNG CHI */}
          <table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-1 px-2 text-[11px] font-bold text-center uppercase">TỔNG CHI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800">
                  {money(summary.totalChi)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TỒN CUỐI KỲ */}
          <table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-1 px-2 text-[11px] font-bold text-center uppercase">TỒN CUỐI KỲ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800">
                  {money(summary.tonCuoiKy)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* CT TT CÔNG NHẬT */}
          <table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-blue-100 text-blue-900 py-1 px-2 text-[11px] font-bold text-center uppercase">CT TT CÔNG NHẬT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800">
                  {money(summary.totalLabor)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* TRÌNH */}
          <table className="border-collapse text-sm flex-1 min-w-[140px] bg-white">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-orange-200 text-orange-900 py-1 px-2 text-[11px] font-bold text-center uppercase">TRÌNH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-slate-800 relative">
                  {money(summary.totalProjectExpense)}
                  
                </td>
              </tr>
            </tbody>
          </table>

          {/* CHI TIẾT CÁ NHÂN (Button to open Modal) */}
          <table className="border-collapse text-sm w-44 shrink-0 bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowPersonalModal(true)}>
            <thead>
              <tr>
                <th className="border border-slate-300 bg-emerald-100 text-emerald-900 py-1 px-2 text-[11px] font-bold text-center uppercase">CHI TIẾT CÁ NHÂN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 text-center py-1.5 px-2 text-sm font-bold text-emerald-700 bg-emerald-50">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>Xem chi tiết</span>
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
    </div>
  );
};