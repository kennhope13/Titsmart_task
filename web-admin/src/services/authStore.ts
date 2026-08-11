import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  title: string;
  email: string;
  phone: string;
  avatar?: string;
}

export interface DemoAccount {
  username: string;
  password: string;
  name: string;
  role: string;
  title: string;
  email: string;
  phone: string;
}

const SESSION_KEY = 'titsmart_auth_session';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    name: 'Admin',
    role: 'admin',
    title: 'Quản trị viên',
    email: 'admin@titsmart.vn',
    phone: '0901 234 567',
  },
  {
    username: 'kst',
    password: '123456',
    name: 'Lê Minh Khang',
    role: 'engineer',
    title: 'Kỹ sư giám sát',
    email: 'khang.lm@titsmart.vn',
    phone: '0912 345 678',
  },
  {
    username: 'nhanvien',
    password: '123456',
    name: 'Trần Văn An',
    role: 'staff',
    title: 'Nhân viên',
    email: 'an.tv@titsmart.vn',
    phone: '0987 654 321',
  },
];

import { supabase } from '../lib/supabase';

const loadSession = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

interface AuthStoreState {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: loadSession(),
  login: async (usernameOrEmail, password) => {
    let email = usernameOrEmail.trim();
    if (!email.includes('@')) {
      email = `${email}@titsmart.vn`;
    }

    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Auto-register if user doesn't exist, then sign in again
    if (error && error.message.includes('Invalid login credentials')) {
      const signUpRes = await supabase.auth.signUp({
        email,
        password,
        options: { data: { confirmed_at: new Date().toISOString() } },
      });
      if (!signUpRes.error) {
        // Try signing in again after registration
        const retryRes = await supabase.auth.signInWithPassword({ email, password });
        if (!retryRes.error) {
          data = retryRes.data;
          error = null;
        } else if (signUpRes.data.user) {
          // If sign-in still fails but signup succeeded, use signup session
          data = signUpRes.data;
          error = null;
        }
      }
    }

    // If email not confirmed, try to sign in via signUp (which returns session for existing user)
    if (error && error.message.includes('Email not confirmed')) {
      // Try signUp again - for existing unconfirmed users, this resends confirmation
      // But we'll also try a workaround: use the anon key directly
      const retrySignUp = await supabase.auth.signUp({ email, password });
      if (!retrySignUp.error && retrySignUp.data.session) {
        data = retrySignUp.data;
        error = null;
      } else {
        // Last resort: return error asking user to confirm email in Supabase dashboard
        return { ok: false, error: 'Tài khoản chưa xác thực email. Vui lòng vào Supabase > Authentication > chọn user > Confirm Email.' };
      }
    }

    if (error) {
      console.error('Supabase login error:', error.message);
      return { ok: false, error: 'Tài khoản hoặc mật khẩu không đúng.' };
    }

    if (data.user) {
      const account = DEMO_ACCOUNTS.find((acc) => acc.email.toLowerCase() === email.toLowerCase());
      
      const user: AuthUser = {
        id: data.user.id,
        username: account?.username || usernameOrEmail.trim(),
        name: account?.name || usernameOrEmail.trim(),
        role: account?.role || 'staff',
        title: account?.title || 'Nhân viên',
        email: data.user.email || email,
        phone: account?.phone || '',
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      set({ user });
      return { ok: true };
    }
    return { ok: false, error: 'Lỗi không xác định' };
  },
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    set({ user: null });
  },
}));
