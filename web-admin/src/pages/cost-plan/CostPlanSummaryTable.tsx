import React, { useMemo, useState } from 'react';
import { ProjectExpense, LaborPayroll } from '../../types';

interface CostPlanSummaryTableProps {
  expenses: ProjectExpense[];
  labors: LaborPayroll[];
  onAllocateFund?: (spenderName: string, amount?: number) => void;
}

const money = (value: number) => value.toLocaleString('vi-VN');

export const CostPlanSummaryTable: React.FC<CostPlanSummaryTableProps> = ({ expenses, labors, onAllocateFund }) => {
  const [editingProjectFund, setEditingProjectFund] = useState(false);
  const [projectFundInput, setProjectFundInput] = useState('');
  const [filterContent, setFilterContent] = useState('all');

  const contentOptions = useMemo(() => {
    return ['all', ...Array.from(new Set(expenses.map(e => e.content).filter(Boolean)))];
  }, [expenses]);

  const summary = useMemo(() => {
    const bySpender: Record<string, { chi: number; quy: number }> = {};
    let totalProjectExpense = 0;
    let totalProjectFund = 0;

    expenses.forEach((exp) => {
      if (filterContent !== 'all' && exp.content !== filterContent) return;
      
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
  }, [expenses, labors, filterContent]);

  const spenderNames = Object.keys(summary.bySpender).filter(n => n !== 'KHÁC' || summary.bySpender[n].chi > 0 || summary.bySpender[n].quy > 0);

  return (
    <div className="w-full bg-white mb-4">
      <div className="flex justify-end mb-3 items-center gap-2">
        <label className="text-sm font-bold text-slate-600">Lọc theo nội dung:</label>
        <select 
          value={filterContent} 
          onChange={(e) => setFilterContent(e.target.value)}
          className="border border-slate-300 rounded px-3 py-1 text-sm text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          {contentOptions.map(opt => (
            <option key={opt} value={opt}>{opt === 'all' ? 'Tất cả nội dung' : opt}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <tbody>
            <tr>
              <td className="w-1/4 align-top pr-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">QUỸ CÔNG TRÌNH</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td 
                        className="border border-slate-300 text-center py-1 font-semibold text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
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
              </td>
              <td className="w-1/4 align-top px-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">TỔNG CHI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">
                        {money(summary.totalChi)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="w-1/4 align-top px-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">TỒN CUỐI KỲ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">
                        {money(summary.tonCuoiKy)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="w-1/4 align-top pl-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">CT TT CÔNG NHẬT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">
                        {money(summary.totalLabor)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="h-4"></td>
            </tr>
            <tr>
              <td className="align-top pr-2">
                <table className="w-full border-collapse h-full">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 bg-orange-200 text-orange-900 font-bold py-1 px-2 text-center w-1/2">TRÌNH</td>
                      <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">
                        {money(summary.totalProjectExpense)}
                        <div className="w-full h-1 bg-slate-100 mt-1">
                          <div className="h-full bg-orange-400" style={{ width: summary.totalProjectFund > 0 ? `${Math.min(100, (summary.totalProjectExpense / summary.totalProjectFund) * 100)}%` : '0%' }}></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="align-top px-2" colSpan={3}>
                <div className="grid grid-cols-3 gap-4">
                  <table className="w-full border-collapse">
                    <tbody>
                      {spenderNames.map((name, idx) => (
                        <tr key={"chi-" + name}>
                          <td className={"border border-slate-300 py-1 px-2 font-bold text-center w-1/2 " + (idx % 3 === 0 ? 'bg-red-100 text-red-800' : idx % 3 === 1 ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800')}>
                            TỔNG CHI ({name.toUpperCase()})
                          </td>
                          <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">
                            {money(summary.bySpender[name].chi)}
                            <div className="w-full h-1 bg-slate-100 mt-1">
                              <div className="h-full bg-rose-400" style={{ width: summary.bySpender[name].quy > 0 ? `${Math.min(100, (summary.bySpender[name].chi / summary.bySpender[name].quy) * 100)}%` : '0%' }}></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <table className="w-full border-collapse">
                    <tbody>
                      {spenderNames.map((name, idx) => {
                        const ton = summary.bySpender[name].quy - summary.bySpender[name].chi;
                        return (
                          <tr key={"ton-" + name}>
                            <td className={"border border-slate-300 py-1 px-2 font-bold text-center w-1/2 " + (idx % 3 === 0 ? 'bg-red-100 text-red-800' : idx % 3 === 1 ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800')}>
                              TỒN QUỸ ({name.toUpperCase()})
                            </td>
                            <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">
                              {money(ton)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <table className="w-full border-collapse">
                    <tbody>
                      {spenderNames.map((name, idx) => (
                        <tr key={"quy-" + name}>
                          <td className={"border border-slate-300 py-1 px-2 font-bold text-center w-1/2 " + (idx % 3 === 0 ? 'bg-red-100 text-red-800' : idx % 3 === 1 ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800')}>
                            TỔNG QUỸ ({name.toUpperCase()})
                          </td>
                          <td 
                            className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => {
                              if (onAllocateFund) onAllocateFund(name);
                            }}
                          >
                            <div className="flex items-center justify-center gap-2 group">
                              <span>{money(summary.bySpender[name].quy)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
