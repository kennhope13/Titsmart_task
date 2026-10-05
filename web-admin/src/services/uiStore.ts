import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStoreState {
  sidebarHoverToExpand: boolean;
  sidebarShowToggleButton: boolean;
  showNotificationBell: boolean;
  autoShowNotificationPopup: boolean;
  showChatWidget: boolean;
  availableUpdateVersion: string | null;
  isUpdatingApp: boolean;
  setSidebarHoverToExpand: (val: boolean) => void;
  setSidebarShowToggleButton: (val: boolean) => void;
  setShowNotificationBell: (val: boolean) => void;
  setAutoShowNotificationPopup: (val: boolean) => void;
  setShowChatWidget: (val: boolean) => void;
  setAvailableUpdateVersion: (val: string | null) => void;
  setIsUpdatingApp: (val: boolean) => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      sidebarHoverToExpand: false,
      sidebarShowToggleButton: true,
      showNotificationBell: true,
      autoShowNotificationPopup: true,
      showChatWidget: true,
      availableUpdateVersion: null,
      isUpdatingApp: false,
      setSidebarHoverToExpand: (val) => set({ sidebarHoverToExpand: val }),
      setSidebarShowToggleButton: (val) => set({ sidebarShowToggleButton: val }),
      setShowNotificationBell: (val) => set({ showNotificationBell: val }),
      setAutoShowNotificationPopup: (val) => set({ autoShowNotificationPopup: val }),
      setShowChatWidget: (val) => set({ showChatWidget: val }),
      setAvailableUpdateVersion: (val) => set({ availableUpdateVersion: val }),
      setIsUpdatingApp: (val) => set({ isUpdatingApp: val }),
    }),
    {
      name: 'titsmart-ui-settings',
    }
  )
);
