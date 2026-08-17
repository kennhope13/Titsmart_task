import React from 'react';
import { useVersionCheck } from '../../hooks/useVersionCheck';

export const WebUpdateNotification: React.FC = () => {
  const { hasUpdate, newVersionInfo } = useVersionCheck(5 * 60 * 1000);

  if (!hasUpdate || !newVersionInfo) return null;

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-white">
            <span className="material-symbols-outlined text-2xl">system_update</span>
          </div>
          <div className="text-white">
            <h3 className="font-extrabold text-xl leading-tight">Có phiên bản mới!</h3>
            <p className="text-blue-100 text-sm font-medium">Phiên bản {newVersionInfo.version}</p>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-sm font-semibold text-slate-800 mb-3">Tính năng mới & Cải tiến:</p>
          <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {newVersionInfo.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0 mt-0.5">check_circle</span>
                <span className="leading-snug">{note}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={handleUpdate}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Cập nhật ngay
          </button>
        </div>
      </div>
    </div>
  );
};
