import React from 'react';

interface ToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

export const Toast: React.FC<ToastProps> = ({ show, message, type = 'success' }) => {
  if (!show) return null;

  return (
    <div
      className={`fixed bottom-3 sm:bottom-4 right-3 sm:right-6 z-[9999] max-w-[calc(100vw-24px)] flex items-center gap-2.5 sm:gap-3 bg-inverse-surface text-inverse-on-surface px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-xl transition-all duration-300 opacity-100 border border-outline-variant/30 box-border`}
    >
      <span className={`material-symbols-outlined text-lg sm:text-xl shrink-0 ${type === 'success' ? 'text-emerald-400' : type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}>
        {type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'info'}
      </span>
      <span className="font-sans text-xs sm:text-sm font-medium break-words">{message}</span>
    </div>
  );
};
