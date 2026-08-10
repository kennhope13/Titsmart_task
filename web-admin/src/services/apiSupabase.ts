import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

// Ánh xạ CamelCase (của UI) sang snake_case (của Database)
const toSnakeCase = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

// Ánh xạ snake_case (của Database) sang camelCase (của UI)
const toCamelCase = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
};

const mapArray = (arr: any[]) => arr.map(toCamelCase);

export const api = {
  projects: {
    getAll: async () => {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      return mapArray(data || []);
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error) throw error;
      return toCamelCase(data);
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      delete payload.members;
      delete payload.member_ids;
      if (!payload.manager_id || typeof payload.manager_id !== 'string' || payload.manager_id.length < 36) {
         payload.manager_id = null;
      }
      
      const { data: result, error } = await supabase.from('projects').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      delete payload.members;
      delete payload.member_ids;
      if (!payload.manager_id || typeof payload.manager_id !== 'string' || payload.manager_id.length < 36) {
         payload.manager_id = null;
      }
      
      const { data: result, error } = await supabase.from('projects').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  },
  tasks: {
    getAll: async (projectId?: string) => {
      let query = supabase.from('tasks').select('*');
      if (projectId) query = query.eq('project_code', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return mapArray(data || []);
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      if (payload.parent_id === '') payload.parent_id = null;
      if (payload.assigned_engineer_id === '') payload.assigned_engineer_id = null;
      if (payload.assigner_id === '') payload.assigner_id = null;
      if (payload.reviewer_id === '') payload.reviewer_id = null;

      const { data: result, error } = await supabase.from('tasks').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      if (payload.parent_id === '') payload.parent_id = null;
      if (payload.assigned_engineer_id === '') payload.assigned_engineer_id = null;
      if (payload.assigner_id === '') payload.assigner_id = null;
      if (payload.reviewer_id === '') payload.reviewer_id = null;

      const { data: result, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  },
  materials: {
    getAll: async (projectId?: string) => {
      let query = supabase.from('materials').select('*');
      if (projectId) query = query.eq('project_code', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return mapArray(data || []);
    },
    getTransactions: async () => {
      const { data, error } = await supabase.from('inventory_transactions').select('*');
      if (error) throw error;
      return mapArray(data || []);
    },
    createTransaction: async (data: any) => {
      const payload = toSnakeCase(data);
      if (!payload.id) payload.id = uuidv4();
      const { data: result, error } = await supabase.from('inventory_transactions').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    create: async (data: any) => {
      const { data: result, error } = await supabase.from('materials').insert(toSnakeCase(data)).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const { data: result, error } = await supabase.from('materials').update(toSnakeCase(data)).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  },
  issues: {
    getAll: async (projectId?: string) => {
      let query = supabase.from('issues').select('*');
      if (projectId) query = query.eq('project_code', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return mapArray(data || []);
    },
    create: async (data: any) => {
      const { data: result, error } = await supabase.from('issues').insert(toSnakeCase(data)).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const { data: result, error } = await supabase.from('issues').update(toSnakeCase(data)).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('issues').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  },
  engineers: {
    getAll: async () => {
      const { data, error } = await supabase.from('engineers').select('*');
      if (error) throw error;
      return mapArray(data || []);
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('engineers').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const { data: result, error } = await supabase.from('engineers').update(toSnakeCase(data)).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('engineers').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  },
  activityLogs: {
    getAll: async () => {
      const { data, error } = await supabase.from('activity_logs').select('*');
      if (error) throw error;
      return mapArray(data || []);
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('activity_logs').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
  },
  fieldLogs: {
    getAll: async (projectCode?: string) => {
      return []; // Chưa tạo bảng fieldLogs
    },
    create: async (data: any) => {
      return { success: true };
    },
    delete: async (id: string) => {
      return { success: true };
    },
  },
  accounting: {
    getMaterialPlans: async () => [],
    createMaterialPlan: async (data: any) => data,
    updateMaterialPlan: async (id: string, data: any) => data,
    deleteMaterialPlan: async (id: string) => ({ success: true }),

    getPurchasings: async () => [],
    createPurchasing: async (data: any) => data,
    updatePurchasing: async (id: string, data: any) => data,
    deletePurchasing: async (id: string) => ({ success: true }),

    getExpenses: async () => [],
    createExpense: async (data: any) => data,
    updateExpense: async (id: string, data: any) => data,
    deleteExpense: async (id: string) => ({ success: true }),

    getPayrolls: async () => [],
    createPayroll: async (data: any) => data,
    updatePayroll: async (id: string, data: any) => data,
    deletePayroll: async (id: string) => ({ success: true }),

    getDocumentTracks: async () => [],
    createDocumentTrack: async (data: any) => data,
    updateDocumentTrack: async (id: string, data: any) => data,
    deleteDocumentTrack: async (id: string) => ({ success: true }),
  }
};
