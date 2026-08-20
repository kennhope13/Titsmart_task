const fs = require('fs');

const path = 'web-admin/src/pages/ActivityLogPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const thScope = `<th className="text-left p-3 bg-slate-50 w-48">Phạm vi</th>`;
const tdScope = `<td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 text-primary font-bold">
                                  <span className="material-symbols-outlined text-[13px]">
                                    {log.project === 'COMPANY' ? 'warehouse' : (!log.project || log.project === 'Hệ thống') ? 'settings' : 'business_center'}
                                  </span>
                                  {log.project === 'COMPANY' ? 'Kho Công Ty' : (!log.project || log.project === 'Hệ thống') ? 'Hệ thống' : 'Dự án'}
                                </span>
                              </td>`;

const modalScope = `<div className="flex flex-col gap-1 border-b pb-3 border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Phạm vi</span>
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">
                  {selectedLog.project === 'COMPANY' ? 'warehouse' : (!selectedLog.project || selectedLog.project === 'Hệ thống') ? 'settings' : 'business_center'}
                </span>
                {selectedLog.project === 'COMPANY' ? 'Kho Công Ty' : (!selectedLog.project || selectedLog.project === 'Hệ thống') ? 'Hệ thống' : 'Dự án'}
              </span>
            </div>`;

// Replace headers and cells
content = content.replace(thScope, '');
// Replace all \r\n to \n for easier multiline replacement
content = content.replace(/\\r\\n/g, '\\n');
content = content.replace(tdScope.replace(/\\r\\n/g, '\\n'), '');
content = content.replace(modalScope.replace(/\\r\\n/g, '\\n'), '');

// Change colSpan={6} to colSpan={5}
content = content.replace(/colSpan=\{6\}/g, 'colSpan={5}');

fs.writeFileSync(path, content, 'utf8');
console.log('Removed Phạm vi column!');
