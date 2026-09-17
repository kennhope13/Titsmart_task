import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStoreState {
  sidebarHoverToExpand: boolean;
  sidebarShowToggleButton: boolean;
  showNotificationBell: boolean;
  autoShowNotificationPopup: boolean;
  setSidebarHoverToExpand: (val: boolean) => void;
  setSidebarShowToggleButton: (val: boolean) => void;
  setShowNotificationBell: (val: boolean) => void;
  setAutoShowNotificationPopup: (val: boolean) => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      sidebarHoverToExpand: false,
      sidebarShowToggleButton: true,
      showNotificationBell: true,
      autoShowNotificationPopup: true,
      setSidebarHoverToExpand: (val) => set({ sidebarHoverToExpand: val }),
      setSidebarShowToggleButton: (val) => set({ sidebarShowToggleButton: val }),
      setShowNotificationBell: (val) => set({ showNotificationBell: val }),
      setAutoShowNotificationPopup: (val) => set({ autoShowNotificationPopup: val }),
    }),
    {
      name: 'titsmart-ui-settings',
    }
  )
);
