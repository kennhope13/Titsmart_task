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
      className={`fixed bottom-2 right-6 z-[9999] flex items-center gap-3 bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg shadow-xl transition-all duration-300 opacity-100 border border-outline-variant/30`}
    >
      <span className={`material-symbols-outlined ${type === 'success' ? 'text-emerald-400' : type === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}>
        {type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'info'}
      </span>
      <span className="font-sans text-sm font-medium">{message}</span>
    </div>
  );
};
