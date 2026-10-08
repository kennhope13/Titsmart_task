import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore, canManageItem } from '../services/authStore';
import { FieldLog, Task } from '../types';
import { compareTaskStt } from '../utils/taskTreeUtils';
import { AuditInfoCell, parseAuditTime } from './common/AuditInfoCell';

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
  task, logs, onClose, onEditLogClick, onDeleteLogClick
}) => {
  const { user } = useAuthStore();
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
              {logs.map((log) => {
                const canManage = canManageItem(user, log);
                return (
                  <div key={log.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-600">schedule</span>
                        {new Date(log.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {log.createdByName && (
                          <span className="ml-2 text-[11px] font-normal text-slate-500">
                            (Đăng bởi: <strong className="font-semibold text-slate-700">{log.createdByName}</strong>)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onEditLogClick(log)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">
                          <span className="material-symbols-outlined text-sm">{canManage ? 'edit' : 'visibility'}</span> {canManage ? 'Chỉnh sửa' : 'Xem chi tiết'}
                        </button>
                        {canManage && onDeleteLogClick && (
                          <button onClick={() => onDeleteLogClick(log)} className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-sm">delete</span> Xóa
                          </button>
                        )}
                      </div>
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
                );
              })}
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
  searchQuery?: string;
  logs: FieldLog[];
  onAddLogClick: (taskId: string) => void;
  onEditLogClick: (log: FieldLog) => void;
  onDeleteLogClick?: (log: FieldLog) => void;
}

export const FieldLogsTaskTable: React.FC<FieldLogsTaskTableProps> = ({ selectedProject, searchQuery = '', logs, onAddLogClick, onEditLogClick, onDeleteLogClick }) => {
  const tasks = useRealtimeStore(s => s.tasks);
  const [searchParams] = useSearchParams();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isScrolledHorizontally, setIsScrolledHorizontally] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [lightboxImages, setLightboxImages] = useState<{ src: string }[]>([]);
  const [viewAllLogsTask, setViewAllLogsTask] = useState<Task | null>(null);

  const displayTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.projectCode === selectedProject);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = searchQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      filtered = filtered.filter(t => {
        const rawMatch = (t.stt || '').toLowerCase().includes(q) || (t.name || '').toLowerCase().includes(q);
        if (rawMatch) return true;
        const cleanName = (t.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return cleanName.includes(cleanQ);
      });
    }
    return filtered;
  }, [tasks, selectedProject, searchQuery]);



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
          const parentItem = tasks.find(d => d.projectCode === t.projectCode && String(d.stt || '').trim() === parentStt);
          const siblingWithSection = tasks.find(d => d.projectCode === t.projectCode && (String(d.stt || '').startsWith(parentStt + '.') || String(d.stt || '').trim() === parentStt) && (d.sectionName || d.name));
          if (parentItem && (parentItem.name || parentItem.sectionName)) {
            synthName = parentItem.name || parentItem.sectionName || '';
          } else if (siblingWithSection && (siblingWithSection.sectionName || siblingWithSection.name)) {
            synthName = siblingWithSection.sectionName || siblingWithSection.name || '';
          } else if (t.sectionName && t.sectionName.trim()) {
            synthName = t.sectionName;
          } else {
            synthName = parentStt;
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

    const isTaskSectionHeader = (node: any) => {
      if (node?.isSectionHeader) return true;
      const vol = Number(node?.volume || 0);
      const unitVal = String(node?.unit || '').trim();
      return vol === 0 && unitVal === '';
    };

    const resolveParentId = (item: any) => {
      if (item.parentId && map.has(item.parentId)) return item.parentId;
      if (item.stt && item.stt.includes('.')) {
        const parts = item.stt.split('.');
        parts.pop();
        const parentStt = parts.join('.');
        const parentItem = fullTasks.find((r) => r.stt === parentStt && (r.sectionName === item.sectionName || isTaskSectionHeader(r)));
        if (parentItem && map.has(parentItem.id)) return parentItem.id;
      }
      if (!isTaskSectionHeader(item) && item.sectionName && item.sectionName.trim().length > 0) {
        const secHeader = fullTasks.find(x => 
          (x.projectCode || '') === (item.projectCode || '') &&
          x.id !== item.id &&
          isTaskSectionHeader(x) &&
          (x.name?.trim().toLowerCase() === item.sectionName.trim().toLowerCase() ||
           x.sectionName?.trim().toLowerCase() === item.sectionName.trim().toLowerCase())
        );
        if (secHeader && map.has(secHeader.id)) return secHeader.id;
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

  const highlightParam = searchParams.get('highlight') || searchParams.get('taskName') || searchParams.get('name') || '';
  const taskIdParam = searchParams.get('taskId') || searchParams.get('id') || '';

  useEffect(() => {
    if (!highlightParam && !taskIdParam) return;

    const normalizeText = (str?: string) =>
      String(str || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const hLow = highlightParam.toLowerCase().trim();
    const cleanHLow = normalizeText(highlightParam);

    const target = groupedTasks.find(t => {
      if (taskIdParam && (t.id === taskIdParam || String(t.id).toLowerCase() === taskIdParam.toLowerCase())) return true;
      if (highlightParam) {
        const nameLow = (t.name || '').toLowerCase();
        const cleanName = normalizeText(t.name);
        const sttLow = String(t.stt || '').toLowerCase();
        if (nameLow === hLow || cleanName === cleanHLow || sttLow === hLow) return true;
        if (cleanHLow.length >= 3 && (nameLow.includes(hLow) || cleanName.includes(cleanHLow))) return true;
      }
      return false;
    });

    if (target) {
      if (target._sectionKey && collapsedSections.has(target._sectionKey)) {
        setCollapsedSections(prev => {
          const next = new Set(prev);
          next.delete(target._sectionKey);
          return next;
        });
      }
      setHighlightedTaskId(target.id);

      const timer = setTimeout(() => {
        const rowEl = document.getElementById(`field-log-task-row-${target.id}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);

      const fadeTimer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 9000);

      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [highlightParam, taskIdParam, groupedTasks]);

  const maxSttWidth = useMemo(() => {
    let maxLen = 3; // Minimum length 3 for "STT" header
    groupedTasks.forEach(t => {
      const rawVal = String((t as any).computedStt || t.stt || '').trim();
      const match = rawVal.match(/^[\d.]+/);
      const cleanVal = match ? match[0] : rawVal.split(/[\s\-]/)[0];
      if (cleanVal.length > maxLen) maxLen = cleanVal.length;
    });
    // Kích thước chuẩn khít vừa vặn số, không bị ... và không bị quá rộng
    const calculated = Math.round(maxLen * 5.2 + 5);
    return Math.max(26, Math.min(45, calculated));
  }, [groupedTasks]);

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
    <div 
      className="flex-1 overflow-auto bg-white pb-[60px] md:pb-0 custom-scrollbar"
      onScroll={(e) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setIsScrolledHorizontally(scrollLeft > 10);
      }}
    >
      <table className="min-w-[680px] w-full text-left text-xs text-slate-600 border-collapse table-fixed" style={{ "--stt-width": `${maxSttWidth}px` } as React.CSSProperties}>
        <colgroup>
          <col style={{ width: "var(--stt-width)" }} />
          <col style={{ width: 180 }} />
          <col style={{ width: 95 }} />
          <col style={{ width: 65 }} />
          <col style={{ width: 160 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 45 }} />
        </colgroup>
        <thead className="bg-slate-50 text-[10px] md:text-xs uppercase text-slate-500 font-bold sticky top-0 z-20 shadow-sm border-b border-slate-200">
          <tr>
            <th style={{ width: "var(--stt-width)", minWidth: "var(--stt-width)", maxWidth: "var(--stt-width)" }} className="py-2 px-0 bg-slate-50 text-center border-b border-r border-slate-200 whitespace-nowrap tracking-tighter">STT</th>
            <th className="sticky left-0 z-30 py-2 px-2 min-w-[150px] bg-slate-50 border-b border-r border-slate-200 whitespace-normal font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">NỘI DUNG CÔNG VIỆC</th>
            <th className="py-2 px-1.5 border-b border-r border-slate-200 min-w-[85px] text-center whitespace-nowrap">THỜI GIAN</th>
            <th className="py-2 px-1 border-b border-r border-slate-200 min-w-[55px] text-center whitespace-nowrap">ẢNH</th>
            <th className="py-2 px-2 border-b border-r border-slate-200 min-w-[120px] whitespace-nowrap">GHI CHÚ</th>
            <th className="py-2 px-1.5 border-b border-r border-slate-200 min-w-[90px] text-center whitespace-nowrap">NGƯỜI CẬP NHẬT</th>
            <th className="py-2 px-1 border-b min-w-[40px] text-center whitespace-nowrap">TT</th>
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
              const isHighlighted = t.id === highlightedTaskId;

              if (t.isSectionHeader) {
                const isCollapsed = collapsedSections.has(t._sectionKey || '');
                return (
                  <tr key={t.id} id={`field-log-task-row-${t.id}`} className={`group border-t-2 border-b border-blue-200 font-bold text-primary transition-all duration-500 ${isHighlighted ? 'bg-amber-100 ring-2 ring-amber-400 animate-pulse' : 'bg-[#eff6ff]'}`}>
                    <td style={{ width: "var(--stt-width)", minWidth: "var(--stt-width)", maxWidth: "var(--stt-width)" }} className={`py-2 px-0 border-r border-blue-200 text-center font-mono font-extrabold text-[11px] text-primary whitespace-nowrap tracking-tighter ${isHighlighted ? 'bg-amber-100' : 'bg-[#eff6ff]'}`} title={String(t.computedStt || t.stt)}>{t.computedStt || t.stt}</td>
                    <td className={`sticky left-0 z-10 py-2 px-2 uppercase tracking-tight font-extrabold text-xs text-primary border-r border-blue-200 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isHighlighted ? 'bg-amber-100' : 'bg-[#eff6ff]'}`}>
                      <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
                        <button
                          onClick={() => toggleSection(t._sectionKey || '')}
                          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-blue-200 transition-colors"
                          title={isCollapsed ? 'Mở rộng đầu mục' : 'Thu gọn đầu mục'}
                        >
                          <span className={`material-symbols-outlined text-[15px] text-primary transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>expand_more</span>
                        </button>
                        <span className="material-symbols-outlined text-[15px] flex-shrink-0">{isCollapsed ? 'folder' : 'folder_open'}</span>
                        <span className="flex-1 uppercase truncate min-w-0 leading-tight" title={t.name}>
                          {t.stt ? `${t.stt} - ` : ''}{t.name}
                        </span>
                      </div>
                    </td>
                    <td colSpan={5} className={`py-2 px-2 text-slate-500 truncate text-[11px] ${isHighlighted ? 'bg-amber-100' : 'bg-blue-50/90'}`}></td>
                  </tr>
                );
              }

              const depth = t.depth || 0;
              let fontStyle = "font-medium text-slate-700 text-[12px] leading-snug";
              if (depth === 1) fontStyle = "font-semibold text-slate-900 text-[12px] leading-snug";
              else if (depth === 2) fontStyle = "font-medium text-slate-800 text-[12px] leading-snug";

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
                <tr key={t.id} id={`field-log-task-row-${t.id}`} onClick={(e) => { e.stopPropagation(); setViewAllLogsTask(t); }} className={`transition-all duration-500 group cursor-pointer border-b border-slate-100 ${isHighlighted ? 'bg-amber-100/90 font-bold ring-2 ring-amber-400 animate-pulse' : 'hover:bg-blue-50/30'}`}>
                  <td style={{ width: "var(--stt-width)", minWidth: "var(--stt-width)", maxWidth: "var(--stt-width)" }} className={`py-1 px-0 border-r border-slate-200 text-center font-mono text-[11px] whitespace-nowrap tracking-tighter ${isHighlighted ? 'bg-amber-100' : 'bg-white group-hover:bg-blue-50/40'} ${depth === 1 ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
                    {t.computedStt || t.stt}
                  </td>
                  <td className={`sticky left-0 z-10 py-1 px-2 border-r border-slate-200 ${fontStyle} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isHighlighted ? 'bg-amber-100' : 'bg-white group-hover:bg-blue-50/40'}`}>
                    <div className="flex items-center gap-1 min-w-0 w-full" style={{ paddingLeft: `${Math.max(0, depth - 1) * 0.4}rem` }}>
                      {depth > 1 && <span className="material-symbols-outlined text-slate-400 text-[12px] shrink-0">subdirectory_arrow_right</span>}
                      <span className="text-slate-800 leading-snug break-words flex-1 min-w-0" title={t.name}>{t.name}</span>
                      {taskLogs.length > 0 && (
                        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0" title={`${taskLogs.length} lần cập nhật`}>
                          {taskLogs.length}
                        </span>
                      )}
                    </div>
                  </td>
                  {/* CỘT THỜI GIAN THI CÔNG */}
                  <td className="py-1 px-1.5 border-r border-slate-200 text-center">
                    {dateEntries.length > 0 ? (
                      <div 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setViewAllLogsTask(t);
                        }}
                        className="inline-flex items-center gap-1 bg-blue-50/80 text-blue-900 hover:bg-blue-100 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-blue-200 shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
                        title={`Xem chi tiết nhật ký ngày ${dateEntries[0][0]}`}
                      >
                        <span className="material-symbols-outlined text-[13px] text-blue-600">calendar_today</span>
                        <span className="font-mono">{dateEntries[0][0]}</span>
                        {dateEntries.length > 1 && (
                          <span className="text-[9px] bg-blue-600 text-white rounded-full w-3.5 h-3.5 inline-flex items-center justify-center font-bold">
                            +{dateEntries.length - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs italic">-</span>
                    )}
                  </td>
                  {/* CỘT ẢNH NHẬT KÝ */}
                  <td className="py-1 px-1 border-r border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {allImagesForTask.length > 0 ? (
                        <>
                          {allImagesForTask.slice(0, 2).map((img, i) => (
                            <div key={i} onClick={(e) => { e.stopPropagation(); openLightbox(allImagesForTask, i); }} className="w-6 h-6 rounded overflow-hidden border border-slate-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer relative group/img bg-slate-100 shrink-0">
                              <img src={img} className="w-full h-full object-cover" alt="ảnh" />
                            </div>
                          ))}
                          {allImagesForTask.length > 2 && (
                            <div onClick={(e) => { e.stopPropagation(); openLightbox(allImagesForTask, 2); }} className="w-6 h-6 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-blue-100 shadow-2xs shrink-0">
                              +{allImagesForTask.length - 2}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-300 text-[11px] italic">-</span>
                      )}
                    </div>
                  </td>
                  {/* CỘT GHI CHÚ NHẬT KÝ */}
                  <td className="py-1 px-2 border-r border-slate-200 text-slate-600 text-[11px] truncate" title={allNotesForTask.map(n => n.note).join(' | ')}>
                    {allNotesForTask.length > 0 ? (
                      <span className="truncate block leading-tight">{allNotesForTask[0].note}</span>
                    ) : (
                      <span className="text-slate-300 italic">-</span>
                    )}
                  </td>
                  {/* CỘT NGƯỜI CẬP NHẬT */}
                  <td className="py-1 px-1.5 border-r border-slate-200 text-center">
                    {(() => {
                      const latestLog = taskLogs[0];
                      const logTime = latestLog ? parseAuditTime(latestLog.updatedAt || latestLog.timestamp) : 0;
                      const taskTime = parseAuditTime(t.updatedAt);

                      const effectiveUpdater = logTime >= taskTime 
                        ? (latestLog?.updatedBy || latestLog?.createdByName || t.updatedBy)
                        : (t.updatedBy || latestLog?.updatedBy || latestLog?.createdByName);

                      const effectiveTime = logTime >= taskTime
                        ? (latestLog?.updatedAt || latestLog?.timestamp || t.updatedAt)
                        : (t.updatedAt || latestLog?.updatedAt || latestLog?.timestamp);

                      return <AuditInfoCell updatedBy={effectiveUpdater} updatedAt={effectiveTime} projectCode={t.projectCode} />;
                    })()}
                  </td>
                  {/* CỘT THAO TÁC */}
                  <td className="py-1 px-1 text-center">
                    <button onClick={(e) => { e.stopPropagation(); onAddLogClick(t.id); }} className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors inline-flex items-center justify-center" title="Thêm nhật ký">
                      <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
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
          onDeleteLogClick={onDeleteLogClick ? (log) => {
            setViewAllLogsTask(null);
            onDeleteLogClick(log);
          } : undefined}
        />
      )}
    </div>
  );
};
