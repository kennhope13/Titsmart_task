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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">Nhật ký: {task.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Chưa có nhật ký nào.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500 font-medium">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </div>
                    <button onClick={() => onEditLogClick(log)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">edit</span> Sửa
                    </button>
                  </div>
                  {log.note && <div className="p-3 text-sm text-slate-700">{log.note}</div>}
                  {log.images && log.images.length > 0 && (
                    <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-slate-100">
                      {log.images.map((url, i) => (
                        <div key={i} className="h-24 bg-slate-100 relative group rounded overflow-hidden">
                          <img src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(url, '_blank')} />
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
      if (node.isSectionHeader) return true;
      const stt = String(node.stt || '').trim().toUpperCase();
      const notes = String(node.notes || '').toLowerCase();
      const hasNoDot = stt.length > 0 && !stt.includes('.');
      const isSecPattern = notes.includes('[section]') || /^[A-Z]{1,2}$/.test(stt) || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(stt) || (hasNoDot && /^\d+$/.test(stt));
      const hasNoVol = !node.volume || node.volume === 0;
      const unitStr = String(node.unit || '').trim();
      const hasNoUnit = !unitStr || unitStr === '' || unitStr === '-' || unitStr === '–' || unitStr === '—';
      return isSecPattern && (hasNoVol || hasNoUnit || !node.parentId);
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

              const taskLogs = logs.filter(l => l.taskId === t.id);
              const allImagesForTask = taskLogs.flatMap(l => l.images);
              const allNotesForTask = taskLogs.filter(l => l.note && l.note.trim().length > 0);

              // Unique dates for this task
              const datesList = Array.from(new Set(taskLogs.map(l => l.timestamp ? new Date(l.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '').filter(Boolean)));

              return (
                <tr key={t.id} onClick={(e) => { e.stopPropagation(); setViewAllLogsTask(t); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                  <td className={`py-3 px-3 border-r border-slate-200 text-center font-mono text-xs ${depth === 1 ? 'font-bold text-slate-600' : 'text-slate-400'}`}>
                    {t.computedStt || t.stt}
                  </td>
                  <td className={`py-3 px-4 border-r border-slate-200 ${fontStyle}`}>
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${Math.max(0, depth - 1) * 1.5}rem` }}>
                      {depth > 1 && <span className="material-symbols-outlined text-slate-300 text-sm">subdirectory_arrow_right</span>}
                      {t.name}
                    </div>
                  </td>
                  {/* CỘT THỜI GIAN THI CÔNG */}
                  <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                    <div className="flex flex-col gap-1 items-center justify-center">
                      {datesList.length > 0 ? (
                        datesList.map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded border border-blue-200/80 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[12px] text-blue-600">calendar_today</span>
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-300 text-xs italic">-</span>
                      )}
                    </div>
                  </td>
                  {/* CỘT ẢNH NHẬT KÝ */}
                  <td className="py-2.5 px-3 border-r border-slate-200">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {allImagesForTask.length > 0 ? (
                        <>
                          {allImagesForTask.slice(0, 4).map((img, i) => (
                            <div key={i} onClick={(e) => { e.stopPropagation(); openLightbox(allImagesForTask, i); }} className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shadow-xs hover:scale-105 transition-transform cursor-pointer">
                              <img src={img} className="w-full h-full object-cover" alt="nhật ký" />
                            </div>
                          ))}
                          {allImagesForTask.length > 4 && (
                            <div onClick={(e) => { e.stopPropagation(); openLightbox(allImagesForTask, 4); }} className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-extrabold text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200">
                              +{allImagesForTask.length - 4}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Chưa có ảnh</span>
                      )}
                    </div>
                  </td>
                  {/* CỘT GHI CHÚ */}
                  <td className="py-2.5 px-3 border-r border-slate-200">
                    <div className="flex flex-col gap-1.5">
                      {allNotesForTask.length > 0 ? (
                        allNotesForTask.map((l) => (
                          <div key={l.id} onClick={(e) => { e.stopPropagation(); onEditLogClick(l); }} className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 text-[11px] font-semibold px-2 py-1 rounded-md border border-amber-200/80 hover:bg-amber-100 transition-colors w-fit max-w-full cursor-pointer" title={l.note}>
                            <span className="material-symbols-outlined text-[13px] text-amber-600 shrink-0">edit_note</span>
                            <span className="truncate">{l.note}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 text-xs italic">Chưa có nội dung nhật ký</span>
                      )}
                    </div>
                  </td>
                  {/* CỘT NGƯỜI CẬP NHẬT */}
                  <td className="py-2.5 px-3 border-r border-slate-200">
                    <AuditInfoCell updatedBy={taskLogs[0]?.updatedBy || t.updatedBy} updatedAt={taskLogs[0]?.updatedAt || t.updatedAt} />
                  </td>
                  {/* CỘT THAO TÁC */}
                  <td className="py-2.5 px-3 text-center">
                    <button onClick={(e) => { e.stopPropagation(); onAddLogClick(t.id); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-primary hover:border-primary hover:bg-blue-50 text-xs font-bold transition-all shadow-2xs">
                      <span className="material-symbols-outlined text-base">add_a_photo</span>
                      <span>Thêm ảnh</span>
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
