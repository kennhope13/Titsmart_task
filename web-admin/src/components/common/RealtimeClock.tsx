import React, { useState, useEffect } from 'react';

export const RealtimeClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTitle = () => {
      const timeString = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateString = currentTime.toLocaleDateString('vi-VN');
      const clockStr = `${timeString} ${dateString}`;
      const prefix = "Hệ thống Quản lý Công việc | Titsmart";
      
      const windowWidth = window.innerWidth;
      const prefixWidth = 245; 
      const clockWidth = 125;
      
      const targetX = (windowWidth / 2) - (clockWidth / 2);
      const gapPixels = targetX - prefixWidth;
      
      if (gapPixels > 0) {
        // \u2002 is En Space, approx 6.5px in Segoe UI 9pt
        const spaceCount = Math.floor(gapPixels / 6.5);
        const padding = '\u2002'.repeat(spaceCount);
        document.title = `${prefix}${padding}${clockStr}`;
      } else {
        document.title = `${prefix} - ${clockStr}`;
      }
    };

    updateTitle();
    window.addEventListener('resize', updateTitle);
    return () => window.removeEventListener('resize', updateTitle);
  }, [currentTime]);

  return null;
};
