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
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: loadSession(),
  login: (username, password) => {
    const account = DEMO_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!account) return { ok: false, error: 'Tên đăng nhập không tồn tại.' };
    if (account.password !== password) return { ok: false, error: 'Mật khẩu không đúng.' };
    const user: AuthUser = {
      id: `user_${account.role}`,
      username: account.username,
      name: account.name,
      role: account.role,
      title: account.title,
      email: account.email,
      phone: account.phone,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    set({ user });
    return { ok: true };
  },
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ user: null });
  },
}));
