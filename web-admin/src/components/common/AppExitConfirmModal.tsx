import React from 'react';
import { ConfirmModal } from './ConfirmModal';

interface AppExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AppExitConfirmModal: React.FC<AppExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Thoát ứng dụng"
      message="Bạn có chắc chắn muốn đóng và thoát khỏi ứng dụng Quản lý Công việc TITSMART không?"
      confirmText="Thoát ứng dụng"
      cancelText="Ở lại"
      icon="power_settings_new"
      isDestructive={true}
    />
  );
};
