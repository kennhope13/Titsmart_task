import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, DEMO_ACCOUNTS } from '../services/authStore';

export const LoginPageVariant: React.FC<{ onSwitchStyle?: () => void }> = ({ onSwitchStyle }) => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Đăng nhập thất bại.');
    }
  };

  const fillAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100/60"></div>
      <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-primary/5"></div>
      <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full bg-blue-200/20"></div>
      <div className="absolute top-24 right-1/3 w-40 h-40 rounded-full border border-primary/5"></div>

      <div className="relative w-full max-w-[420px] px-6 py-8 overflow-y-auto max-h-full">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100 bg-gradient-to-b from-blue-50/70 to-white">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
              <img src="./logo.png" alt="TITSMART" className="w-full h-full object-contain p-1" />
            </div>
            <h1 className="mt-3 text-xl font-extrabold text-primary leading-tight">TITSMART</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">HỆ THỐNG QUẢN LÝ CÔNG VIỆC & DỰ ÁN</p>
          </div>

          <div className="px-8 py-7">
            <h2 className="text-base font-extrabold text-slate-900">Chào mừng trở lại</h2>
            <p className="text-xs text-slate-500 mt-0.5">Đăng nhập vào tài khoản của bạn để tiếp tục</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Tên đăng nhập</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">key</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-semibold text-slate-600">Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                  <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">login</span>
                    Đăng nhập
                  </>
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tài khoản demo</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => fillAccount(acc)}
                    className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center group"
                    title={`${acc.username} / ${acc.password}`}
                  >
                    <div className="text-[11px] font-extrabold text-slate-700 truncate">{acc.name.split(' ').pop()}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate group-hover:text-primary">{acc.username}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/60 text-center">
            <p className="text-[11px] text-slate-400">© {new Date().getFullYear()} TITSMART Project Manager</p>
          </div>
        </div>

        {onSwitchStyle && (
          <button
            type="button"
            onClick={onSwitchStyle}
            className="mx-auto mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:bg-blue-50 hover:text-primary hover:border-blue-200 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">style</span>
            Xem giao diện đăng nhập khác
          </button>
        )}
      </div>
    </div>
  );
};
