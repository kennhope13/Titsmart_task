import React from 'react';

export const formatAuditDateTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${timeStr} ${dateStr}`;
  } catch {
    return isoString || '';
  }
};

export const AuditInfoCell: React.FC<{ updatedBy?: string; updatedAt?: string; className?: string }> = ({
  updatedBy,
  updatedAt,
  className = '',
}) => {
  const formattedTime = formatAuditDateTime(updatedAt);
  if (!updatedBy && !formattedTime) {
    return <div className="text-center w-full"><span className="text-slate-300 italic text-[10px]">-</span></div>;
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center text-[10px] leading-tight w-full ${className}`}>
      <span className="font-bold text-slate-700 truncate w-full" title={updatedBy || 'Hệ thống'}>
        {updatedBy || 'Hệ thống'}
      </span>
      {formattedTime && (
        <span className="text-slate-400 font-mono text-[9px] mt-0.5" title={formattedTime}>
          {formattedTime}
        </span>
      )}
    </div>
  );
};
