import React from 'react';
import { useAuthStore } from '../../services/authStore';
import LoadingSpinner from '../LoadingSpinner';

export const LogoutBlockingModal: React.FC = () => {
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);

  if (!isLoggingOut) return null;

  return (
    <LoadingSpinner loading={true} message="Đang đăng xuất khỏi hệ thống..." />
  );
};
