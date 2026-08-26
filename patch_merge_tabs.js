const fs = require('fs');

const filePath = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// Replace tabs definition
data = data.replace(
  /\{\[\s*\{\s*id:\s*'overview'[\s\S]*?\}\s*\]\.map\(tab => \(/,
  `{[
              { id: 'overview', label: 'Thông tin Giao nhận', icon: 'local_shipping' },
              { id: 'finance', label: 'Tạm ứng & Thanh toán', icon: 'payments' }
              ].map(tab => (`
);

// We need to replace all tables from `<div className="overflow-auto custom-scrollbar flex-1">` to `</section>` with our new tables.
const tablesStart = data.indexOf('<div className="overflow-auto custom-scrollbar flex-1">');
const tablesEnd = data.indexOf('</section>', tablesStart);

const newTables = `<div className="overflow-auto custom-scrollbar flex-1">
          {activeTab === 'overview' && (
            <table className="doc-fit-table w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '7%' }} />
                {!projectId && <col style={{ width: '11%' }} />}
                <col style={{ width: !projectId ? '10%' : '14%' }} />
                <col style={{ width: !projectId ? '15%' : '19%' }} />
                <col style={{ width: !projectId ? '11%' : '14%' }} />
                <col style={{ width: !projectId ? '10%' : '13%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '7%' }} />
              </colgroup>
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                 <tr>
                   <th className="px-2 py-2 text-center">STT</th>
                   <th className="px-2 py-2 text-center">Loại</th>
                   {!projectId && <th className="px-2 py-2">Dự án</th>}
                   <th className="px-2 py-2">Số hợp đồng</th>
                   <th className="px-2 py-2">Tên hợp đồng</th>
                   <th className="px-2 py-2">Công ty / Đối tác</th>
                   <th className="px-2 py-2">Người nhận</th>
                   <th className="px-2 py-2 text-center">Ngày gửi</th>
                   <th className="px-2 py-2 text-center">Ngày nhận</th>
                   <th className="px-2 py-2 text-center">Hồ sơ</th>
                   <th className="px-2 py-2 text-center">Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-2 py-2 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                    <td className="px-2 py-2 text-center"><span className={\`px-1.5 py-0.5 rounded text-[10px] font-bold \${(track.docType || 'Giao') === 'Giao' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}\`}>{track.docType || 'Giao'}</span></td>
                    {!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>}
                    <td className="px-2 py-2 font-mono text-[11px]">{track.contractNo || '-'}</td>
                    <td className="px-2 py-2 font-extrabold text-slate-900 leading-snug">{track.contractName}</td>
                    <td className="px-2 py-2 font-bold text-slate-800">{track.company || '-'}</td>
                    <td className="px-2 py-2">
                      <div className="font-semibold text-slate-700 truncate">{track.receiverName || '-'}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{track.phone || ''}</div>
                    </td>
                    <td className="px-2 py-2 text-center"><span className={\`px-1.5 py-0.5 rounded text-[11px] font-mono \${track.sendDate ? 'bg-slate-100 text-slate-700' : 'text-slate-300'}\`}>{track.sendDate ? new Date(track.sendDate).toLocaleDateString('vi-VN') : '-'}</span></td>
                    <td className="px-2 py-2 text-center"><span className={\`px-1.5 py-0.5 rounded text-[11px] font-mono \${track.receiveDate ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-300'}\`}>{track.receiveDate ? new Date(track.receiveDate).toLocaleDateString('vi-VN') : '-'}</span></td>
                    <td className="px-2 py-2 text-center"><span className={\`text-[10px] font-bold \${track.docStatus?.includes('ký') || track.docStatus?.includes('đủ') ? 'text-emerald-700' : 'text-amber-700'}\`}>{track.docStatus || 'Chưa rõ'}</span></td>
                    
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => updateDocumentTrack(track.id, { isCompleted: !track.isCompleted })} title="Đánh dấu hoàn tất" className={\`inline-flex items-center justify-center w-7 h-7 rounded-lg \${track.isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-500'}\`}><span className="material-symbols-outlined text-base">task_alt</span></button>
                        <button onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Xóa thông tin theo dõi hồ sơ',
                            message: \`Bạn chắc chắn muốn xóa hồ sơ hợp đồng "\${track.contractNo || track.contractName || 'này'}"?\`,
                            onConfirm: () => {
                              deleteDocumentTrack(track.id);
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            },
                            isDestructive: true,
                            confirmText: 'Xóa'
                          });
                        }} title="Xóa hồ sơ" className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'finance' && (
            <table className="doc-fit-table w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '7%' }} />
                {!projectId && <col style={{ width: '12%' }} />}
                <col style={{ width: !projectId ? '10%' : '14%' }} />
                <col style={{ width: !projectId ? '16%' : '21%' }} />
                <col style={{ width: !projectId ? '12%' : '15%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '7%' }} />
              </colgroup>
               <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                 <tr>
                   <th className="px-2 py-2 text-center">STT</th>
                   <th className="px-2 py-2 text-center">Loại</th>
                   {!projectId && <th className="px-2 py-2">Dự án</th>}
                   <th className="px-2 py-2">Số hợp đồng</th>
                   <th className="px-2 py-2">Tên hợp đồng</th>
                   <th className="px-2 py-2 text-right">Giá trị HĐ (đ)</th>
                   <th className="px-2 py-2 text-center">Tạm ứng</th>
                   <th className="px-2 py-2 text-center">Thanh toán</th>
                   <th className="px-2 py-2">Ghi chú</th>
                   <th className="px-2 py-2 text-center">Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-blue-50/20 transition-colors align-top cursor-pointer" onClick={() => setEditingDoc(track)}>
                    <td className="px-2 py-2 text-center font-bold text-slate-400">{track.stt || '-'}</td>
                    <td className="px-2 py-2 text-center"><span className={\`px-1.5 py-0.5 rounded text-[10px] font-bold \${(track.docType || 'Giao') === 'Giao' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}\`}>{track.docType || 'Giao'}</span></td>
                    {!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find(p => p.id === (track as any).projectId || p.code === track.projectCode)?.name || track.projectCode || '-'}</td>}
                    <td className="px-2 py-2 font-mono text-[11px]">{track.contractNo || '-'}</td>
                    <td className="px-2 py-2 font-extrabold text-slate-900 leading-snug">{track.contractName}</td>
                    <td className="px-2 py-2 text-right font-bold text-slate-950">{(track.contractValue || 0).toLocaleString('vi-VN')}</td>
                    <td className="px-2 py-2 text-center">
                      <div className="font-bold text-blue-700">{(track.prepayPercent ? (track.prepayPercent * 100).toFixed(1) : '0')}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{(track.prepayAmount || 0).toLocaleString('vi-VN')}đ</div>
                    </td>
                    <td className="px-2 py-2 text-center"><span className={\`text-[10px] font-bold \${track.paymentStatus?.includes('Đã') ? 'text-emerald-700' : 'text-rose-700'}\`}>{track.paymentStatus || 'Chưa thanh toán'}</span></td>
                    <td className="px-2 py-2 text-[11px] text-slate-500 line-clamp-2">{track.notes || '-'}</td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => updateDocumentTrack(track.id, { isCompleted: !track.isCompleted })} title="Đánh dấu hoàn tất" className={\`inline-flex items-center justify-center w-7 h-7 rounded-lg \${track.isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-500'}\`}><span className="material-symbols-outlined text-base">task_alt</span></button>
                        <button onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Xóa thông tin theo dõi hồ sơ',
                            message: \`Bạn chắc chắn muốn xóa hồ sơ hợp đồng "\${track.contractNo || track.contractName || 'này'}"?\`,
                            onConfirm: () => {
                              deleteDocumentTrack(track.id);
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            },
                            isDestructive: true,
                            confirmText: 'Xóa'
                          });
                        }} title="Xóa hồ sơ" className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
`;

data = data.slice(0, tablesStart) + newTables + '\n      ' + data.slice(tablesEnd);

fs.writeFileSync(filePath, data);
console.log('Tabs merged');
