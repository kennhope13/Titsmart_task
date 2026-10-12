// src/components/LoadingSpinner.tsx
import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  loading?: boolean;
  message?: string;
  spinnerOnly?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  loading = false, 
  message = "Đang xử lý...",
  spinnerOnly = false,
}) => {
  if (!loading) return null;
  
  if (spinnerOnly) {
    return (
      <div 
        className="loading-overlay"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onKeyDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      >
        <div className="spinner" style={{ margin: 0, width: '44px', height: '44px', borderWidth: '4px' }}></div>
      </div>
    );
  }

  return (
    <div 
      className="loading-overlay"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onKeyDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      <div className="loading-container">
        <div className="spinner"></div>
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;
