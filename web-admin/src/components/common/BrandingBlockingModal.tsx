import React from 'react';
import { useUIStore } from '../../services/uiStore';
import LoadingSpinner from '../LoadingSpinner';

export const BrandingBlockingModal: React.FC = () => {
  const isApplyingBranding = useUIStore((state) => state.isApplyingBranding);

  if (!isApplyingBranding) return null;

  return (
    <LoadingSpinner loading={true} spinnerOnly={true} />
  );
};
