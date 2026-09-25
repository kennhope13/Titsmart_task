import React from 'react';
import { useAuthStore } from '../../services/authStore';

export const LogoutBlockingModal: React.FC = () => {
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);

  if (!isLoggingOut) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 cursor-wait select-none animate-in fade-in duration-200"
      style={{ pointerEvents: 'all' }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div className="bg-white/95 backdrop-blur-xl px-8 py-7 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center text-center max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mb-4 relative shadow-sm">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="material-symbols-outlined text-2xl text-primary absolute">logout</span>
        </div>
        
        <h3 className="text-base font-extrabold text-slate-900 mb-1.5 tracking-tight">
          Đang đăng xuất khỏi hệ thống
        </h3>
        
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          Hệ thống đang lưu trữ và bảo mật phiên làm việc. Vui lòng chờ trong giây lát...
        </p>
      </div>
    </div>
  );
};
