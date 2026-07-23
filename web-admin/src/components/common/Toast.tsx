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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg shadow-xl transition-all duration-300 transform translate-y-0 opacity-100 border border-outline-variant/30`}
    >
      <span className="material-symbols-outlined text-secondary-container">
        {type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'info'}
      </span>
      <span className="font-sans text-sm font-medium">{message}</span>
    </div>
  );
};
