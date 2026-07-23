import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

const modalSizeClasses = {
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`bg-white rounded-lg shadow-2xl border border-outline-variant w-full ${modalSizeClasses[size]} overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Modal Header */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">add_task</span>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
};
