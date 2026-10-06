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
      className={`fixed bottom-4 right-4 sm:right-6 z-[9999] max-w-[calc(100vw-24px)] flex items-center gap-2.5 sm:gap-3 bg-white text-slate-800 px-4 py-3 rounded-xl shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 border-l-4 box-border ${
        type === 'success' ? 'border-l-emerald-500 border-y border-r border-slate-200' :
        type === 'warning' ? 'border-l-amber-500 border-y border-r border-slate-200' :
        type === 'error' ? 'border-l-rose-500 border-y border-r border-slate-200' :
        'border-l-blue-500 border-y border-r border-slate-200'
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
          className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
        >
          <span className="material-symbols-outlined text-[16px] block">close</span>
        </button>
      )}
    </div>
  );
};
