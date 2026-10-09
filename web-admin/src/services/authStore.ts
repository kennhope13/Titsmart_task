import { create } from 'zustand';
import { Permission } from '../types';

export const getDefaultPermissions = (role: string): Permission[] => {
  if (role === 'admin' || role === 'Quản trị viên') {
    return [
      'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS', 'DELETE_PROJECTS',
      'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS',
      'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS',
      'VIEW_FINANCE', 'EDIT_PRICES', 'VIEW_PAYMENTS', 'EDIT_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS', 'MANAGE_DOCUMENTS', 'VIEW_PROJECT_DIAGRAM', 'MANAGE_PROJECT_DIAGRAM',
      'VIEW_USERS', 'EDIT_USERS', 'MANAGE_USERS', 'MANAGE_PERMISSIONS', 'MANAGE_PAYROLL', 'APPROVE_LEAVE_STEP1', 'APPROVE_LEAVE_FINAL',
      'EXPORT_DATA'
    ];
  }
  if (role === 'pm' || role === 'Quản lý dự án') {
    return [
      'VIEW_PROJECTS', 'CREATE_PROJECTS', 'EDIT_PROJECTS',
      'VIEW_TASKS', 'IMPORT_TASKS', 'EDIT_TASKS', 'ASSIGN_TASKS', 'UPDATE_TASK_PROGRESS', 'APPROVE_TASKS',
      'VIEW_MATERIALS', 'IMPORT_MATERIALS', 'EDIT_MATERIALS', 'UPDATE_MATERIAL_STATUS',
      'VIEW_FINANCE', 'VIEW_PAYMENTS', 'VIEW_EXPENSES', 'EDIT_EXPENSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'MANAGE_DOCUMENTS', 'VIEW_PROJECT_DIAGRAM', 'MANAGE_PROJECT_DIAGRAM',
      'VIEW_USERS', 'MANAGE_PAYROLL', 'APPROVE_LEAVE_STEP1',
      'EXPORT_DATA'
    ];
  }
  if (role === 'engineer' || role === 'Kỹ sư hiện trường') {
    return [
      'VIEW_PROJECTS',
      'VIEW_TASKS', 'UPDATE_TASK_PROGRESS',
      'VIEW_MATERIALS', 'UPDATE_MATERIAL_STATUS',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'MANAGE_DOCUMENTS', 'VIEW_PROJECT_DIAGRAM',
      'VIEW_USERS'
    ];
  }
  // staff
  return [
    'VIEW_PROJECTS',
    'VIEW_TASKS',
    'VIEW_MATERIALS',
    'VIEW_DOCUMENTS',
    'VIEW_USERS'
  ];
};

export const hasPermission = (user: AuthUser | null | undefined, perm: Permission): boolean => {
  if (!user) return false;
  // If user is the hardcoded superadmin
  if (user.username === 'admin') return true;
  return user.permissions?.includes(perm) || false;
};

/**
 * Kiểm tra quyền quản lý (Sửa/Xóa):
 * - Admin / Quản trị viên / PM: Toàn quyền với tất cả file/hồ sơ/dữ liệu
 * - Nhân sự có quyền chi tiết tương ứng (VD: 'MANAGE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_PROJECTS',...): Toàn quyền quản lý
 * - Hoặc chính chủ người tạo/tải lên
 */
export const canManageItem = (user: AuthUser | null | undefined, item: any, requiredPerm: Permission = 'MANAGE_DOCUMENTS'): boolean => {
  if (!user) return false;
  
  const role = String(user.role || '').toLowerCase();
  const username = String(user.username || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'quản trị viên' || role === 'pm' || role === 'quản lý dự án' || role === 'manager' || username === 'admin';
  if (isAdmin) return true;

  // Nếu người dùng được Admin tích chọn quyền chi tiết tương ứng (VD: 'EDIT_PROJECTS', 'DELETE_PROJECTS', 'MANAGE_DOCUMENTS')
  if (requiredPerm && user.permissions && Array.isArray(user.permissions)) {
    if (user.permissions.includes(requiredPerm)) {
      return true;
    }
  }

  if (!item) return false;

  const currentUserId = String(user.id || '').trim().toLowerCase();
  const currentUserName = String(user.name || '').trim().toLowerCase();
  const currentUsername = String(user.username || '').trim().toLowerCase();

  // Đối với dự án (Project), chỉ cho phép sửa/xóa nếu có quyền chi tiết hoặc là người tạo dự án chính thức (createdById)
  if (requiredPerm === 'EDIT_PROJECTS' || requiredPerm === 'DELETE_PROJECTS') {
    const projCreatorId = String(item.createdById || item.created_by_id || item.authorId || item.author_id || '').trim().toLowerCase();
    if (currentUserId && projCreatorId && (currentUserId === projCreatorId || currentUserId.includes(projCreatorId))) {
      return true;
    }
    return false;
  }

  const itemCreatorId = String(
    item.createdById || item.created_by_id || item.uploaderId || item.uploader_id || 
    item.userId || item.user_id || item.authorId || item.author_id || ''
  ).trim().toLowerCase();

  const itemCreatorName = String(
    item.createdByName || item.created_by_name || item.createdBy || item.created_by || 
    item.uploaderName || item.uploader_name || item.author || item.authorName || ''
  ).trim().toLowerCase();

  // 1. Khớp ID người tạo
  if (currentUserId && itemCreatorId && (currentUserId === itemCreatorId || currentUserId.includes(itemCreatorId) || itemCreatorId.includes(currentUserId))) return true;

  // 2. Khớp Tên người tạo
  if (currentUserName && itemCreatorName && (itemCreatorName === currentUserName || itemCreatorName.includes(currentUserName))) return true;

  // 3. Khớp Username người tạo
  if (currentUsername && itemCreatorName && itemCreatorName === currentUsername) return true;

  return false;
};


export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  title: string;
  email: string;
  phone: string;
  avatar?: string;
  projectCodes?: string[];
  permissions?: import('../types').Permission[];
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

const SESSION_KEY = 'titsmart_auth_session';
const AUTH_KEYS = ['titsmart_auth_session', 'auth_user', 'buildcore_auth_user', 'titsmart_user'];

export const saveSession = (user: AuthUser | null) => {
  // 1. Electron IPC Disk File persistence
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.saveSession) {
      window.electronAPI.saveSession(user);
    }
  } catch (_) {}

  // 2. Cookie backup persistence
  try {
    if (typeof document !== 'undefined') {
      if (!user) {
        document.cookie = 'titsmart_auth_user=; path=/; max-age=0; SameSite=Lax';
      } else {
        const encoded = encodeURIComponent(JSON.stringify(user));
        document.cookie = `titsmart_auth_user=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
      }
    }
  } catch (_) {}

  // 3. LocalStorage & SessionStorage multi-key persistence
  if (!user) {
    AUTH_KEYS.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
      try { sessionStorage.removeItem(k); } catch (_) {}
    });
    return;
  }
  const json = JSON.stringify(user);
  AUTH_KEYS.forEach(k => {
    try { localStorage.setItem(k, json); } catch (_) {}
    try { sessionStorage.setItem(k, json); } catch (_) {}
  });
};

const loadSession = (): AuthUser | null => {
  // 1. Check Electron IPC Disk File persistence first
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.loadSessionSync) {
      const electronUser = window.electronAPI.loadSessionSync();
      if (electronUser && (electronUser.id || electronUser.username || electronUser.email)) {
        saveSession(electronUser);
        return electronUser;
      }
    }
  } catch (_) {}

  // 2. Check Cookie persistence
  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.split('; ').find(row => row.startsWith('titsmart_auth_user='));
      if (match) {
        const val = match.split('=')[1];
        if (val) {
          const parsed = JSON.parse(decodeURIComponent(val)) as AuthUser;
          if (parsed && (parsed.id || parsed.username || parsed.email)) {
            saveSession(parsed);
            return parsed;
          }
        }
      }
    }
  } catch (_) {}

  // 3. Check LocalStorage & SessionStorage candidate keys
  for (const k of AUTH_KEYS) {
    try {
      const rawLocal = localStorage.getItem(k);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal) as AuthUser;
        if (parsed && (parsed.id || parsed.username || parsed.email)) {
          saveSession(parsed);
          return parsed;
        }
      }
    } catch (_) {}
    try {
      const rawSession = sessionStorage.getItem(k);
      if (rawSession) {
        const parsed = JSON.parse(rawSession) as AuthUser;
        if (parsed && (parsed.id || parsed.username || parsed.email)) {
          saveSession(parsed);
          return parsed;
        }
      }
    } catch (_) {}
  }
  return null;
};

interface AuthStoreState {
  user: AuthUser | null;
  isLoggingOut: boolean;
  setIsLoggingOut: (val: boolean) => void;
  updateUser: (user: AuthUser) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: loadSession(),
  isLoggingOut: false,
  setIsLoggingOut: (val) => set({ isLoggingOut: val }),
  updateUser: (user) => {
    saveSession(user);
    set({ user });
  },
  refreshUser: async () => {
    const current = get().user;
    if (!current) return;
    try {
      let query = supabase.from('engineers').select('*');
      if (current.username) {
        query = query.eq('username', current.username);
      } else if (current.email) {
        query = query.eq('email', current.email);
      } else if (current.id) {
        query = query.eq('id', current.id);
      }
      const { data: engineerData } = await query.maybeSingle();
      if (engineerData) {
        if (engineerData.is_locked || engineerData.isLocked || engineerData.is_active === false) {
          get().logout();
          window.location.href = '/login';
          return;
        }
        const updatedUser = {
          ...current,
          name: engineerData.name || current.name,
          title: engineerData.title || current.title,
          projectCodes: engineerData.project_codes || engineerData.projectCodes || [],
          permissions: engineerData.permissions || current.permissions,
          role: engineerData.role === 'Quản trị viên' ? 'admin' :
                engineerData.role === 'Quản lý dự án' ? 'pm' :
                engineerData.role === 'Kỹ sư hiện trường' ? 'engineer' : current.role,
        };
        saveSession(updatedUser);
        set({ user: updatedUser });
      }
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  },
  login: async (usernameOrEmail, password) => {
    const cleanUsername = usernameOrEmail.trim();
    let email = cleanUsername;
    if (!email.includes('@')) {
      email = `${cleanUsername}@titsmart.vn`;
    }

    const isSystemAdmin = cleanUsername.toLowerCase() === 'admin' || email.toLowerCase() === 'admin@titsmart.vn';
    const isDefaultAdminPassword = password === 'admin123';

    // 0. Tài khoản Quản trị viên hệ thống cố định (admin / admin123) LUÔN ĐĂNG NHẬP THÀNH CÔNG
    if (isSystemAdmin && isDefaultAdminPassword) {
      let engineerData: any = null;
      try {
        const { data: engRes } = await supabase
          .from('engineers')
          .select('*')
          .or(`email.eq.${email},username.eq.${cleanUsername}`)
          .maybeSingle();
        engineerData = engRes;
      } catch (_) {}

      const user: AuthUser = {
        id: engineerData?.id || 'user-admin',
        username: 'admin',
        name: engineerData?.name || 'Admin',
        role: 'admin',
        title: engineerData?.title || 'Quản trị viên',
        email: engineerData?.email || 'admin@titsmart.vn',
        phone: engineerData?.phone || '0901 234 567',
        projectCodes: engineerData?.project_codes || engineerData?.projectCodes || [],
        permissions: getDefaultPermissions('admin'),
      };
      saveSession(user);
      set({ user });
      return { ok: true };
    }

    const demoAccount = DEMO_ACCOUNTS.find(
      acc => (acc.username.toLowerCase() === cleanUsername.toLowerCase() || acc.email.toLowerCase() === email.toLowerCase()) && acc.password === password
    );

    // 1. Kiểm tra trực tiếp bảng nhân sự (engineers) trong Database
    // Điều này đảm bảo mật khẩu được Admin/Quản lý cập nhật sẽ có hiệu lực ngay lập tức
    let engineerData: any = null;
    try {
      const { data: engRes } = await supabase
        .from('engineers')
        .select('*')
        .or(`email.eq.${email},username.eq.${cleanUsername}`)
        .maybeSingle();
      engineerData = engRes;
    } catch (e) {
      console.warn('Failed to query engineers table:', e);
    }

    if (engineerData) {
      // Kiểm tra trạng thái khóa tài khoản
      if (engineerData.is_locked || engineerData.isLocked || engineerData.is_active === false) {
        return { ok: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' };
      }

      // Nếu trong DB có lưu mật khẩu (do Admin đổi hoặc tạo ban đầu)
      if (engineerData.password && String(engineerData.password).trim() !== '') {
        const isMatch = String(engineerData.password) === String(password) || (isSystemAdmin && isDefaultAdminPassword);
        if (!isMatch) {
          return { ok: false, error: 'Tài khoản hoặc mật khẩu không đúng.' };
        }

        // Mật khẩu khớp chính xác với mật khẩu trong Database!
        let rawRole = engineerData.role || 'staff';
        let englishRole = rawRole;
        if (rawRole === 'Quản trị viên' || isSystemAdmin) englishRole = 'admin';
        if (rawRole === 'Quản lý dự án') englishRole = 'pm';
        if (rawRole === 'Kỹ sư hiện trường') englishRole = 'engineer';
        if (rawRole === 'Nhân viên') englishRole = 'staff';

        const user: AuthUser = {
          id: engineerData.id || 'user-' + cleanUsername,
          username: engineerData.username || cleanUsername,
          name: engineerData.name || cleanUsername,
          role: englishRole,
          title: engineerData.title || engineerData.role || 'Nhân viên',
          email: engineerData.email || email,
          phone: engineerData.phone || '',
          projectCodes: engineerData.project_codes || engineerData.projectCodes || [],
          permissions: engineerData.permissions || getDefaultPermissions(englishRole),
        };

        saveSession(user);
        set({ user });

        // Thử đồng bộ ngầm GoTrue Supabase Auth (nếu có)
        try {
          supabase.auth.signInWithPassword({ email, password }).catch(() => {});
        } catch (_) {}

        return { ok: true };
      }
    }

    // 2. Nếu khớp demoAccount cố định (admin, kst, nhanvien,...)
    if (demoAccount) {
      const user: AuthUser = {
        id: engineerData?.id || 'user-' + demoAccount.username,
        username: demoAccount.username,
        name: engineerData?.name || demoAccount.name,
        role: demoAccount.role,
        title: engineerData?.title || demoAccount.title,
        email: engineerData?.email || demoAccount.email,
        phone: engineerData?.phone || demoAccount.phone,
        projectCodes: engineerData?.project_codes || engineerData?.projectCodes || [],
        permissions: engineerData?.permissions || getDefaultPermissions(demoAccount.role),
      };
      saveSession(user);
      set({ user });
      return { ok: true };
    }

    // 3. Nếu trong DB chưa có cột password, thử qua Supabase Auth GoTrue
    let data: any = null;
    let error: any = null;

    try {
      const signInRes = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      data = signInRes.data;
      error = signInRes.error;

      // Auto-register if user doesn't exist, then sign in again
      if (error && error.message.includes('Invalid login credentials')) {
        const signUpRes = await supabase.auth.signUp({
          email,
          password,
          options: { data: { confirmed_at: new Date().toISOString() } },
        });
        if (!signUpRes.error) {
          const retryRes = await supabase.auth.signInWithPassword({ email, password });
          if (!retryRes.error) {
            data = retryRes.data;
            error = null;
          } else if (signUpRes.data.user) {
            data = signUpRes.data;
            error = null;
          }
        }
      }
    } catch (err) {
      console.warn('Supabase auth request failed:', err);
    }

    if (error) {
      console.error('Supabase login error:', error.message);
      return { ok: false, error: 'Tài khoản hoặc mật khẩu không đúng.' };
    }

    if (data.user) {
      if (engineerData && (engineerData.is_locked || engineerData.isLocked || engineerData.is_active === false)) {
        await supabase.auth.signOut();
        return { ok: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' };
      }

      const account = DEMO_ACCOUNTS.find((acc) => acc.email.toLowerCase() === email.toLowerCase());

      if (!engineerData && cleanUsername !== 'admin' && email !== 'admin@titsmart.vn') {
        await supabase.auth.signOut();
        return { ok: false, error: 'Tài khoản này không tồn tại hoặc đã bị xóa khỏi hệ thống.' };
      }
      
      let rawRole = engineerData?.role || account?.role || 'staff';
      let englishRole = rawRole;
      if (rawRole === 'Quản trị viên') englishRole = 'admin';
      if (rawRole === 'Quản lý dự án') englishRole = 'pm';
      if (rawRole === 'Kỹ sư hiện trường') englishRole = 'engineer';
      if (rawRole === 'Nhân viên') englishRole = 'staff';

      const user: AuthUser = {
        id: data.user.id,
        username: engineerData?.username || account?.username || cleanUsername,
        name: engineerData?.name || account?.name || cleanUsername,
        role: englishRole,
        title: engineerData?.title || account?.title || 'Nhân viên',
        email: data.user.email || email,
        phone: engineerData?.phone || account?.phone || '',
        projectCodes: engineerData?.project_codes || [],
        permissions: engineerData?.permissions || getDefaultPermissions(englishRole),
      };
      saveSession(user);
      set({ user });
      return { ok: true };
    }
    return { ok: false, error: 'Tài khoản hoặc mật khẩu không đúng.' };
  },
  logout: async () => {
    set({ isLoggingOut: true });
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Logout signOut warning:', err);
    } finally {
      saveSession(null);
      set({ user: null });
    }
  },
  changePassword: async (currentPassword, newPassword) => {
    try {
      const user = get().user;
      if (!user) {
        return { ok: false, error: 'Chưa đăng nhập.' };
      }

      let email = user.email || `${user.username}@titsmart.vn`;
      if (!email.includes('@')) {
        email = `${email}@titsmart.vn`;
      }

      // 1. Kiểm tra mật khẩu hiện tại
      const demoAccount = DEMO_ACCOUNTS.find(
        acc => (acc.username.toLowerCase() === user.username?.toLowerCase() || acc.email.toLowerCase() === email.toLowerCase()) && acc.password === currentPassword
      );

      let verifyPassed = Boolean(demoAccount);

      try {
        const verifyRes = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (!verifyRes.error) {
          verifyPassed = true;
        }
      } catch (err) {
        console.warn('Supabase signIn password verify check warning:', err);
      }

      // 2. Nếu kiểm tra với database engineers
      try {
        const { data: engData } = await supabase
          .from('engineers')
          .select('password')
          .or(`email.eq.${email},username.eq.${user.username || ''},id.eq.${user.id || ''}`)
          .maybeSingle();

        if (engData && engData.password && engData.password === currentPassword) {
          verifyPassed = true;
        }
      } catch (err) {
        console.warn('Engineers table password check warning:', err);
      }

      if (!verifyPassed && user.username !== 'admin') {
        return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };
      }

      // 3. Cập nhật mật khẩu trên Supabase Auth
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) {
          console.warn('Supabase updateUser password notice:', updateError.message);
        }
      } catch (err) {
        console.warn('Supabase updateUser call warning:', err);
      }

      // 4. Cập nhật mật khẩu trong bảng engineers nếu có
      try {
        await supabase
          .from('engineers')
          .update({ password: newPassword, updated_at: new Date().toISOString() })
          .or(`email.eq.${email},username.eq.${user.username || ''},id.eq.${user.id || ''}`);
      } catch (err) {
        console.warn('Update engineers password warning:', err);
      }

      // 5. Cập nhật demo accounts trong bộ nhớ nếu là demo
      if (demoAccount) {
        demoAccount.password = newPassword;
      }

      return { ok: true };
    } catch (err: any) {
      console.error('changePassword error:', err);
      return { ok: false, error: err?.message || 'Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.' };
    }
  },
}));
