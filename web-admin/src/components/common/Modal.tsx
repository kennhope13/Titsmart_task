import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  icon?: string;
  defaultMaximized?: boolean;
  requireConfirmOnClose?: boolean;
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
  requireConfirmOnClose = true,
}) => {
  const [isMaximized, setIsMaximized] = useState<boolean>(defaultMaximized);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCloseClick = () => {
    if (requireConfirmOnClose) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  const sizeClass = isMaximized
    ? 'max-w-[99vw] h-[98vh] my-auto'
    : size === 'full'
    ? 'max-w-[98vw] h-[95vh]'
    : `${modalSizeClasses[size]} max-h-[92vh] md:max-h-[95vh]`;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+56px)] pb-20 md:pb-4 animate-fadeIn">
        <div className={`bg-white rounded-2xl shadow-2xl border border-outline-variant w-full ${sizeClass} overflow-hidden flex flex-col transition-all duration-200`}>
          {/* Modal Header */}
          <div className="px-4 py-2 bg-surface-container-low border-b border-outline-variant flex justify-between items-center select-none shrink-0">
            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 truncate">
              {icon && <span className="material-symbols-outlined text-[17px]">{icon}</span>}
              <span className="truncate">{title}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCloseClick}
                title="Đóng"
                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-3.5 sm:p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col">{children}</div>
        </div>
      </div>

      {/* Exit confirmation dialog overlay when clicking X */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-sm w-full border border-slate-200 text-center animate-zoomIn space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-primary border border-blue-100 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">help_outline</span>
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-800">Xác nhận thoát</h4>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn thoát? Dữ liệu đang nhập có thể bị mất.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelExit}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors flex-1 shadow-2xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all flex-1"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

