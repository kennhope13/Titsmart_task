import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStoreState {
  sidebarHoverToExpand: boolean;
  sidebarShowToggleButton: boolean;
  showNotificationBell: boolean;
  setSidebarHoverToExpand: (val: boolean) => void;
  setSidebarShowToggleButton: (val: boolean) => void;
  setShowNotificationBell: (val: boolean) => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      sidebarHoverToExpand: false,
      sidebarShowToggleButton: true,
      showNotificationBell: true,
      setSidebarHoverToExpand: (val) => set({ sidebarHoverToExpand: val }),
      setSidebarShowToggleButton: (val) => set({ sidebarShowToggleButton: val }),
      setShowNotificationBell: (val) => set({ showNotificationBell: val }),
    }),
    {
      name: 'titsmart-ui-settings',
    }
  )
);
