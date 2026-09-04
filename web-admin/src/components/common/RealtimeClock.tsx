import React, { useState, useEffect } from 'react';

export const RealtimeClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeString = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = currentTime.toLocaleDateString('vi-VN');
    document.title = `Hệ thống Quản lý Công việc | Titsmart - ${timeString} ${dateString}`;
  }, [currentTime]);

  return null;
};
