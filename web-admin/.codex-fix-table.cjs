const fs = require('fs');
let s = fs.readFileSync('src/pages/TaskManagementPage.tsx', 'utf8');
s = s.replace('colSpan={8}', 'colSpan={9}');
s = s.replace(/\n\s*<td className="py-2 px-2\.5 whitespace-nowrap">\s*<select\s*value=\{t\.assignedEngineerId \|\| engineers\[0\]\?\.id \|\| ''\}[\s\S]*?<\/select>\s*<\/td>/, '');
s = s.replace(/<td className="py-2 px-2\.5 text-center text-slate-600 text-\[11px\] whitespace-nowrap">\s*<span[\s\S]*?\{t\.purchaseStatus \|\| 'Chưa đặt'\}\s*<\/span>\s*<\/td>/, `<td className="py-2 px-2.5 text-center whitespace-nowrap">
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
                      </td>`);
s = s.replace(/<td className="py-2 px-2\.5 text-center text-slate-600 text-\[11px\] whitespace-nowrap">\s*\{t\.constrStatus \|\| 'Chưa làm'\}\s*<\/td>/, `<td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <select
                          value={t.constrStatus || 'Chưa thi công'}
                          onChange={(e) => updateTask(t.id, { constrStatus: e.target.value })}
                          className="w-full min-w-0 rounded border border-slate-200 bg-white px-1 py-1 text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="Chưa thi công">Chưa thi công</option>
                          <option value="Đang thi công">Đang thi công</option>
                          <option value="Đã thi công">Đã thi công</option>
                          <option value="Đang ETE">Đang ETE</option>
                          <option value="Vướng mắc">Vướng mắc</option>
                        </select>
                      </td>`);
fs.writeFileSync('src/pages/TaskManagementPage.tsx', s, 'utf8');
