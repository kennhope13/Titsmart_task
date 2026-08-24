import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';

export const AccountPage: React.FC = () => {
  const engineer = useRealtimeStore((state) => state.engineers[0]);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      <section className="bg-white px-6 py-4 flex items-center border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-6 w-[2px] bg-primary"></div>
          <h2 className="text-xl font-extrabold text-primary uppercase tracking-wide">TÀI KHOẢN</h2>
        </div>
      </section>

      <div className="p-6 md:p-8 space-y-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[360px]">
            <div className="w-28 h-28 rounded-[24px] bg-primary text-white flex items-center justify-center text-4xl font-extrabold shadow-lg mb-6">
              {(user?.name || engineer?.name || 'AD').slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
              {user?.name || engineer?.name || 'Admin'}
            </h3>
            <span className="px-4 py-1.5 rounded-full bg-blue-50 text-primary border border-blue-100 text-sm font-bold">
              {user?.title || 'Quản trị viên'}
            </span>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-between min-h-[360px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Info label="Họ tên" value={user?.name || engineer?.name || 'Admin'} icon="person" />
              <Info label="Tên đăng nhập" value={user?.username || 'admin'} icon="badge" />
              <Info label="Vai trò" value={user?.title || 'Quản trị viên'} icon="verified_user" />
              <Info label="Email" value={user?.email || engineer?.email || 'admin@titsmart.vn'} icon="mail" />
              <Info label="Số điện thoại" value={user?.phone || engineer?.phone || '0901 234 567'} icon="call" />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3 justify-end">
              <button 
                onClick={() => alert('Chức năng đổi mật khẩu sẽ kết nối API xác thực ở bản đầy đủ.')} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">lock_reset</span>
                Đổi mật khẩu
              </button>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex items-start gap-4 transition-all duration-300 hover:shadow-sm hover:bg-white hover:border-blue-200 group">
    <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{label}</div>
      <div className="text-[15px] font-extrabold text-slate-800 break-words">{value}</div>
    </div>
  </div>
);