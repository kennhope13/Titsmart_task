import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStoreState {
  sidebarHoverToExpand: boolean;
  sidebarShowToggleButton: boolean;
  isSidebarExpanded: boolean;
  isSidebarHovered: boolean;
  showNotificationBell: boolean;
  autoShowNotificationPopup: boolean;
  showChatWidget: boolean;
  availableUpdateVersion: string | null;
  isUpdatingApp: boolean;
  companyName: string;
  companySlogan: string;
  companyLogo: string | null;
  isApplyingBranding: boolean;
  setSidebarHoverToExpand: (val: boolean) => void;
  setSidebarShowToggleButton: (val: boolean) => void;
  setIsSidebarExpanded: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsSidebarHovered: (val: boolean) => void;
  toggleSidebarExpanded: () => void;
  setShowNotificationBell: (val: boolean) => void;
  setAutoShowNotificationPopup: (val: boolean) => void;
  setShowChatWidget: (val: boolean) => void;
  setAvailableUpdateVersion: (val: string | null) => void;
  setIsUpdatingApp: (val: boolean) => void;
  setCompanyName: (val: string) => void;
  setCompanySlogan: (val: string) => void;
  setCompanyLogo: (val: string | null) => void;
  setIsApplyingBranding: (val: boolean) => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      sidebarHoverToExpand: false,
      sidebarShowToggleButton: true,
      isSidebarExpanded: false,
      isSidebarHovered: false,
      showNotificationBell: true,
      autoShowNotificationPopup: true,
      showChatWidget: true,
      availableUpdateVersion: null,
      isUpdatingApp: false,
      companyName: 'TITSMART',
      companySlogan: 'Project Manager',
      companyLogo: null,
      isApplyingBranding: false,
      setSidebarHoverToExpand: (val) => set({ sidebarHoverToExpand: val }),
      setSidebarShowToggleButton: (val) => set({ sidebarShowToggleButton: val }),
      setIsSidebarExpanded: (val) => set((state) => ({ 
        isSidebarExpanded: typeof val === 'function' ? val(state.isSidebarExpanded) : val 
      })),
      setIsSidebarHovered: (val) => set({ isSidebarHovered: val }),
      toggleSidebarExpanded: () => set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
      setShowNotificationBell: (val) => set({ showNotificationBell: val }),
      setAutoShowNotificationPopup: (val) => set({ autoShowNotificationPopup: val }),
      setShowChatWidget: (val) => set({ showChatWidget: val }),
      setAvailableUpdateVersion: (val) => set({ availableUpdateVersion: val }),
      setIsUpdatingApp: (val) => set({ isUpdatingApp: val }),
      setCompanyName: (val) => set({ companyName: val }),
      setCompanySlogan: (val) => set({ companySlogan: val }),
      setCompanyLogo: (val) => set({ companyLogo: val }),
      setIsApplyingBranding: (val) => set({ isApplyingBranding: val }),
    }),
    {
      name: 'titsmart-ui-settings',
      partialize: (state) => ({
        sidebarHoverToExpand: state.sidebarHoverToExpand,
        sidebarShowToggleButton: state.sidebarShowToggleButton,
        isSidebarExpanded: state.isSidebarExpanded,
        showNotificationBell: state.showNotificationBell,
        autoShowNotificationPopup: state.autoShowNotificationPopup,
        showChatWidget: state.showChatWidget,
        companyName: state.companyName,
        companySlogan: state.companySlogan,
        companyLogo: state.companyLogo,
      }),
    }
  )
);
