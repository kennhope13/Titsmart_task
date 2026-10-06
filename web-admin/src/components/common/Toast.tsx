import React from 'react';

interface ToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ show, message, type = 'success', onClose }) => {
  if (!show) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 sm:right-6 z-[9999] max-w-[calc(100vw-24px)] flex items-center gap-2.5 sm:gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 border box-border ${
        type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
        type === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
        type === 'error' ? 'bg-rose-50 text-rose-900 border-rose-200' :
        'bg-blue-50 text-blue-900 border-blue-200'
      }`}
    >
      <span className={`material-symbols-outlined text-lg sm:text-xl shrink-0 ${
        type === 'success' ? 'text-emerald-600' :
        type === 'warning' ? 'text-amber-600' :
        type === 'error' ? 'text-rose-600' : 'text-blue-600'
      }`}>
        {type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : type === 'error' ? 'error' : 'info'}
      </span>
      <span className="font-sans text-xs sm:text-sm font-semibold break-words leading-snug">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className={`ml-1 p-0.5 rounded-md transition-colors ${
            type === 'success' ? 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-100' :
            type === 'warning' ? 'text-amber-500 hover:text-amber-800 hover:bg-amber-100' :
            type === 'error' ? 'text-rose-500 hover:text-rose-800 hover:bg-rose-100' :
            'text-blue-500 hover:text-blue-800 hover:bg-blue-100'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] block">close</span>
        </button>
      )}
    </div>
  );
};
