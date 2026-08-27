const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

// 1. Replace Table Headers
const tableHeaderRegex = /<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-\[10px\] font-bold text-slate-500 uppercase tracking-wider">[\s\S]*?<\/thead>/;

const newHeader = `<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  <tr>
                    <th className="px-1.5 py-2 w-8 text-center">STT</th>
                    <th className="px-1.5 py-2 w-[70px]">Ngày</th>
                    <th className="px-1.5 py-2 min-w-[90px]">Người PT/Tên</th>
                    <th className="px-1.5 py-2 min-w-[120px]">Nội dung / Diễn giải</th>
                    <th className="px-1.5 py-2 w-10 text-left">ĐVT</th>
                    <th className="px-1.5 py-2 w-10 text-right">SL</th>
                    <th className="px-1.5 py-2 text-right">Đơn giá</th>
                    <th className="px-1.5 py-2 text-right">VAT</th>
                    <th className="px-1.5 py-2 text-right min-w-[85px]">Thành tiền</th>
                    <th className="px-1.5 py-2 text-right min-w-[85px]">Thực thu</th>
                    <th className="px-1.5 py-2 text-right min-w-[85px]">Tồn quỹ</th>
                    <th className="px-1.5 py-2 min-w-[110px]">TK & Người nhận</th>
                    <th className="px-1.5 py-2 min-w-[80px]">Ghi chú</th>
                    <th className="px-1.5 py-2 w-[70px]">Tình trạng</th>
                    <th className="px-1.5 py-2 text-center w-[50px]">H.Đơn</th>
                    <th className="px-1.5 py-2 text-center w-[50px]">CCCD</th>
                    <th className="px-1.5 py-2 text-center w-14">Xóa</th>
                  </tr>
                </thead>`;

code = code.replace(tableHeaderRegex, newHeader);

// 2. Replace tbody wrapper class
code = code.replace(
  /<tbody className="divide-y divide-slate-100 text-xs text-slate-700">/,
  `<tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">`
);

// 3. Replace table body cells
// I need to globally replace ` className="p-3 ` with ` className="px-1.5 py-2 ` inside the tbody block.
// But to be safe, I'll just write the entire tbody template out again.
const tbodyRegex = /<tbody className="divide-y divide-slate-100 text-\[11px\] text-slate-700">[\s\S]*?<\/tbody>/;

const newBody = `<tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 leading-tight">
                    {combinedCashFlow.map((record) => {
                      if (!record.isLabor) {
                        const exp = record as any;
                        return (
                          <tr key={'exp_'+exp.id} className="hover:bg-slate-50/50 transition-colors align-middle cursor-pointer" onClick={() => setEditingExpense(exp)}>
                            <td className="px-1.5 py-2 text-center font-bold text-slate-400">{exp.stt || '-'}</td>
                            <td className="px-1.5 py-2 font-semibold text-slate-900 whitespace-nowrap">{exp.date ? exp.date.substring(2) : '-'}</td>
                            <td className="px-1.5 py-2 font-semibold line-clamp-2" title={exp.spenderName}>{exp.spenderName || '-'}</td>
                            <td className="px-1.5 py-2">
                              <div className="font-bold text-slate-900 line-clamp-1" title={exp.content}>{exp.content}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5 line-clamp-1" title={exp.description}>{exp.description}</div>
                            </td>
                            <td className="px-1.5 py-2 text-left">{exp.unit}</td>
                            <td className="px-1.5 py-2 text-right">{exp.quantity || '-'}</td>
                            <td className="px-1.5 py-2 text-right whitespace-nowrap">{exp.unitPrice ? exp.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-1.5 py-2 text-right whitespace-nowrap">{exp.taxAmount ? exp.taxAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-1.5 py-2 text-right font-bold text-rose-600 whitespace-nowrap">{exp.totalAmount ? exp.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-1.5 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">{exp.incomeAmount ? exp.incomeAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-1.5 py-2 text-right font-bold text-slate-700 whitespace-nowrap">{exp.autoBalance ? exp.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="px-1.5 py-2 text-slate-400">-</td>
                            <td className="px-1.5 py-2 text-[10px] max-w-[100px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                            <td className="px-1.5 py-2 text-slate-400">-</td>
                            <td className="px-1.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              {exp.invoiceUrl ? (
                                <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold whitespace-nowrap">Xem</button>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-1.5 py-2 text-slate-400 text-center">-</td>
                            <td className="px-1.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: exp.id, type: 'expense', title: 'Xóa phiếu chi', itemName: \`phiếu chi "\${exp.content}"\` })} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      } else {
                        const lab = record as any;
                        return (
                          <tr key={'lab_'+lab.id} className="hover:bg-blue-50/50 bg-blue-50/20 transition-colors align-middle cursor-pointer" onClick={() => setEditingLabor({...lab, date: lab.date || new Date().toISOString().split('T')[0]})}>
                            <td className="px-1.5 py-2 text-center font-bold text-blue-400">{lab.stt || '-'}</td>
                            <td className="px-1.5 py-2 font-semibold text-blue-900 whitespace-nowrap">{lab.date ? lab.date.substring(2) : '-'}</td>
                            <td className="px-1.5 py-2 font-bold text-blue-800 line-clamp-2" title={lab.workerName}>{lab.workerName || '-'}</td>
                            <td className="px-1.5 py-2">
                              <div className="font-bold text-blue-900 line-clamp-1" title={lab.content}>{lab.content}</div>
                              <div className="text-[9px] text-blue-600 mt-0.5 line-clamp-1" title={lab.description}>{lab.description}</div>
                            </td>
                            <td className="px-1.5 py-2 text-left">{lab.unit}</td>
                            <td className="px-1.5 py-2 text-right">{lab.quantity || '-'}</td>
                            <td className="px-1.5 py-2 text-right whitespace-nowrap">{lab.unitPrice ? lab.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-1.5 py-2 text-right text-slate-400">-</td>
                            <td className="px-1.5 py-2 text-right font-bold text-rose-600 whitespace-nowrap">{lab.totalAmount ? lab.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="px-1.5 py-2 text-right text-slate-400">-</td>
                            <td className="px-1.5 py-2 text-right font-bold text-slate-700 whitespace-nowrap">{lab.autoBalance ? lab.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="px-1.5 py-2">
                              <div className="font-bold text-slate-900 line-clamp-1" title={lab.bankInfo}>{lab.bankInfo}</div>
                              <div className="font-mono text-[9px] text-slate-500 mt-0.5 whitespace-nowrap">{lab.bankAccount}</div>
                            </td>
                            <td className="px-1.5 py-2 text-slate-400">-</td>
                            <td className="px-1.5 py-2 text-[10px]" title={lab.paymentStatus}>
                              <span className={\`inline-flex px-1 py-0.5 rounded text-[8px] whitespace-nowrap font-bold border \${
                                lab.paymentStatus === 'Đã thanh toán' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }\`}>
                                {lab.paymentStatus === 'Đã thanh toán' ? 'Đã T.Toán' : 'Chưa T.Toán'}
                              </span>
                            </td>
                            <td className="px-1.5 py-2 text-slate-400 text-center">-</td>
                            <td className="px-1.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-0.5">
                                {lab.idCardFrontUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardFrontUrl!); }} className="text-[9px] text-blue-600 hover:underline font-bold whitespace-nowrap">M.trước</button>
                                ) : null}
                                {lab.idCardBackUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardBackUrl!); }} className="text-[9px] text-blue-600 hover:underline font-bold whitespace-nowrap">M.sau</button>
                                ) : null}
                                {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">-</span>}
                              </div>
                            </td>
                            <td className="px-1.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: lab.id, type: 'labor', title: 'Xóa lương công nhật', itemName: \`chấm công "\${lab.workerName}"\` })} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    })}
                    {combinedCashFlow.length === 0 && (
                      <tr><td colSpan={17} className="p-8 text-center text-slate-400">Chưa có giao dịch phiếu chi nào.</td></tr>
                    )}
                  </tbody>`;

code = code.replace(tbodyRegex, newBody);
fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
