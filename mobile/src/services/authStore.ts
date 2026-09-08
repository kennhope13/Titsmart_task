import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Permission } from '../types';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'titsmart_auth_session';

export const getDefaultPermissions = (role: string): Permission[] => {
  if (role === 'admin' || role === 'Quản trị viên') {
    return [
      'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS',
      'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS',
      'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS',
      'VIEW_FINANCE', 'EDIT_PRICES', 'VIEW_PAYMENTS', 'EDIT_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES',
      'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
      'VIEW_USERS', 'MANAGE_USERS', 'MANAGE_PERMISSIONS', 'MANAGE_PAYROLL',
      'EXPORT_DATA'
    ];
  }
  if (role === 'pm' || role === 'Quản lý dự án') {
    return [
      'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS',
      'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS',
      'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS',
      'VIEW_FINANCE', 'VIEW_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES',
      'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
      'VIEW_USERS', 'MANAGE_PAYROLL',
      'EXPORT_DATA'
    ];
  }
  if (role === 'engineer' || role === 'Kỹ sư hiện trường') {
    return [
      'VIEW_PROJECTS',
      'VIEW_TASKS', 'UPDATE_TASK_PROGRESS',
      'VIEW_MATERIALS', 'UPDATE_MATERIAL_STATUS',
      'VIEW_DOCUMENTS', 'MANAGE_DOCUMENTS',
      'VIEW_USERS'
    ];
  }
  return ['VIEW_PROJECTS', 'VIEW_TASKS', 'VIEW_MATERIALS', 'VIEW_DOCUMENTS', 'VIEW_USERS'];
};

export interface AuthUser {
  id: string; username: string; name: string; role: string;
  title: string; email: string; phone: string; avatar?: string;
  projectCodes?: string[]; permissions?: Permission[];
}

export const hasPermission = (user: AuthUser | null | undefined, perm: Permission): boolean => {
  if (!user) return false;
  if (user.username === 'admin') return true;
  return user.permissions?.includes(perm) || false;
};

export const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', name: 'Admin', role: 'admin', title: 'Quản trị viên', email: 'admin@titsmart.vn', phone: '0901 234 567' },
  { username: 'kst', password: '123456', name: 'Lê Minh Khang', role: 'engineer', title: 'Kỹ sư giám sát', email: 'khang.lm@titsmart.vn', phone: '0912 345 678' },
  { username: 'nhanvien', password: '123456', name: 'Trần Văn An', role: 'staff', title: 'Nhân viên', email: 'an.tv@titsmart.vn', phone: '0987 654 321' },
];

interface AuthStoreState {
  user: AuthUser | null;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  login: (usernameOrEmail: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  isLoading: true,

  initAuth: async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      const user = raw ? (JSON.parse(raw) as AuthUser) : null;
      set({ user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  updateUser: (user) => {
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
    set({ user });
  },

  refreshUser: async () => {
    const current = get().user;
    if (!current) return;
    try {
      const { data: engineerData } = await supabase
        .from('engineers').select('*').eq('username', current.username).maybeSingle();
      if (engineerData) {
        const updatedUser = {
          ...current,
          projectCodes: engineerData.project_codes || [],
          permissions: engineerData.permissions || current.permissions,
        };
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  },

  login: async (usernameOrEmail, password) => {
    let email = usernameOrEmail.trim();
    if (!email.includes('@')) email = `${email}@titsmart.vn`;

    const signInRes = await supabase.auth.signInWithPassword({ email, password });
    let data: any = signInRes.data;
    let error = signInRes.error;

    if (error && error.message.includes('Invalid login credentials')) {
      const signUpRes = await supabase.auth.signUp({
        email, password,
        options: { data: { confirmed_at: new Date().toISOString() } },
      });
      if (!signUpRes.error) {
        const retryRes = await supabase.auth.signInWithPassword({ email, password });
        if (!retryRes.error) { data = retryRes.data; error = null; }
        else if (signUpRes.data.user) { data = signUpRes.data; error = null; }
      } else {
        if (!signUpRes.error.message.includes('already registered')) {
          return { ok: false, error: 'Lỗi đăng ký tự động: ' + signUpRes.error.message };
        }
      }
    }

    if (error && error.message.includes('Email not confirmed')) {
      const retrySignUp = await supabase.auth.signUp({ email, password });
      if (!retrySignUp.error && retrySignUp.data.session) { data = retrySignUp.data; error = null; }
      else return { ok: false, error: 'Tài khoản chưa xác thực email.' };
    }

    if (error) return { ok: false, error: 'Tài khoản hoặc mật khẩu không đúng.' };

    if (data.user) {
      const { data: engineerData } = await supabase
        .from('engineers').select('*')
        .or(`email.eq.${email},username.eq.${usernameOrEmail.trim()}`)
        .maybeSingle();

      if (engineerData && (engineerData.is_locked || engineerData.isLocked)) {
        await supabase.auth.signOut();
        return { ok: false, error: 'Tài khoản đã bị khóa.' };
      }

      if (!engineerData && usernameOrEmail.trim() !== 'admin' && email !== 'admin@titsmart.vn') {
        await supabase.auth.signOut();
        return { ok: false, error: 'Tài khoản không tồn tại trong hệ thống.' };
      }

      const account = DEMO_ACCOUNTS.find((acc) => acc.email.toLowerCase() === email.toLowerCase());
      let rawRole = engineerData?.role || account?.role || 'staff';
      let englishRole = rawRole;
      if (rawRole === 'Quản trị viên') englishRole = 'admin';
      if (rawRole === 'Quản lý dự án') englishRole = 'pm';
      if (rawRole === 'Kỹ sư hiện trường') englishRole = 'engineer';
      if (rawRole === 'Nhân viên') englishRole = 'staff';

      const user: AuthUser = {
        id: data.user.id,
        username: engineerData?.username || account?.username || usernameOrEmail.trim(),
        name: engineerData?.name || account?.name || usernameOrEmail.trim(),
        role: englishRole,
        title: engineerData?.title || account?.title || 'Nhân viên',
        email: data.user.email || email,
        phone: engineerData?.phone || account?.phone || '',
        projectCodes: engineerData?.project_codes || [],
        permissions: engineerData?.permissions || getDefaultPermissions(englishRole),
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
      set({ user });
      return { ok: true };
    }
    return { ok: false, error: 'Lỗi không xác định' };
  },

  logout: async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(SESSION_KEY);
    set({ user: null });
  },
}));
