const fs = require('fs');

const pageFile = 'src/pages/ProjectCostPlanPage.tsx';
let pageCode = fs.readFileSync(pageFile, 'utf8');

// 1. Reorder expense body
pageCode = pageCode.replace(
  /<td className="px-2 py-2\.5 text-\[10px\] max-w-\[100px\] truncate" title=\{exp\.notes\}>\{exp\.notes \|\| '-'\}<\/td>\s*<td className="px-2 py-2\.5 text-slate-400">-<\/td>\s*<td className="px-2 py-2\.5 text-center" onClick=\{\(e\) => e\.stopPropagation\(\)\}>\s*\{exp\.invoiceUrl \? \([\s\S]*?\) : <span className="text-slate-300">-<\/span>\}\s*<\/td>\s*<td className="px-2 py-2\.5 text-slate-400 text-center">-<\/td>\s*<td className="px-2 py-2\.5 text-center" onClick=\{\(e\) => e\.stopPropagation\(\)\}>\s*<button onClick=\{\(\) => setDeleteConfirm\([\s\S]*?<\/button>\s*<\/td>/g,
  `<td className="px-2 py-2.5 text-slate-400">-</td>
                            <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              {exp.invoiceUrl ? (
                                <button onClick={() => setPreviewImage(exp.invoiceUrl!)} className="text-[10px] text-primary hover:underline font-bold whitespace-nowrap">Xem</button>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-2 py-2.5 text-slate-400 text-center">-</td>
                            <td className="px-2 py-2.5 text-[10px] max-w-[100px] truncate" title={exp.notes}>{exp.notes || '-'}</td>
                            <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: exp.id, type: 'expense', title: 'Xóa phiếu chi', itemName: \`phiếu chi "\${exp.content}"\` })} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </td>`
);


// 2. Reorder labor body
pageCode = pageCode.replace(
  /<td className="px-2 py-2\.5 text-slate-400">-<\/td>\s*<td className="px-2 py-2\.5 text-\[10px\]" title=\{lab\.paymentStatus\}>[\s\S]*?<\/td>\s*<td className="px-2 py-2\.5 text-slate-400 text-center">-<\/td>\s*<td className="px-2 py-2\.5 text-center" onClick=\{\(e\) => e\.stopPropagation\(\)\}>[\s\S]*?<\/div>\s*<\/td>\s*<td className="px-2 py-2\.5 text-center" onClick=\{\(e\) => e\.stopPropagation\(\)\}>\s*<button onClick=\{\(\) => setDeleteConfirm\([\s\S]*?<\/button>\s*<\/td>/g,
  `<td className="px-2 py-2.5 text-[10px]" title={lab.paymentStatus}>
                              <span className={\`inline-flex px-1 py-0.5 rounded text-[10px] whitespace-nowrap font-bold border \${
                                lab.paymentStatus === 'Đã thanh toán' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 border-amber-200'
                              }\`}>
                                {lab.paymentStatus === 'Đã thanh toán' ? 'Đã T.Toán' : 'Chưa T.Toán'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-slate-400 text-center">-</td>
                            <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-0.5">
                                {lab.idCardFrontUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardFrontUrl!); }} className="text-[10px] text-blue-600 hover:underline font-bold whitespace-nowrap">M.trước</button>
                                ) : null}
                                {lab.idCardBackUrl ? (
                                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage(lab.idCardBackUrl!); }} className="text-[10px] text-blue-600 hover:underline font-bold whitespace-nowrap">M.sau</button>
                                ) : null}
                                {!lab.idCardFrontUrl && !lab.idCardBackUrl && <span className="text-slate-300">-</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-slate-400">-</td>
                            <td className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, id: lab.id, type: 'labor', title: 'Xóa công nhật', itemName: \`công nhật "\${lab.workerName}"\` })} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors" title="Xóa">
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </td>`
);

fs.writeFileSync(pageFile, pageCode);
console.log('Reordered Ghi chu for both bodies');
