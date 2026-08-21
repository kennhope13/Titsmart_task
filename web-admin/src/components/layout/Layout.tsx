import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden relative">
      <Sidebar isExpanded={isSidebarExpanded} toggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} />
      
      {/* Toggle button - Placed at the edge of the sidebar */}
      <button 
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className={`fixed z-50 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-50 hover:scale-110 shadow-md transition-all duration-300 ease-in-out cursor-pointer ${isSidebarExpanded ? 'left-[264px]' : 'left-[48px]'}`}
        title="Mở rộng / Thu gọn (Phím tắt: Ctrl + B)"
      >
        <span className="material-symbols-outlined text-[18px]">{isSidebarExpanded ? 'chevron_left' : 'chevron_right'}</span>
      </button>

      <div className={`${isSidebarExpanded ? 'ml-[280px]' : 'ml-[64px]'} flex flex-col h-screen flex-1 overflow-hidden transition-all duration-300 ease-in-out`}>
        <main className="flex-1 bg-slate-50 flex flex-col w-full max-w-full overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
