import React from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../../services/uiStore';

/**
 * Container component that subscribes to UI store for sidebar state.
 * It isolates sidebar re-renders from the main layout content, preventing
 * heavy page components from re‑rendering when the user merely hovers the
 * sidebar.
 */
export const SidebarContainer: React.FC<{ isExpanded?: boolean; toggleSidebar?: () => void }> = ({ isExpanded: isExpandedProp, toggleSidebar: toggleSidebarProp }) => {
  const isSidebarExpanded = useUIStore(s => s.isSidebarExpanded);
  const isSidebarHovered = useUIStore(s => s.isSidebarHovered);
  const sidebarHoverToExpand = useUIStore(s => s.sidebarHoverToExpand);
  const toggleSidebarExpanded = useUIStore(s => s.toggleSidebarExpanded);

  // Determine whether the sidebar should appear expanded.
  const isExpanded = isExpandedProp !== undefined
    ? isExpandedProp
    : (sidebarHoverToExpand && isSidebarHovered ? true : isSidebarExpanded);

  return (
    <Sidebar
      isExpanded={isExpanded}
      toggleSidebar={toggleSidebarProp || toggleSidebarExpanded}
    />
  );
};
