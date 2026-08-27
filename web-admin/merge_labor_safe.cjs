const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

const combinedCashFlowCode = `
  const combinedCashFlow = useMemo(() => {
    const e = filteredProjExpenses.map(exp => ({ ...exp, isLabor: false }));
    const l = filteredProjLabor.map(lab => ({ ...lab, isLabor: true }));
    
    const combined = [...e, ...l].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return Number(a.stt || 0) - Number(b.stt || 0);
    });

    let currentBalance = 0;
    const computed = combined.map(record => {
      if (!record.isLabor) {
        currentBalance = currentBalance + Number((record as any).incomeAmount || 0) - Number(record.totalAmount || 0);
      } else {
        currentBalance = currentBalance - Number(record.totalAmount || 0);
      }
      return { ...record, autoBalance: currentBalance };
    });
    return computed.reverse();
  }, [filteredProjExpenses, filteredProjLabor]);
`;

code = code.replace(
  "  const filteredProjLabor = useMemo(() => {",
  combinedCashFlowCode + "\n  const filteredProjLabor = useMemo(() => {"
);

const tableHeaderOld = `<th className="p-3 w-12 text-center">STT</th>
                        <th className="p-3">Ngày chi</th>
                        <th className="p-3">Người phụ trách</th>
                        <th className="p-3 min-w-56">Nội dung / Diễn giải</th>
                      <th className="p-3 w-16 text-left">ĐVT</th>
                      <th className="p-3 text-right">Số lượng</th>
                      <th className="p-3 text-right">Đơn giá (đ)</th>
                      <th className="p-3 text-right">VAT</th>
                      <th className="p-3 text-right">Thành tiền (đ)</th>
                      <th className="p-3 text-right">Thực thu (đ)</th>
                      <th className="p-3 text-right">Tồn quỹ (đ)</th>
                      <th className="p-3">Ghi chú</th>
                      <th className="p-3 text-center">Hóa đơn</th>
                      <th className="p-3 text-center w-24">Thao tác</th>`;
const tableHeaderNew = `<th className="p-3 w-12 text-center">STT</th>
                        <th className="p-3 min-w-[90px]">Ngày</th>
                        <th className="p-3">Người PT / Tên LCN</th>
                        <th className="p-3 min-w-56">Nội dung / Diễn giải</th>
                      <th className="p-3 w-12 text-left">ĐVT</th>
                      <th className="p-3 text-right">SL</th>
                      <th className="p-3 text-right">Đơn giá (đ)</th>
                      <th className="p-3 text-right">VAT</th>
                      <th className="p-3 text-right min-w-[100px]">Thành tiền (đ)</th>
                      <th className="p-3 text-right min-w-[90px]">Thực thu (đ)</th>
                      <th className="p-3 text-right min-w-[100px]">Tồn quỹ (đ)</th>
                      <th className="p-3">Ghi chú / Trạng thái</th>
                      <th className="p-3 text-center">Hóa đơn/CCCD</th>
                      <th className="p-3 text-center w-24">Thao tác</th>`;
code = code.replace(tableHeaderOld, tableHeaderNew);

const tbodyOldRegex = /<tbody className="divide-y divide-slate-100 text-xs text-slate-700">[\s\S]*?<\/tbody>/;
const tbodyNew = `<tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {combinedCashFlow.map((record) => {
                      if (!record.isLabor) {
                        const exp = record as any;
                        return (
                          <tr key={'exp_'+exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingExpense(exp)}>
                            <td className="p-3 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                            <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{exp.date}</td>
                            <td className="p-3 font-semibold">{exp.spenderName || '-'}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{exp.content}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{exp.description}</div>
                            </td>
                            <td className="p-3 text-left">{exp.unit}</td>
                            <td className="p-3 text-right">{exp.quantity || '-'}</td>
                            <td className="p-3 text-right">{exp.unitPrice ? exp.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right">{exp.taxAmount ? exp.taxAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right font-bold text-rose-600">{exp.totalAmount ? exp.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">{exp.incomeAmount ? exp.incomeAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right font-bold text-slate-700">{exp.autoBalance ? exp.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="p-3 text-[11px] max-w-[150px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {exp.invoiceUrl ? (
                                <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold">Xem hóa đơn</button>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: exp.id, type: 'expense', title: 'Xóa phiếu chi', itemName: \`phiếu chi "\${exp.content}"\` })} className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        const lab = record as any;
                        return (
                          <tr key={'lab_'+lab.id} className="hover:bg-blue-50/50 bg-blue-50/20 transition-colors align-middle cursor-pointer" onClick={() => setEditingLabor({...lab, date: lab.date || new Date().toISOString().split('T')[0]})}>
                            <td className="p-3 text-center font-bold text-blue-400">{lab.stt || '-'}</td>
                            <td className="p-3 font-semibold text-blue-900 whitespace-nowrap">{lab.date}</td>
                            <td className="p-3 font-bold text-blue-800">{lab.workerName || '-'}</td>
                            <td className="p-3">
                              <div className="font-bold text-blue-900">{lab.content}</div>
                              <div className="text-[10px] text-blue-600 mt-0.5">{lab.description}</div>
                            </td>
                            <td className="p-3 text-left">{lab.unit}</td>
                            <td className="p-3 text-right">{lab.quantity || '-'}</td>
                            <td className="p-3 text-right">{lab.unitPrice ? lab.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right">-</td>
                            <td className="p-3 text-right font-bold text-rose-600">{lab.totalAmount ? lab.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">-</td>
                            <td className="p-3 text-right font-bold text-slate-700">{lab.autoBalance ? lab.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="p-3 text-[11px] max-w-[150px] truncate" title={lab.paymentStatus}>
                              <span className={\`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border \${
                                lab.paymentStatus === 'Đã thanh toán' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }\`}>
                                {lab.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-0.5">
                                {lab.idCardFrontUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardFrontUrl!); }} className="text-[9px] text-blue-600 hover:underline font-bold">CCCD trước</button>
                                ) : null}
                                {lab.idCardBackUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardBackUrl!); }} className="text-[9px] text-blue-600 hover:underline font-bold">CCCD sau</button>
                                ) : null}
                                {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">-</span>}
                              </div>
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: lab.id, type: 'labor', title: 'Xóa lương công nhật', itemName: \`chấm công "\${lab.workerName}"\` })} className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    })}
                    {combinedCashFlow.length === 0 && (
                      <tr><td colSpan={14} className="p-8 text-center text-slate-400">Chưa có giao dịch phiếu chi nào.</td></tr>
                    )}
                  </tbody>`;
                  
// ONLY REPLACE THE FIRST OCCURRENCE of tbody! Which is the Expense table.
let replacedFirstTbody = false;
code = code.replace(tbodyOldRegex, (match) => {
  if (!replacedFirstTbody) {
    replacedFirstTbody = true;
    return tbodyNew;
  }
  return match;
});

// Remove the labor block using a safer regex that leaves the closing tag intact.
const laborBlockRegex = /\s*\{\/\* 3\. LƯƠNG CÔNG NHẬT \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*(?=\}\)\}\s*<\/div>\s*\{\/\* MODALS \*\/)/;
code = code.replace(laborBlockRegex, '\n');

// Move "Thêm chấm công" button to be next to "Thêm phiếu chi"
const addExpenseButton = `<button 
                        onClick={() => setIsNewExpenseOpen(true)}
                        className="h-8 px-4 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Thêm phiếu chi
                      </button>`;
const bothButtons = `<button 
                        onClick={() => setIsNewLaborOpen(true)}
                        className="h-8 px-4 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[16px]">engineering</span>
                        Thêm chấm công
                      </button>
                      ` + addExpenseButton;
code = code.replace(addExpenseButton, bothButtons);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
