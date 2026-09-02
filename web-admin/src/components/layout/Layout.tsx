import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../services/uiStore';
import { BackToTop } from '../common/BackToTop';
import { NotificationBell } from '../common/NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { sidebarShowToggleButton } = useUIStore();

  React.useEffect(() => {
    if (!sidebarShowToggleButton) {
      setIsSidebarExpanded(false);
    }
  }, [sidebarShowToggleButton]);

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden relative">
      <Sidebar isExpanded={isSidebarExpanded} toggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} />
      
      <div className={`${isSidebarExpanded ? 'ml-[240px]' : 'ml-[56px]'} flex flex-col h-screen flex-1 overflow-hidden transition-all duration-300 ease-in-out relative`}>
        <NotificationBell />
        <main className="flex-1 bg-slate-50 flex flex-col w-full max-w-full overflow-hidden page-has-floating-bell pt-8">{children}</main>
      </div>
      <BackToTop />
    </div>
  );
};
