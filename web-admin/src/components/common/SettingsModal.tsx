import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../services/uiStore';
import { useAuthStore } from '../../services/authStore';
import { Modal } from './Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const {
    sidebarHoverToExpand,
    sidebarShowToggleButton,
    showNotificationBell,
    autoShowNotificationPopup,
    showChatWidget,
    setSidebarHoverToExpand,
    setSidebarShowToggleButton,
    setShowNotificationBell,
    setAutoShowNotificationPopup,
    setShowChatWidget,
  } = useUIStore();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt hệ thống"
      icon="settings"
      size="md"
      requireConfirmOnClose={false}
    >
      <div className="p-4 space-y-3">
        {/* Row 1: Sidebar Mode (Desktop Only) */}
        <div className="hidden sm:flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">side_navigation</span>
            <span className="text-xs font-bold text-slate-800">Thanh điều hướng</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSidebarShowToggleButton(true);
                setSidebarHoverToExpand(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                sidebarShowToggleButton ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ghim
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarHoverToExpand(true);
                setSidebarShowToggleButton(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                sidebarHoverToExpand ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rê chuột
            </button>
          </div>
        </div>

        {/* Row 2: Notification Bell */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">notifications</span>
            <span className="text-xs font-bold text-slate-800">Nút chuông thông báo</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setShowNotificationBell(true)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                showNotificationBell ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bật
            </button>
            <button
              type="button"
              onClick={() => setShowNotificationBell(false)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                !showNotificationBell ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tắt
            </button>
          </div>
        </div>

        {/* Row 3: Auto Notification Popup on startup */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">web_stories</span>
            <span className="text-xs font-bold text-slate-800">Thông báo khi mở app</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setAutoShowNotificationPopup(true)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                autoShowNotificationPopup ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bật
            </button>
            <button
              type="button"
              onClick={() => setAutoShowNotificationPopup(false)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                !autoShowNotificationPopup ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tắt
            </button>
          </div>
        </div>

        {/* Row 4: Chat Widget Button Toggle */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">forum</span>
            <span className="text-xs font-bold text-slate-800">Nút Chat nội bộ</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setShowChatWidget(true)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                showChatWidget ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bật
            </button>
            <button
              type="button"
              onClick={() => setShowChatWidget(false)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                !showChatWidget ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tắt
            </button>
          </div>
        </div>

        {/* Divider & Account Actions */}
        <div className="h-px bg-slate-100 my-1"></div>

        {/* Row 5: Change Password */}
        <button
          type="button"
          onClick={() => {
            onClose();
            alert('Chức năng đổi mật khẩu sẽ kết nối API ở bản đầy đủ.');
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">lock_reset</span>
            <span className="text-xs font-bold text-slate-800">Đổi mật khẩu</span>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
        </button>

        {/* Row 6: Logout */}
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-red-50/70 border border-red-200/70 hover:bg-red-100/80 text-red-600 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg">logout</span>
              <span className="text-xs font-bold">Đăng xuất</span>
            </div>
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        )}

        {/* Version info */}
        <div className="text-center pt-1">
          <span className="text-[11px] font-mono text-slate-400 font-medium">
            Phiên bản v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
          </span>
        </div>
      </div>
    </Modal>
  );
};
