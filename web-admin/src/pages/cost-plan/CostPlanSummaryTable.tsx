import React, { useMemo } from 'react';
import { ProjectExpense, LaborPayroll } from '../../types';

interface CostPlanSummaryTableProps {
  expenses: ProjectExpense[];
  labors: LaborPayroll[];
}

const money = (value: number) => value.toLocaleString('vi-VN');

export const CostPlanSummaryTable: React.FC<CostPlanSummaryTableProps> = ({ expenses, labors }) => {
  const summary = useMemo(() => {
    const totalLabor = labors.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    
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

    const totalChi = totalProjectExpense + totalLabor;
    const tonCuoiKy = totalProjectFund - totalProjectExpense;

    return {
      totalLabor,
      totalChi,
      tonCuoiKy,
      totalProjectFund,
      totalProjectExpense,
      bySpender
    };
  }, [expenses, labors]);

  const spenderNames = Object.keys(summary.bySpender).filter(n => n !== 'KHÁC' || summary.bySpender[n].chi > 0 || summary.bySpender[n].quy > 0);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm mb-4 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-center font-bold text-slate-700 uppercase tracking-wider text-sm">
        BẢNG THEO DÕI CHI PHÍ CÔNG TRÌNH
      </div>
      <div className="p-4 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <tbody>
            <tr>
              <td className="w-1/4 align-top pr-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">CT TT CÔNG NHẬT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">{money(summary.totalLabor)}</td>
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
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">{money(summary.totalChi)}</td>
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
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">{money(summary.tonCuoiKy)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="w-1/4 align-top pl-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-blue-100 text-blue-900 font-bold py-1 px-2 text-center">QUỸ CÔNG TRÌNH</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 text-center py-1 font-semibold text-slate-800">{money(summary.totalProjectFund)}</td>
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
                      <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">{money(summary.totalProjectExpense)}</td>
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
                          <td className="border border-slate-300 text-center py-1 px-2 font-semibold text-slate-800 w-1/2">
                            {money(summary.bySpender[name].quy)}
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
