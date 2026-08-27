const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

const tableHeaderRegex = /<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-\[10px\] font-bold text-slate-500 uppercase tracking-wider">[\s\S]*?<\/thead>/;

const newHeader = `<thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3 min-w-[90px]">Ngày</th>
                    <th className="p-3 min-w-[120px]">Người PT / Họ tên</th>
                    <th className="p-3 min-w-56">Nội dung / Diễn giải</th>
                    <th className="p-3 w-12 text-left">ĐVT</th>
                    <th className="p-3 text-right">SL</th>
                    <th className="p-3 text-right">Đơn giá (đ)</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3 text-right min-w-[100px]">Thành tiền (đ)</th>
                    <th className="p-3 text-right min-w-[90px]">Thực thu (đ)</th>
                    <th className="p-3 text-right min-w-[100px]">Tồn quỹ (đ)</th>
                    <th className="p-3 min-w-[150px]">Tài khoản & Người nhận</th>
                    <th className="p-3 min-w-[100px]">Ghi chú</th>
                    <th className="p-3 min-w-[100px]">Tình trạng</th>
                    <th className="p-3 text-center">Hóa đơn</th>
                    <th className="p-3 text-center">CCCD</th>
                    <th className="p-3 text-center w-24">Thao tác</th>
                  </tr>
                </thead>`;

code = code.replace(tableHeaderRegex, newHeader);

const tbodyRegex = /<tbody className="divide-y divide-slate-100 text-xs text-slate-700">[\s\S]*?<\/tbody>/;

const newBody = `<tbody className="divide-y divide-slate-100 text-xs text-slate-700">
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
                            <td className="p-3 text-slate-400">-</td>
                            <td className="p-3 text-[11px] max-w-[150px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                            <td className="p-3 text-slate-400">-</td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {exp.invoiceUrl ? (
                                <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold">Xem hóa đơn</button>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-3 text-slate-400 text-center">-</td>
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
                            <td className="p-3 text-right text-slate-400">-</td>
                            <td className="p-3 text-right font-bold text-rose-600">{lab.totalAmount ? lab.totalAmount.toLocaleString('vi-VN') : '-'}</td>
                            <td className="p-3 text-right text-slate-400">-</td>
                            <td className="p-3 text-right font-bold text-slate-700">{lab.autoBalance ? lab.autoBalance.toLocaleString('vi-VN') : '0'}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{lab.bankInfo}</div>
                              <div className="font-mono text-[10px] text-slate-500 mt-0.5">{lab.bankAccount}</div>
                            </td>
                            <td className="p-3 text-slate-400">-</td>
                            <td className="p-3 text-[11px] truncate" title={lab.paymentStatus}>
                              <span className={\`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border \${
                                lab.paymentStatus === 'Đã thanh toán' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }\`}>
                                {lab.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-center">-</td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-0.5">
                                {lab.idCardFrontUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardFrontUrl!); }} className="text-[9px] text-blue-600 hover:underline font-bold">Mặt trước</button>
                                ) : null}
                                {lab.idCardBackUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardBackUrl!); }} className="text-[9px] text-blue-600 hover:underline font-bold">Mặt sau</button>
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
                      <tr><td colSpan={17} className="p-8 text-center text-slate-400">Chưa có giao dịch phiếu chi nào.</td></tr>
                    )}
                  </tbody>`;

code = code.replace(tbodyRegex, newBody);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
