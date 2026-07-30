const fs = require('fs');
let s = fs.readFileSync('src/pages/TaskManagementPage.tsx', 'utf8');
s = s.replace('colSpan={8}\n                          onClick={() => handleOpenEditModal(t)}', 'colSpan={7}\n                          onClick={() => handleOpenEditModal(t)}');
const oldPurchase = `                      {/* STRICT SINGLE LINE NO WRAP PURCHASE BADGE */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={\`inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-[11px] font-bold \${
                            t.purchaseStatus === 'Đã có hàng'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.purchaseStatus === 'Đã đặt hàng'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }\`}
                        >
                          {t.purchaseStatus || 'Chưa đặt'}
                        </span>
                      </td>`;
const newPurchase = `                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <select
                          value={t.purchaseStatus || 'Chưa đặt hàng'}
                          onChange={(e) => updateTask(t.id, { purchaseStatus: e.target.value })}
                          className="w-full min-w-0 rounded border border-slate-200 bg-white px-1 py-1 text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="Chưa đặt hàng">Chưa đặt hàng</option>
                          <option value="Đang đặt hàng">Đang đặt hàng</option>
                          <option value="Đã đặt hàng">Đã đặt hàng</option>
                          <option value="Đang giao">Đang giao</option>
                          <option value="Đã nhận đủ">Đã nhận đủ</option>
                        </select>
                      </td>`;
s = s.replace(oldPurchase, newPurchase);
fs.writeFileSync('src/pages/TaskManagementPage.tsx', s, 'utf8');
