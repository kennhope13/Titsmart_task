import React, { useState, useEffect } from 'react';

export const RealtimeClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden sm:flex text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full items-center gap-2 drag-none">
      <span className="material-symbols-outlined text-[18px]">schedule</span>
      {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {currentTime.toLocaleDateString('vi-VN')}
    </div>
  );
};
