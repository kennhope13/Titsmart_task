import React from 'react';
import { useVersionCheck } from '../../hooks/useVersionCheck';

export const WebUpdateNotification: React.FC = () => {
  const { hasUpdate, newVersionInfo } = useVersionCheck(5 * 60 * 1000);
  const [isUpdating, setIsUpdating] = React.useState(false);

  if (!hasUpdate || !newVersionInfo) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (err) {
      console.warn('Lỗi dọn cache web:', err);
    }
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.href = url.toString();
    }, 600);
  };

  if (isUpdating) {
    return (
      <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none cursor-wait animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center justify-center min-w-[220px] border border-slate-100 animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <span className="text-sm font-bold text-slate-800 tracking-wide">
            Đang cập nhật...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in duration-300">
        {/* Modal Header with app's light surface styling */}
        <div className="bg-surface-container-low px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100/80 border border-blue-200/60 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-lg">system_update</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-primary leading-tight">Có phiên bản mới!</h3>
            </div>
          </div>
          <span className="text-[11px] font-bold text-primary font-mono px-2 py-0.5 bg-blue-50 border border-blue-200/80 rounded-md">
            v{newVersionInfo.version}
          </span>
        </div>
        
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
          <p className="text-xs font-bold text-slate-700 mb-2.5">Tính năng mới & Cải tiến:</p>
          <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
            {newVersionInfo.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                <span className="leading-snug">{note}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={handleUpdate}
            className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs flex justify-center items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Cập nhật ngay
          </button>
        </div>
      </div>
    </div>
  );
};
