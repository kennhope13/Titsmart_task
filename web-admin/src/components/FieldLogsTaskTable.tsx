import React, { useMemo, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { FieldLog, Task } from '../types';
import { compareTaskStt } from '../utils/taskTreeUtils';
import { AuditInfoCell } from './common/AuditInfoCell';

const CustomLightbox: React.FC<{ images: string[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void }> = ({
  images, index, onClose, onPrev, onNext,
}) => (
  <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400"><span className="material-symbols-outlined text-4xl">close</span></button>
    <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={index === 0} className="absolute left-4 text-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-5xl">chevron_left</span></button>
    <img src={images[index]} className="max-w-full max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
    <button onClick={(e) => { e.stopPropagation(); onNext(); }} disabled={index === images.length - 1} className="absolute right-4 text-white hover:text-primary disabled:opacity-50"><span className="material-symbols-outlined text-5xl">chevron_right</span></button>
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-mono">{index + 1} / {images.length}</div>
  </div>
);

const TaskLogsModal: React.FC<{ task: Task; logs: FieldLog[]; onClose: () => void; onEditLogClick: (log: FieldLog) => void; onDeleteLogClick?: (log: FieldLog) => void }> = ({
  task, logs, onClose, onEditLogClick
}) => {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[96vw] max-w-[96vw] h-[94vh] flex flex-col overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-[#F0F5FF]">
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-[#0F294A] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#0F294A]">edit_note</span>
              Nhật ký hiện trường
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">{task.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {logs.length === 0 ? (
            <p className="text-slate-400 text-center py-12 text-sm italic">Chưa có nhật ký nào.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {logs.map((log) => (
                <div key={log.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs flex flex-col">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-blue-600">schedule</span>
                      {new Date(log.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <button onClick={() => onEditLogClick(log)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 hover:bg-blue-100 transition-colors">
                      <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa
                    </button>
                  </div>
                  {log.note && (
                    <div className="p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words font-normal font-sans">
                      {log.note}
                    </div>
                  )}
                  {log.images && log.images.length > 0 && (
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-100 bg-slate-50/50">
                      {log.images.map((url, i) => (
                        <div key={i} onClick={() => setLightboxImg(url)} className="h-28 bg-slate-100 relative group rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-2xs">
                          <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="ảnh nhật ký" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-lg">visibility</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightboxImg && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 text-white hover:text-red-400">
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>
          <img src={lightboxImg} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};


interface FieldLogsTaskTableProps {
  selectedProject: string;
  logs: FieldLog[];
  onAddLogClick: (taskId: string) => void;
  onEditLogClick: (log: FieldLog) => void;
  onDeleteLogClick?: (log: FieldLog) => void;
}

export const FieldLogsTaskTable: React.FC<FieldLogsTaskTableProps> = ({ selectedProject, logs, onAddLogClick, onEditLogClick, onDeleteLogClick }) => {
  const { tasks } = useRealtimeStore();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [lightboxImages, setLightboxImages] = useState<{ src: string }[]>([]);
  const [viewAllLogsTask, setViewAllLogsTask] = useState<Task | null>(null);

  const displayTasks = useMemo(() => {
    return tasks.filter(t => t.projectCode === selectedProject);
  }, [tasks, selectedProject]);

  const groupedTasks = useMemo(() => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // Synthesize missing parent section headers if any child items exist (e.g. 33.1 without 33)
    const sttSet = new Set(displayTasks.map(t => String(t.stt || '').trim()));
    const missingParents: any[] = [];
    displayTasks.forEach(t => {
      const stt = String(t.stt || '').trim();
      if (stt.includes('.')) {
        const parts = stt.split('.');
        parts.pop();
        const parentStt = parts.join('.');
        if (parentStt && !sttSet.has(parentStt)) {
          sttSet.add(parentStt);
          let synthName = '';
          if (parentStt === '33') {
            synthName = 'HỆ THỐNG THÔNG TIN LIÊN LẠC DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM, NHÀ THẦU VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRƯỜNG';
          } else if (parentStt === '36') {
            synthName = 'HỆ THỐNG SCADA DO BÊN A CUNG CẤP TẠI KHO TỔNG CÔNG TY ĐIỆN LỰC MIỀN NAM, NHÀ THẦU VẬN CHUYỂN VÀ LẮP ĐẶT HOÀN THIỆN TẠI CÔNG TRƯỜNG';
          } else {
            synthName = `HẠNG MỤC ${parentStt}`;
          }

          missingParents.push({
            id: `synth_field_${parentStt}`,
            stt: parentStt,
            name: synthName,
            projectCode: t.projectCode,
            projectName: t.projectName,
            isSectionHeader: true,
            sectionName: t.sectionName,
            parentId: t.parentId,
            volume: 0,
            unit: '',
            progress: 0,
            status: 'Chưa làm',
            notes: '[section]'
          });
        }
      }
    });

    const fullTasks = [...missingParents, ...displayTasks];
    fullTasks.forEach((t) => map.set(t.id, { ...t, children: [] }));

    const resolveParentId = (item: any) => {
      if (item.parentId && map.has(item.parentId)) return item.parentId;
      if (item.stt && item.stt.includes('.')) {
        const parts = item.stt.split('.');
        parts.pop();
        const parentStt = parts.join('.');
        const parentItem = fullTasks.find((r) => r.stt === parentStt);
        if (parentItem && map.has(parentItem.id)) return parentItem.id;
      }
      return item.parentId;
    };

    fullTasks.forEach((t) => {
      const resolvedParentId = resolveParentId(t);
      if (resolvedParentId && map.has(resolvedParentId)) {
        map.get(resolvedParentId)!.children.push(map.get(t.id));
      } else {
        roots.push(map.get(t.id));
      }
    });

    let currentSectionKey = '';
    const isTaskSectionHeader = (node: any) => {
      const vol = Number(node.volume || 0);
      const unitVal = String(node.unit || '').trim();
      // QUY TẮC ĐƠN GIẢN VÀ TRIỆT ĐỂ:
      // Nếu Khối lượng (0/rỗng) VÀ Đơn vị tính (rỗng) -> BẮT BUỘC LÀ ĐẦU MỤC (SECTION HEADER / FOLDER)
      return vol === 0 && unitVal === '';
    };

    const flattened: any[] = [];
    const flattenTree = (nodes: any[], currentDepth: number = 0) => {
      nodes.sort((a, b) => {
        const sttCompare = compareTaskStt(a.stt, b.stt);
        if (sttCompare !== 0) return sttCompare;
        return a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
      });

      nodes.forEach((node) => {
        const isSec = isTaskSectionHeader(node);
        if (isSec) {
          currentSectionKey = node.sectionName || node.name || '';
        }

        let displayDepth = currentDepth;
        if (currentDepth === 0 && !isSec && currentSectionKey !== '') {
          displayDepth = 1;
        }

        flattened.push({
          ...node,
          isSectionHeader: isSec,
          depth: displayDepth,
          _sectionKey: currentSectionKey || 'Khác'
        });

        flattenTree(node.children, displayDepth + 1);
      });
    };

    flattenTree(roots, 0);
    return flattened;
  }, [displayTasks]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  const openLightbox = (imgs: string[], index: number) => {
    setLightboxImages(imgs.map(url => ({ src: url })));
    setLightboxIndex(index);
  };

  return (
    <div className="flex-1 overflow-auto bg-white pb-24">
      <table className="w-full text-left text-sm text-slate-600 border-collapse">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0 z-20 shadow-sm border-b border-slate-200">
          <tr>
            <th className="py-3 px-3 border-r border-slate-200 w-16 text-center">STT</th>
            <th className="py-3 px-4 border-r border-slate-200">NỘI DUNG CÔNG VIỆC</th>
            <th className="py-3 px-3 border-r border-slate-200 w-36 text-center">THỜI GIAN THI CÔNG</th>
            <th className="py-3 px-3 border-r border-slate-200 w-72">ẢNH NHẬT KÝ VẬN HÀNH</th>
            <th className="py-3 px-3 border-r border-slate-200 w-64">NỘI DUNG NHẬT KÝ / THI CÔNG HỆ THỐNG</th>
            <th className="py-3 px-3 border-r border-slate-200 w-40">NGƯỜI CẬP NHẬT</th>
            <th className="py-3 px-3 w-28 text-center">THAO TÁC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {groupedTasks.length === 0 ? (
            <tr><td colSpan={7} className="p-8 text-center text-slate-400">Không có công việc nào</td></tr>
          ) : (
            groupedTasks.filter((t) => {
              if (t.isSectionHeader) return true;
              return !collapsedSections.has(t._sectionKey || '');
            }).map((t) => {
              if (t.isSectionHeader) {
                const isCollapsed = collapsedSections.has(t._sectionKey || '');
                return (
                  <tr key={t.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                    <td className="py-3 px-3 border-r border-blue-200 text-center font-mono text-xs">{t.computedStt || t.stt}</td>
                    <td colSpan={6} className="py-3 px-4 font-extrabold text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSection(t._sectionKey || '')}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                        >
                          <span className={`material-symbols-outlined text-base transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                        </button>
                        <span className="material-symbols-outlined text-base flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                        <span className="flex-1 uppercase">{t.name}</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              const depth = t.depth || 0;
              let fontStyle = "font-medium text-slate-700 text-[13px]";
              if (depth === 1) fontStyle = "font-bold text-slate-900 text-sm";
              else if (depth === 2) fontStyle = "font-semibold text-slate-800 text-[13px]";

              const taskLogs = logs.filter(l => l.taskId === t.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              const allImagesForTask = taskLogs.flatMap(l => l.images);
              const allNotesForTask = taskLogs.filter(l => l.note && l.note.trim().length > 0);

              // Group logs by Date (YYYY-MM-DD or DD/MM/YYYY) for clear multi-day tracking
              const logsByDate = new Map<string, FieldLog[]>();
              taskLogs.forEach(l => {
                const dateKey = l.timestamp ? new Date(l.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Khác';
                const arr = logsByDate.get(dateKey) || [];
                arr.push(l);
                logsByDate.set(dateKey, arr);
              });
              const dateEntries = Array.from(logsByDate.entries());

              return (
                <tr key={t.id} onClick={(e) => { e.stopPropagation(); setViewAllLogsTask(t); }} className="hover:bg-blue-50/30 transition-colors group cursor-pointer border-b border-slate-100">
                  <td className={`py-3.5 px-3 border-r border-slate-200 text-center font-mono text-xs ${depth === 1 ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
                    {t.computedStt || t.stt}
                  </td>
                  <td className={`py-3.5 px-4 border-r border-slate-200 ${fontStyle}`}>
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${Math.max(0, depth - 1) * 1.5}rem` }}>
                      {depth > 1 && <span className="material-symbols-outlined text-slate-300 text-sm">subdirectory_arrow_right</span>}
                      <span className="text-slate-800 leading-snug">{t.name}</span>
                      {taskLogs.length > 0 && (
                        <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0" title={`${taskLogs.length} lần cập nhật`}>
                          {taskLogs.length} nhật ký ({dateEntries.length} ngày)
                        </span>
                      )}
                    </div>
                  </td>
                  {/* CỘT THỜI GIAN THI CÔNG (DIỄN RA NHIỀU NGÀY) */}
                  <td className="py-3 px-3 border-r border-slate-200 text-center">
                    <div className="flex flex-col gap-1.5 items-center justify-center">
                      {dateEntries.length > 0 ? (
                        dateEntries.map(([dateStr, dayLogs], i) => (
                          <div 
                            key={i} 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setViewAllLogsTask(t);
                            }}
                            className="flex items-center gap-1.5 bg-blue-50/80 text-blue-900 hover:bg-blue-100/90 text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs whitespace-nowrap cursor-pointer transition-colors group/date"
                            title={`Xem chi tiết nhật ký ngày ${dateStr}`}
                          >
                            <span className="material-symbols-outlined text-sm text-blue-600 group-hover/date:scale-110 transition-transform">calendar_today</span>
                            <span className="font-mono">{dateStr}</span>
                            <span className="text-[10px] bg-blue-600 text-white rounded-full w-4 h-4 inline-flex items-center justify-center font-bold">
                              {dayLogs.length}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </div>
                  </td>
                  {/* CỘT ẢNH NHẬT KÝ VẬN HÀNH */}
                  <td className="py-3 px-3 border-r border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      {allImagesForTask.length > 0 ? (
                        <>
                          {allImagesForTask.slice(0, 4).map((img, i) => (
                            <div key={i} onClick={(e) => { e.stopPropagation(); openLightbox(allImagesForTask, i); }} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer relative group/img bg-slate-100">
                              <img src={img} className="w-full h-full object-cover" alt="nhật ký hiện trường" />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-base">visibility</span>
                              </div>
                            </div>
                          ))}
                          {allImagesForTask.length > 4 && (
                            <div onClick={(e) => { e.stopPropagation(); openLightbox(allImagesForTask, 4); }} className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-blue-100 shadow-2xs">
                              +{allImagesForTask.length - 4}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Chưa có ảnh</span>
                      )}
                    </div>
                  </td>
                  {/* CỘT NỘI DUNG NHẬT KÝ - THEO DÕI GỌN GÀNG VÀ CHUYÊN NGHIỆP */}
                  <td className="py-3 px-3 border-r border-slate-200">
                    <div className="flex flex-col gap-2">
                      {dateEntries.length > 0 ? (
                        dateEntries.slice(0, 2).map(([dateStr, dayLogs]) => {
                          const latestLog = dayLogs[0];
                          const extraLogsCount = dayLogs.length - 1;
                          return (
                            <div key={dateStr} className="flex flex-col gap-1 bg-slate-50/90 p-2 rounded-lg border border-slate-200/80">
                              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center justify-between border-b border-slate-200 pb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm text-blue-600">event</span>
                                  <span>NGÀY {dateStr}</span>
                                </div>
                                {dayLogs.length > 1 && (
                                  <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-1.5 py-0.2 rounded">
                                    {dayLogs.length} lượt
                                  </span>
                                )}
                              </div>
                              {latestLog && (
                                <div 
                                  onClick={(e) => { e.stopPropagation(); onEditLogClick(latestLog); }} 
                                  className="flex items-start gap-2 bg-white text-slate-800 text-xs p-2 rounded-lg border border-slate-200/90 hover:border-blue-400 transition-all cursor-pointer shadow-2xs group/log"
                                  title="Bấm để xem/sửa nhật ký này"
                                >
                                  <span className="material-symbols-outlined text-base text-amber-500 shrink-0 mt-0.5">edit_note</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="line-clamp-2 break-words leading-relaxed text-slate-700 font-normal">
                                      {latestLog.note || '(Chỉ có ảnh hiện trường)'}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                      {latestLog.images && latestLog.images.length > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                          <span className="material-symbols-outlined text-xs">photo_camera</span>
                                          {latestLog.images.length} ảnh
                                        </span>
                                      )}
                                      {extraLogsCount > 0 && (
                                        <span className="text-[10px] text-slate-500 font-semibold italic">
                                          +{extraLogsCount} cập nhật khác
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 text-xs italic">Chưa có nội dung nhật ký</span>
                      )}
                      {dateEntries.length > 2 && (
                        <div className="text-center pt-0.5">
                          <span className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                            + Xem thêm {dateEntries.length - 2} ngày khác...
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  {/* CỘT NGƯỜI CẬP NHẬT */}
                  <td className="py-3 px-3 border-r border-slate-200">
                    <AuditInfoCell updatedBy={taskLogs[0]?.updatedBy || t.updatedBy} updatedAt={taskLogs[0]?.updatedAt || t.updatedAt} />
                  </td>
                  {/* CỘT THAO TÁC */}
                  <td className="py-3 px-3 text-center">
                    <button onClick={(e) => { e.stopPropagation(); onAddLogClick(t.id); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-semibold transition-all shadow-2xs">
                      <span className="material-symbols-outlined text-base text-blue-600">add_a_photo</span>
                      <span>Thêm nhật ký</span>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>


      {lightboxIndex >= 0 && (
        <CustomLightbox 
          images={lightboxImages.map(img => img.src)} 
          index={lightboxIndex} 
          onClose={() => setLightboxIndex(-1)} 
          onPrev={() => setLightboxIndex(prev => prev - 1)} 
          onNext={() => setLightboxIndex(prev => prev + 1)} 
        />
      )}

      {viewAllLogsTask && (
        <TaskLogsModal
          task={viewAllLogsTask}
          logs={logs.filter(l => l.taskId === viewAllLogsTask.id)}
          onClose={() => setViewAllLogsTask(null)}
          onEditLogClick={(log) => {
            setViewAllLogsTask(null);
            onEditLogClick(log);
          }}
        />
      )}
    </div>
  );
};
