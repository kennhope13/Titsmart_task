import React, { useMemo, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';
import { FieldLog, Task } from '../types';
import { compareTaskStt } from '../utils/taskTreeUtils';

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
    const groups: { [key: string]: Task[] } = {};
    const order: string[] = [];
    displayTasks.forEach((t) => {
      const sec = t.sectionName || 'Khác';
      if (!groups[sec]) {
        groups[sec] = [];
        order.push(sec);
      }
      groups[sec].push(t);
    });

    order.sort((a, b) => {
      const leftHeader = groups[a].find((task) => task.isSectionHeader) || groups[a][0];
      const rightHeader = groups[b].find((task) => task.isSectionHeader) || groups[b][0];
      return compareTaskStt(leftHeader?.stt, rightHeader?.stt);
    });

    const flattened: any[] = [];
    order.forEach((sec) => {
      const sectionHeader = groups[sec].find(t => t.isSectionHeader);
      const items = groups[sec].filter(t => !t.isSectionHeader);
      
      const resolveParentId = (item: any) => {
          if (item.stt && item.stt.includes('.')) {
            const parts = item.stt.split('.');
            parts.pop();
            const parentStt = parts.join('.');
            const parentItem = items.find((r: any) => r.stt === parentStt);
            if (parentItem) return parentItem.id;
          }
          return item.parentId;
        };

        const map = new Map<string, any>();
        const roots: any[] = [];
        items.forEach(t => map.set(t.id, { ...t, children: [] }));
        items.forEach(t => {
          const resolvedParentId = resolveParentId(t);
          if (resolvedParentId && map.has(resolvedParentId)) {
            map.get(resolvedParentId)!.children.push(map.get(t.id));
          } else {
            roots.push(map.get(t.id));
          }
        });
      
      const flattenTree = (nodes: any[], depth: number = 0, prefix: string = '', sectionKey: string = '') => {
        nodes.sort((a, b) => {
          const sttCompare = compareTaskStt(a.stt, b.stt);
          if (sttCompare !== 0) return sttCompare;
          return a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
        });
        nodes.forEach((node, idx) => {
          const currentNum = (idx + 1).toString();
          const computedStt = node.stt || (depth === 1 ? currentNum : (depth > 1 ? `${prefix}.${currentNum}` : currentNum));
          flattened.push({ ...node, depth, computedStt, _sectionKey: sectionKey });
          flattenTree(node.children, depth + 1, computedStt, sectionKey);
        });
      };
      
      if (sectionHeader) {
        flattened.push({ ...sectionHeader, depth: 0, computedStt: sectionHeader.stt || '', _sectionKey: sec });
      }
      flattenTree(roots, sectionHeader ? 1 : 0, '', sec);
    });
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
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0 z-20 shadow-sm">
          <tr>
            <th className="py-3 px-4 border-b border-slate-200 w-16 text-center">STT</th>
            <th className="py-3 px-4 border-b border-slate-200">NỘI DUNG</th>
            <th className="py-3 px-4 border-b border-slate-200 w-96">ẢNH NHẬT KÝ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {groupedTasks.length === 0 ? (
            <tr><td colSpan={3} className="p-8 text-center text-slate-400">Không có công việc nào</td></tr>
          ) : (
            groupedTasks.filter((t) => {
              if (t.isSectionHeader) return true;
              return !collapsedSections.has(t._sectionKey || '');
            }).map((t) => {
              if (t.isSectionHeader) {
                const isCollapsed = collapsedSections.has(t._sectionKey || '');
                return (
                  <tr key={t.id} className="bg-blue-50/90 border-t-2 border-b border-blue-200 font-bold text-primary">
                    <td className="py-3 px-4 border-r border-blue-200 text-center font-mono text-xs">{t.computedStt || t.stt}</td>
                    <td colSpan={2} className="py-3 px-4 font-extrabold text-xs">
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

              return (
                <tr key={t.id} onClick={(e) => { e.stopPropagation(); setViewAllLogsTask(t); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                  <td className={`py-3 px-4 border-r border-slate-200 text-center font-mono text-xs ${depth === 1 ? 'font-bold text-slate-600' : 'text-slate-400'}`}>
                    {t.computedStt || t.stt}
                  </td>
                  <td className={`py-3 px-4 ${fontStyle}`}>
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${Math.max(0, depth - 1) * 1.5}rem` }}>
                      {depth > 1 && <span className="material-symbols-outlined text-slate-300 text-sm">subdirectory_arrow_right</span>}
                      {t.name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center flex-wrap gap-2">
                      {allImagesForTask.length > 0 ? (
                        <>
                          <div className="flex gap-1.5 flex-wrap">
                            {allImagesForTask.slice(0, 4).map((img, i) => (
                              <div key={i}  className="w-10 h-10 rounded overflow-hidden border border-slate-200 cursor-pointer hover:border-primary">
                                <img src={img} className="w-full h-full object-cover" alt="log" />
                              </div>
                            ))}
                            {allImagesForTask.length > 4 && (
                              <div  className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 cursor-pointer">
                                +{allImagesForTask.length - 4}
                              </div>
                            )}
                          </div>
                          {taskLogs.map(l => (
                             l.note && (
                                <button key={l.id} onClick={(e) => { e.stopPropagation(); onEditLogClick(l); }} className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 ml-1 hover:bg-amber-100 truncate max-w-[120px]" title={l.note}>
                                  {l.note}
                                </button>
                             )
                          ))}
                          <button onClick={(e) => { e.stopPropagation(); onAddLogClick(t.id); }} className="w-10 h-10 rounded flex items-center justify-center border border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary transition-colors hover:bg-primary/5 ml-1" title="Thêm ảnh">
                            <span className="material-symbols-outlined text-lg">add_a_photo</span>
                          </button>
                        </>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); onAddLogClick(t.id); }} className="w-10 h-10 rounded flex items-center justify-center border border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary transition-colors hover:bg-primary/5" title="Thêm ảnh">
                          <span className="material-symbols-outlined text-lg">add_a_photo</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="bg-emerald-100 p-3 text-center text-xs font-bold text-emerald-800 border-t border-emerald-200 mt-4">
        --- HẾT DANH SÁCH (Tổng: {groupedTasks.length} mục) ---
      </div>

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
