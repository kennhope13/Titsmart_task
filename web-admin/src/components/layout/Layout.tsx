import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../services/uiStore';
import { BackToTop } from '../common/BackToTop';
import { RealtimeClock } from '../common/RealtimeClock';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { 
    isSidebarExpanded, 
    isSidebarHovered, 
    sidebarHoverToExpand, 
    sidebarShowToggleButton, 
    setIsSidebarExpanded,
    toggleSidebarExpanded 
  } = useUIStore();

  React.useEffect(() => {
    if (!sidebarShowToggleButton) {
      setIsSidebarExpanded(false);
    }
  }, [sidebarShowToggleButton, setIsSidebarExpanded]);

  const isExpanded = isSidebarExpanded || (sidebarHoverToExpand && isSidebarHovered);

  return (
    <div className="h-[100dvh] w-full bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden relative">
      <Sidebar isExpanded={isExpanded} toggleSidebar={toggleSidebarExpanded} />
      
      <div className={`layout-content-wrapper ml-0 ${isExpanded ? 'md:ml-[170px]' : 'md:ml-[56px]'} flex flex-col h-full flex-1 min-h-0 overflow-hidden transition-all duration-300 ease-in-out relative pt-[env(safe-area-inset-top,0px)] pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0`}>
        <RealtimeClock />
        <main className="flex-1 bg-slate-50 flex flex-col w-full max-w-full overflow-hidden min-h-0">{children}</main>
      </div>
      <BackToTop />
    </div>
  );
};
