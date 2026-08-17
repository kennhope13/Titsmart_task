import React from 'react';
import { Download, X } from 'lucide-react';
import { useVersionCheck } from '../../hooks/useVersionCheck';

export const UpdateNotification: React.FC = () => {
  const { hasUpdate, serverVersion, releaseNotes } = useVersionCheck();

  if (!hasUpdate) return null;

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[420px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00236F]/5 border border-[#00236F]/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#00236F]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Có bản cập nhật mới
              </p>
              <p className="text-xs text-slate-500">
                Phiên bản {serverVersion} đã có sẵn
              </p>
            </div>
          </div>
          <button onClick={() => {}} className="text-slate-400 hover:text-slate-600 opacity-0 pointer-events-none" title="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>

        {releaseNotes && releaseNotes.length > 0 && (
          <div className="px-4 pt-2 pb-1">
            <div className="text-xs text-slate-500 max-h-32 overflow-y-auto">
              <p className="font-semibold mb-1 text-slate-700">Các tính năng mới:</p>
              <ul className="list-disc pl-4 space-y-1">
                {releaseNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-4 pb-3.5 pt-2">
          <button
            onClick={handleUpdate}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001a56] rounded-lg transition-colors"
          >
            Cập nhật ngay (F5)
          </button>
        </div>
      </div>
    </div>
  );
};
