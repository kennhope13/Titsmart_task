import React from 'react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  icon = 'help_outline',
  isDestructive = true,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} icon={icon} size="md">
      <div className="py-2 text-slate-600 text-sm">{message}</div>
      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 font-medium rounded-lg text-white transition-colors ${
            isDestructive
              ? 'bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200'
              : 'bg-primary hover:bg-blue-700 shadow-sm shadow-blue-200'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};
