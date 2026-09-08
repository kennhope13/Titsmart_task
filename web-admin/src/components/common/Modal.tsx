import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  icon?: string;
  defaultMaximized?: boolean;
}

const modalSizeClasses = {
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-[98vw] h-[95vh]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  icon = 'add_task',
  defaultMaximized = false,
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(defaultMaximized);

  if (!isOpen) return null;

  const sizeClass = isMaximized
    ? 'max-w-[99vw] h-[98vh] my-auto'
    : size === 'full'
    ? 'max-w-[98vw] h-[95vh]'
    : `${modalSizeClasses[size]} max-h-[95vh]`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className={`bg-white rounded-lg shadow-2xl border border-outline-variant w-full ${sizeClass} overflow-hidden flex flex-col transition-all duration-200`}>
        {/* Modal Header */}
        <div className="px-3 py-1.5 bg-surface-container-low border-b border-outline-variant flex justify-between items-center select-none shrink-0">
          <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 truncate">
            {icon && <span className="material-symbols-outlined text-[17px]">{icon}</span>}
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              title="Đóng"
              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] block">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-1.5 sm:p-2 overflow-y-auto custom-scrollbar flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
};

