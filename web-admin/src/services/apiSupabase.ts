import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { NotificationItem } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

const getCurrentAuditPayload = () => {
  try {
    const raw = localStorage.getItem('titsmart_auth_session');
    const user = raw ? JSON.parse(raw) : null;
    return {
      updated_by: user?.name || user?.username || 'Hệ thống',
      updated_at: new Date().toISOString(),
    };
  } catch {
    return {
      updated_by: 'Hệ thống',
      updated_at: new Date().toISOString(),
    };
  }
};

// Ánh xạ CamelCase (của UI) sang snake_case (của Database)
const toSnakeCase = (obj: any) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key.startsWith('_') || key === 'subTasks' || key === 'children' || key === 'computedStt' || key === 'isSec' || key === 'depth' || key === 'projectId') continue;
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
    }
  }
  const audit = getCurrentAuditPayload();
  if (result.updated_by === undefined && obj.updatedBy !== undefined) result.updated_by = obj.updatedBy || audit.updated_by;
  if (result.updated_at === undefined && obj.updatedAt !== undefined) result.updated_at = obj.updatedAt || audit.updated_at;
  // If explicitly updated in local action but not passed, populate if field was present in obj or if obj is mutation
  if (obj.updatedBy === undefined && obj.updatedAt === undefined) {
    result.updated_by = audit.updated_by;
    result.updated_at = audit.updated_at;
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
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_by;
          delete payload.updated_at;
          delete payload.diagram_url;
          const { data: retryResult, error: retryError } = await supabase.from('projects').insert(payload).select().single();
          if (retryError) throw retryError;
          const audit = getCurrentAuditPayload();
          return toCamelCase({ updated_by: audit.updated_by, updated_at: audit.updated_at, ...data, ...retryResult });
        }
        throw error;
      }
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
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_by;
          delete payload.updated_at;
          const retryPayload = { ...payload };
          if (error.message.includes('diagram_url')) {
            delete retryPayload.diagram_url;
          }
          const { data: retryResult, error: retryError } = await supabase.from('projects').update(retryPayload).eq('id', id).select().single();
          if (retryError) {
            if (retryError.code === 'PGRST204' || String(retryError.message).includes('diagram_url')) {
              delete retryPayload.diagram_url;
              const { data: retry2, error: err2 } = await supabase.from('projects').update(retryPayload).eq('id', id).select().single();
              if (err2) throw err2;
              const audit = getCurrentAuditPayload();
              return toCamelCase({ updated_by: audit.updated_by, updated_at: audit.updated_at, ...data, ...retry2 });
            }
            throw retryError;
          }
          const audit = getCurrentAuditPayload();
          return toCamelCase({ updated_by: audit.updated_by, updated_at: audit.updated_at, ...data, ...retryResult });
        }
        throw error;
      }
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
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.is_section_header;
          delete payload.section_name;
          delete payload.project_name;
          delete payload.assigned_engineer_name;
          delete payload.assigner_name;
          delete payload.updated_by;
          delete payload.updated_at;
          const { data: retryResult, error: retryError } = await supabase.from('tasks').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase({ ...data, ...retryResult });
        }
        throw error;
      }
      return toCamelCase(result);
    },
    createBatch: async (dataArray: any[]) => {
      const payloads = dataArray.map(data => {
        const payload = toSnakeCase(data);
        if (payload.parent_id === '') payload.parent_id = null;
        if (payload.assigned_engineer_id === '') payload.assigned_engineer_id = null;
        if (payload.assigner_id === '') payload.assigner_id = null;
        if (payload.reviewer_id === '') payload.reviewer_id = null;
        return payload;
      });

      const { data: result, error } = await supabase.from('tasks').insert(payloads).select();
      if (error) {
        console.warn('Fallback: saving tasks batch without new columns. Error was:', error);
        payloads.forEach(p => {
           delete p.is_section_header;
           delete p.section_name;
           delete p.project_name;
           delete p.assigned_engineer_name;
           delete p.assigner_name;
           delete p.reviewer_id;
           delete p.reviewer_name;
           delete p.assigner_id;
           delete p.due_date;
           delete p.priority;
           delete p.created_at;
           delete p.issue;
           delete p.issue_status;
        });
        const { data: retryResult, error: retryError } = await supabase.from('tasks').insert(payloads).select();
        if (retryError) throw retryError;
        return mapArray(retryResult || []).map((t: any, i: number) => ({
           ...dataArray[i],
           ...t
        }));
      }
      return mapArray(result || []);
    },
    update: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      if (payload.parent_id === '') payload.parent_id = null;
      if (payload.assigned_engineer_id === '') payload.assigned_engineer_id = null;
      if (payload.assigner_id === '') payload.assigner_id = null;
      if (payload.reviewer_id === '') payload.reviewer_id = null;

      const { data: result, error } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') throw new Error('Dữ liệu không tồn tại trên máy chủ (có thể đã bị xóa bởi người khác). Vui lòng F5 tải lại trang.');
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.is_section_header;
          delete payload.section_name;
          delete payload.project_name;
          delete payload.assigned_engineer_name;
          delete payload.assigner_name;
          delete payload.updated_by;
          delete payload.updated_at;
          const { data: retryResult, error: retryError } = await supabase.from('tasks').update(payload).eq('id', id).select().single();
          if (retryError) {
             if (retryError.code === 'PGRST116') throw new Error('Dữ liệu không tồn tại trên máy chủ (có thể đã bị xóa bởi người khác). Vui lòng F5 tải lại trang.');
             throw retryError;
          }
          const audit = getCurrentAuditPayload();
          return toCamelCase({ updated_by: audit.updated_by, updated_at: audit.updated_at, ...data, ...retryResult });
        }
        throw error;
      }
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
      
      // material_id in Postgres is UUID. If it's a local temp ID (mat-1789...), strip it
      if (payload.material_id && !UUID_RE.test(String(payload.material_id))) {
        delete payload.material_id;
      }

      // Loại bỏ các trường không thuộc bảng inventory_transactions
      const allowedKeys = ['id', 'type', 'date', 'material_id', 'material_code', 'material_name', 'specs', 'category', 'unit', 'quantity', 'source_or_project', 'receiver_name', 'notes', 'created_at'];
      const sanitizedPayload: any = {};
      for (const key of Object.keys(payload)) {
        if (allowedKeys.includes(key)) {
          sanitizedPayload[key] = payload[key];
        }
      }

      const { data: result, error } = await supabase.from('inventory_transactions').insert(sanitizedPayload).select().single();
      if (error) throw error;
      
      // Update material stock by ID or Code
      const matIdOrCode = data.materialId || data.materialCode;
      if (matIdOrCode) {
        let matQuery = supabase.from('materials').select('id, initial_stock, total_import, total_export');
        if (UUID_RE.test(String(matIdOrCode))) {
          matQuery = matQuery.eq('id', matIdOrCode);
        } else {
          matQuery = matQuery.eq('code', String(matIdOrCode));
        }
        const { data: currentMatList } = await matQuery;
        const currentMat = currentMatList?.[0];
        if (currentMat) {
          const isImport = data.type === 'IMPORT';
          const qty = Number(data.quantity) || 0;
          const initialStock = Number(currentMat.initial_stock) || 0;
          const newImport = (Number(currentMat.total_import) || 0) + (isImport ? qty : 0);
          const newExport = (Number(currentMat.total_export) || 0) + (!isImport ? qty : 0);
          const currentStock = initialStock + newImport - newExport;
          
          await supabase.from('materials').update({
            total_import: newImport,
            total_export: newExport,
            current_stock: currentStock
          }).eq('id', currentMat.id);
        }
      }
      
      return toCamelCase(result);
    },
    updateTransaction: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      const allowedKeys = ['type', 'date', 'material_id', 'material_code', 'material_name', 'specs', 'category', 'unit', 'quantity', 'source_or_project', 'receiver_name', 'notes', 'updated_at', 'updated_by'];
      const sanitizedPayload: any = {};
      for (const key of Object.keys(payload)) {
        if (allowedKeys.includes(key)) {
          sanitizedPayload[key] = payload[key];
        }
      }
      const { data: result, error } = await supabase.from('inventory_transactions').update(sanitizedPayload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column') || String(error.message).includes('updated_at') || String(error.message).includes('updated_by')) {
          delete sanitizedPayload.updated_at;
          delete sanitizedPayload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('inventory_transactions').update(sanitizedPayload).eq('id', id).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    deleteTransaction: async (id: string) => {
      const { error } = await supabase.from('inventory_transactions').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      if (payload.id && String(payload.id).startsWith('mat-')) {
        delete payload.id;
      }
      
      const allowedKeys = [
        'code', 'name', 'english_name', 'project_code', 'project_name',
        'volume', 'initial_stock', 'current_stock', 'total_import', 'total_export',
        'unit', 'unit_price', 'status', 'constr_status', 'supplier', 'specs', 'category', 'notes',
        'created_at', 'updated_at', 'updated_by'
      ];
      const sanitizedPayload: any = {};
      for (const key of Object.keys(payload)) {
        if (allowedKeys.includes(key)) {
          sanitizedPayload[key] = payload[key];
        }
      }

      const { data: result, error } = await supabase.from('materials').insert(sanitizedPayload).select().single();
      if (error) {
        console.error('Supabase error inserting material:', error, sanitizedPayload);
        // Handle foreign key constraint if project_code (e.g. 'COMPANY') is missing from projects table
        if (error.code === '23503' || String(error.message).includes('foreign key constraint') || String(error.message).includes('materials_project_code_fkey')) {
          const projCode = sanitizedPayload.project_code || 'COMPANY';
          await supabase.from('projects').insert({
            name: projCode === 'COMPANY' ? 'Kho Tổng (Kho Công Ty)' : projCode,
            code: projCode,
            status: 'active',
            location: 'Kho Công ty',
            client: 'Nội bộ'
          });
          const { data: retryResult, error: retryError } = await supabase.from('materials').insert(sanitizedPayload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete sanitizedPayload.updated_at;
          delete sanitizedPayload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('materials').insert(sanitizedPayload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      if (Object.keys(payload).length === 0) return { id };

      const allowedKeys = [
        'code', 'name', 'english_name', 'project_code', 'project_name',
        'volume', 'initial_stock', 'current_stock', 'total_import', 'total_export',
        'unit', 'unit_price', 'status', 'constr_status', 'supplier', 'specs', 'category', 'notes',
        'created_at', 'updated_at', 'updated_by'
      ];
      const sanitizedPayload: any = {};
      for (const key of Object.keys(payload)) {
        if (allowedKeys.includes(key)) {
          sanitizedPayload[key] = payload[key];
        }
      }

      let query = supabase.from('materials').update(sanitizedPayload);
      if (UUID_RE.test(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('code', id);
      }

      const { data: result, error } = await query.select();
      if (error) {
        if (error.code === 'PGRST116') throw new Error('Dữ liệu không tồn tại trên máy chủ (có thể đã bị xóa bởi người khác). Vui lòng F5 tải lại trang.');
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete sanitizedPayload.updated_at;
          delete sanitizedPayload.updated_by;
          let retryQuery = supabase.from('materials').update(sanitizedPayload);
          if (UUID_RE.test(id)) retryQuery = retryQuery.eq('id', id);
          else retryQuery = retryQuery.eq('code', id);
          const { data: retryResult, error: retryError } = await retryQuery.select();
          if (retryError) throw retryError;
          return toCamelCase(retryResult?.[0] || { id, ...data });
        }
        throw error;
      }
      return toCamelCase(result?.[0] || { id, ...data });
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
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column') || String(error.message).includes('password')) {
          delete payload.updated_by;
          delete payload.updated_at;
          const { data: retryResult, error: retryError } = await supabase.from('engineers').insert(payload).select().single();
          if (retryError) {
            delete payload.password;
            const { data: finalResult, error: finalError } = await supabase.from('engineers').insert(payload).select().single();
            if (finalError) throw finalError;
            return toCamelCase(finalResult);
          }
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    update: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('engineers').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column') || String(error.message).includes('password')) {
          delete payload.updated_by;
          delete payload.updated_at;
          const { data: retryResult, error: retryError } = await supabase.from('engineers').update(payload).eq('id', id).select().single();
          if (retryError) {
            delete payload.password;
            const { data: finalResult, error: finalError } = await supabase.from('engineers').update(payload).eq('id', id).select().single();
            if (finalError) throw finalError;
            return toCamelCase(finalResult);
          }
          return toCamelCase(retryResult);
        }
        throw error;
      }
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
      const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
      if (error) throw error;
      return mapArray(data || []);
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('activity_logs').insert(payload).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('activity_logs').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
  },

  accounting: {
    getMaterialPlans: async () => {
      const { data, error } = await supabase.from('material_plans').select('*');
      if (error) throw error;
      return data.map(toCamelCase);
    },
    createMaterialPlan: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('material_plans').insert(payload).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column') || String(error.message).includes('updated_at') || String(error.message).includes('updated_by')) {
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('material_plans').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    createMaterialPlanBatch: async (dataArray: any[]) => {
      const payloads = dataArray.map(toSnakeCase);
      const { data: result, error } = await supabase.from('material_plans').insert(payloads).select();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column') || String(error.message).includes('dispatch_to_site')) {
          const allowedKeys = ['id', 'parent_id', 'project_code', 'stt', 'job_content', 'unit', 'contract_volume', 'tech_spec_model', 'tech_spec_origin', 'tech_spec_status', 'progress_status', 'ordered_volume', 'ordered_status', 'expected_date', 'issue_content', 'issue_status', 'doc_co', 'doc_cq', 'doc_fire_inspection', 'supply_scope', 'notes'];
          const cleanedPayloads = payloads.map(p => {
            const cleanObj: any = {};
            for (const key of Object.keys(p)) {
              if (allowedKeys.includes(key)) cleanObj[key] = p[key];
            }
            return cleanObj;
          });
          const { data: retryResult, error: retryError } = await supabase.from('material_plans').insert(cleanedPayloads).select();
          if (retryError) throw retryError;
          return mapArray(retryResult || []);
        }
        throw error;
      }
      return mapArray(result || []);
    },
    updateMaterialPlan: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      if (Object.keys(payload).length === 0) return { id, ...data };

      const allowedKeys = ['parent_id', 'project_code', 'stt', 'job_content', 'unit', 'contract_volume', 'tech_spec_model', 'tech_spec_origin', 'tech_spec_status', 'ordered_volume', 'ordered_status', 'expected_date', 'issue_content', 'issue_status', 'doc_co', 'doc_cq', 'doc_fire_inspection', 'dispatch_to_site', 'supply_scope', 'notes', 'updated_by', 'updated_at'];
      const cleanedPayload: any = {};
      for (const key of Object.keys(payload)) {
        if (allowedKeys.includes(key)) cleanedPayload[key] = payload[key];
      }

      try {
        const { data: result, error } = await supabase.from('material_plans').update(cleanedPayload).eq('id', id).select();
        if (error) {
          delete cleanedPayload.updated_at;
          delete cleanedPayload.updated_by;
          delete cleanedPayload.progress_status;
          const { data: retryResult } = await supabase.from('material_plans').update(cleanedPayload).eq('id', id).select();
          const row1 = Array.isArray(retryResult) && retryResult.length > 0 ? retryResult[0] : { id, ...cleanedPayload };
          return { ...data, ...toCamelCase(row1) };
        }
        const row = Array.isArray(result) && result.length > 0 ? result[0] : { id, ...cleanedPayload };
        return { ...data, ...toCamelCase(row) };
      } catch (err) {
        return { id, ...data };
      }
    },
    deleteMaterialPlan: async (id: string) => {
      const { error } = await supabase.from('material_plans').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    getPurchasings: async () => {
      const { data, error } = await supabase.from('purchasing_plans').select('*');
      if (error) throw error;
      return data.map(toCamelCase);
    },
    createPurchasing: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('purchasing_plans').insert(payload).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.parent_id;
          delete payload.material_plan_id;
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('purchasing_plans').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase({ ...retryResult, parent_id: data.parentId, material_plan_id: data.materialPlanId });
        }
        throw error;
      }
      return toCamelCase(result);
    },
    createPurchasingBatch: async (dataArray: any[]) => {
      const payloads = dataArray.map(toSnakeCase);
      const { data: result, error } = await supabase.from('purchasing_plans').insert(payloads).select();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          const allowedKeys = ['id', 'project_code', 'stt', 'content', 'unit', 'volume_contract', 'volume_order', 'unit_price', 'vat_rate', 'vat_amount', 'total_amount', 'prepay_percent', 'prepay_amount', 'remaining_amount', 'order_status', 'contract_status', 'invoice_status', 'notes', 'expected_date', 'payment_date'];
          const cleanedPayloads = payloads.map(p => {
            const cleanObj: any = {};
            for (const key of Object.keys(p)) {
              if (allowedKeys.includes(key)) cleanObj[key] = p[key];
            }
            return cleanObj;
          });
          const { data: retryResult, error: retryError } = await supabase.from('purchasing_plans').insert(cleanedPayloads).select();
          if (retryError) throw retryError;
          return retryResult.map((r: any, i: number) => toCamelCase({ ...r, parent_id: dataArray[i].parentId, material_plan_id: dataArray[i].materialPlanId }));
        }
        throw error;
      }
      return mapArray(result || []);
    },
    updatePurchasing: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      if (Object.keys(payload).length === 0) return { id };
      const { data: result, error } = await supabase.from('purchasing_plans').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') throw new Error('Dữ liệu không tồn tại trên máy chủ (có thể đã bị xóa bởi người khác). Vui lòng F5 tải lại trang.');
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.parent_id;
          delete payload.material_plan_id;
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('purchasing_plans').update(payload).eq('id', id).select().single();
          if (retryError) {
            if (retryError.code === 'PGRST116') throw new Error('Dữ liệu không tồn tại trên máy chủ (có thể đã bị xóa bởi người khác). Vui lòng F5 tải lại trang.');
            throw retryError;
          }
          return toCamelCase({ ...retryResult, parent_id: data.parentId, material_plan_id: data.materialPlanId });
        }
        throw error;
      }
      return toCamelCase(result);
    },
    deletePurchasing: async (id: string) => {
      const { error } = await supabase.from('purchasing_plans').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    getExpenses: async () => {
      const { data, error } = await supabase.from('expenses').select('*');
      if (error) throw error;
      return data.map(toCamelCase);
    },
    createExpense: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('expenses').insert(payload).select().single();
      if (error) {
        // Handle foreign key constraint error if 'OFFICE' project row doesn't exist yet in projects table
        if (error.code === '23503' || String(error.message).includes('foreign key constraint') || String(error.message).includes('expenses_project_code_fkey')) {
          const projCode = payload.project_code || 'OFFICE';
          await supabase.from('projects').insert({
            name: projCode === 'OFFICE' ? 'Văn phòng' : projCode,
            code: projCode,
            status: 'active',
            location: 'Văn phòng Công ty',
            client: 'Nội bộ',
            notes: 'Chi phí văn phòng'
          });
          const { data: retryResult, error: retryError } = await supabase.from('expenses').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('expenses').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    updateExpense: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('expenses').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('expenses').update(payload).eq('id', id).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    deleteExpense: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    getLaborPayrolls: async () => {
      const { data, error } = await supabase.from('labor_payrolls').select('*');
      if (error) throw error;
      return data.map(toCamelCase);
    },
    createLaborPayroll: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('labor_payrolls').insert(payload).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('labor_payrolls').insert(payload).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    updateLaborPayroll: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('labor_payrolls').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.updated_at;
          delete payload.updated_by;
          const { data: retryResult, error: retryError } = await supabase.from('labor_payrolls').update(payload).eq('id', id).select().single();
          if (retryError) throw retryError;
          return toCamelCase(retryResult);
        }
        throw error;
      }
      return toCamelCase(result);
    },
    deleteLaborPayroll: async (id: string) => {
      const { error } = await supabase.from('labor_payrolls').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    getDocumentTracks: async () => {
      // In local mode, fallback to empty array so local storage takes precedence
      try {
        const { data, error } = await supabase.from('document_tracks').select('*');
        if (error) return [];
        return (data || []).map((row: any) => ({
          id: row.id,
          stt: row.stt || '',
          contractNo: row.contract_no || (row.contract_name && row.contract_name.startsWith('[') && row.contract_name.includes(']') ? row.contract_name.split(']')[0].replace('[', '') : (row.notes && row.notes.startsWith('[') && row.notes.includes(']') ? row.notes.split(']')[0].replace('[', '') : '')),
          contractName: (row.contract_name && row.contract_name.startsWith('[') && row.contract_name.includes(']')) ? row.contract_name.split(']').slice(1).join(']').trim() : (row.contract_name || (row.notes && row.notes.startsWith('[') && row.notes.includes(']') ? row.notes.split(']').slice(1).join(']').trim() : (row.notes || ''))),
          projectCode: row.project_code || '',
          company: row.company || (row.recipient && row.recipient.includes(' - ') ? row.recipient.split(' - ')[0] : (row.recipient || '')),
          receiverName: row.receiver_name || (row.recipient && row.recipient.includes(' - ') ? row.recipient.split(' - ')[1] : (row.recipient || '')),
          phone: row.phone || '',
          address: row.address || '',
          sendDate: row.send_date || row.submission_date || '',
          receiveDate: row.receive_date || '',
          docStatus: row.doc_status || row.status || 'Chưa ký',
          docType: row.doc_type || row.document_type || 'Giao',
          side: row.side || 'Bên trả',
          contractValue: row.contract_value || 0,
          prepayPercent: row.prepay_percent || 0,
          prepayAmount: row.prepay_amount || 0,
          paymentStatus: row.payment_status || 'Chưa thanh toán',
          isCompleted: !!row.is_completed,
          notes: row.notes || '',
          dueDate: row.due_date || row.expected_approval_date || '',
          remindDays: row.remind_days || 3,
          fileUrls: row.file_urls || [],
          updatedBy: row.updated_by || '',
          updatedAt: row.updated_at || '',
        }));
      } catch {
        return [];
      }
    },
    createDocumentTrack: async (data: any) => {
      const cleanDate = (d: any) => {
        if (!d || typeof d !== 'string') return null;
        const trimmed = d.trim();
        return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.split('T')[0] : null;
      };

      const fullPayload: any = {
        contract_no: data.contractNo || '',
        contract_name: data.contractName || '',
        project_code: data.projectCode || null,
        company: data.company || '',
        receiver_name: data.receiverName || '',
        phone: data.phone || '',
        address: data.address || '',
        send_date: cleanDate(data.sendDate),
        receive_date: cleanDate(data.receiveDate),
        doc_status: data.docStatus || 'Chưa ký',
        doc_type: data.docType || 'Giao',
        side: data.side || 'Bên trả',
        contract_value: data.contractValue || 0,
        prepay_percent: data.prepayPercent || 0,
        prepay_amount: data.prepayAmount || 0,
        payment_status: data.paymentStatus || 'Chưa thanh toán',
        is_completed: !!data.isCompleted,
        notes: data.notes || '',
        due_date: cleanDate(data.dueDate),
        remind_days: data.remindDays || 3,
        updated_by: data.updatedBy || '',
        updated_at: data.updatedAt || new Date().toISOString()
      };

      try {
        const { data: result, error } = await supabase.from('document_tracks').insert(fullPayload).select().single();
        if (error) {
          console.warn('[DocumentTrack] fullPayload insert error:', error.message, error.details, error.hint, error.code);
        } else if (result) {
          console.log('[DocumentTrack] Successfully inserted via fullPayload:', result);
          return toCamelCase(result);
        }
      } catch (err) {
        console.warn('[DocumentTrack] fullPayload insert exception:', err);
      }

      // Fallback for minimal standard schema (local/cloud before ALTER TABLE)
      const formattedContractName = data.contractNo
        ? (data.contractName ? `[${data.contractNo}] ${data.contractName}` : data.contractNo)
        : (data.contractName || '');

      const minPayload: any = {
        document_type: data.docType || 'Giao',
        submission_date: cleanDate(data.sendDate),
        recipient: data.company ? (data.receiverName ? `${data.company} - ${data.receiverName}` : data.company) : (data.receiverName || ''),
        status: data.docStatus || 'Chưa ký',
        notes: data.notes || formattedContractName
      };
      if (data.projectCode) minPayload.project_code = data.projectCode;
      if (cleanDate(data.dueDate)) minPayload.expected_approval_date = cleanDate(data.dueDate);

      try {
        const { data: retryResult, error: retryError } = await supabase.from('document_tracks').insert(minPayload).select().single();
        if (retryError) {
          console.warn('[DocumentTrack] minPayload insert error, trying ultraMinPayload:', retryError.message);
          const ultraMinPayload: any = {
            submission_date: cleanDate(data.sendDate),
            recipient: data.company ? (data.receiverName ? `${data.company} - ${data.receiverName}` : data.company) : (data.receiverName || ''),
            status: data.docStatus || 'Chưa ký',
            notes: data.notes || formattedContractName
          };
          if (data.projectCode) ultraMinPayload.project_code = data.projectCode;
          if (cleanDate(data.dueDate)) ultraMinPayload.expected_approval_date = cleanDate(data.dueDate);

          const { data: ultraResult, error: ultraError } = await supabase.from('document_tracks').insert(ultraMinPayload).select().single();
          if (ultraError) {
            console.error('[DocumentTrack] ultraMinPayload insert error:', ultraError);
            throw ultraError;
          }
          console.log('[DocumentTrack] Successfully inserted via ultraMinPayload:', ultraResult);
          return { ...data, ...toCamelCase(ultraResult), id: ultraResult.id };
        }
        console.log('[DocumentTrack] Successfully inserted via minPayload:', retryResult);
        return { ...data, ...toCamelCase(retryResult), id: retryResult.id };
      } catch (err) {
        console.error('[DocumentTrack] Supabase insert failed, maintaining local state:', err);
        return { id: data.id || `doc-${Date.now()}`, ...data };
      }
    },
    updateDocumentTrack: async (id: string, data: any) => {
      const cleanDate = (d: any) => {
        if (!d || typeof d !== 'string') return null;
        const trimmed = d.trim();
        return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.split('T')[0] : null;
      };

      const fullPayload: any = {};
      if (data.contractNo !== undefined) fullPayload.contract_no = data.contractNo;
      if (data.contractName !== undefined) fullPayload.contract_name = data.contractName;
      if (data.projectCode !== undefined) fullPayload.project_code = data.projectCode;
      if (data.company !== undefined) fullPayload.company = data.company;
      if (data.receiverName !== undefined) {
        fullPayload.receiver_name = data.receiverName;
        fullPayload.recipient = data.receiverName;
      }
      if (data.phone !== undefined) fullPayload.phone = data.phone;
      if (data.address !== undefined) fullPayload.address = data.address;
      if (data.sendDate !== undefined) {
        fullPayload.send_date = cleanDate(data.sendDate);
        fullPayload.submission_date = cleanDate(data.sendDate);
      }
      if (data.receiveDate !== undefined) fullPayload.receive_date = cleanDate(data.receiveDate);
      if (data.docStatus !== undefined) {
        fullPayload.doc_status = data.docStatus;
        fullPayload.status = data.docStatus;
      }
      if (data.docType !== undefined) {
        fullPayload.doc_type = data.docType;
        fullPayload.document_type = data.docType;
      }
      if (data.side !== undefined) fullPayload.side = data.side;
      if (data.contractValue !== undefined) fullPayload.contract_value = data.contractValue;
      if (data.prepayPercent !== undefined) fullPayload.prepay_percent = data.prepayPercent;
      if (data.prepayAmount !== undefined) fullPayload.prepay_amount = data.prepayAmount;
      if (data.paymentStatus !== undefined) fullPayload.payment_status = data.paymentStatus;
      if (data.isCompleted !== undefined) fullPayload.is_completed = !!data.isCompleted;
      if (data.notes !== undefined) fullPayload.notes = data.notes;
      if (data.dueDate !== undefined) {
        fullPayload.due_date = cleanDate(data.dueDate);
        fullPayload.expected_approval_date = cleanDate(data.dueDate);
      }
      if (data.remindDays !== undefined) fullPayload.remind_days = data.remindDays;
      if (data.updatedBy !== undefined) fullPayload.updated_by = data.updatedBy;
      fullPayload.updated_at = new Date().toISOString();

      try {
        const { data: res, error } = await supabase.from('document_tracks').update(fullPayload).eq('id', id).select().single();
        if (error) {
          console.warn('[DocumentTrack] update error with fullPayload, trying fallback:', error.message);
          const minPayload: any = {};
          if (data.docType !== undefined) minPayload.document_type = data.docType;
          if (data.sendDate !== undefined) minPayload.submission_date = cleanDate(data.sendDate);
          if (data.receiverName !== undefined) minPayload.recipient = data.receiverName;
          if (data.docStatus !== undefined) minPayload.status = data.docStatus;
          if (data.dueDate !== undefined) minPayload.expected_approval_date = cleanDate(data.dueDate);
          if (data.notes !== undefined) minPayload.notes = data.notes;
          if (data.projectCode !== undefined) minPayload.project_code = data.projectCode;
          if (data.contractName !== undefined) minPayload.contract_name = data.contractName;
          if (data.address !== undefined) minPayload.address = data.address;
          await supabase.from('document_tracks').update(minPayload).eq('id', id);
        } else if (res) {
          return { id, ...data, ...toCamelCase(res) };
        }
      } catch (err) {
        console.warn('Failed to update document track in DB:', err);
      }
      return { id, ...data };
    },
    deleteDocumentTrack: async (id: string) => {
      try {
        await supabase.from('document_tracks').delete().eq('id', id);
      } catch {
        // Ignore
      }
      return { success: true };
    },
  },
  fieldLogs: {
    getAll: async () => {
      const { data, error } = await supabase.from('field_logs').select('*');
      if (error) throw error;
      return data.map((d: any) => ({
        id: d.id,
        projectCode: d.project_code,
        note: d.notes,
        images: d.photos || [],
        timestamp: d.created_at,
        taskId: d.task_id,
      }));
    },
    create: async (data: any) => {
      const payload = {
        project_code: data.projectCode,
        notes: data.note,
        photos: data.images,
        task_id: data.taskId || null,
      };
      const { data: result, error } = await supabase.from('field_logs').insert(payload).select().single();
      if (error) throw error;
      return {
        id: result.id,
        projectCode: result.project_code,
        note: result.notes,
        images: result.photos || [],
        timestamp: result.created_at,
        taskId: result.task_id,
      };
    },
    delete: async (id: string) => {
      const { data } = await supabase.from('field_logs').select('photos').eq('id', id).single();
      if (data && data.photos && data.photos.length > 0) {
        const paths = data.photos.map((url: any) => typeof url === 'string' ? url.split('titsmart-images/')[1] : null).filter(Boolean);
        if (paths.length > 0) await supabase.storage.from('titsmart-images').remove(paths);
      }
      const { error } = await supabase.from('field_logs').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, data: any) => {
      const payload: any = {};
      if (data.note !== undefined) payload.notes = data.note;
      if (data.taskId !== undefined) payload.task_id = data.taskId || null;
      if (data.images || data.existingImages) {
        payload.photos = [...(data.existingImages || []), ...(data.images || [])];
        const { data: oldData } = await supabase.from('field_logs').select('photos').eq('id', id).single();
        if (oldData && oldData.photos) {
           const removed = oldData.photos.filter((url: any) => !payload.photos.includes(url));
           if (removed.length > 0) {
              const paths = removed.map((url: any) => typeof url === 'string' ? url.split('titsmart-images/')[1] : null).filter(Boolean);
              if (paths.length > 0) await supabase.storage.from('titsmart-images').remove(paths);
           }
        }
      }
      const { data: result, error } = await supabase.from('field_logs').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return {
        id: result.id,
        projectCode: result.project_code,
        note: result.notes,
        images: result.photos || [],
        timestamp: result.created_at,
      };
    },
  },
  notifications: {
    create: async (data: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
      const payload = {
        title: data.title,
        message: data.message,
        type: data.type,
        icon: data.icon,
        read: false,
        timestamp: new Date().toISOString()
      };
      const { data: result, error } = await supabase.from('notifications').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    getAll: async () => {
      const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
      if (error) throw error;
      return mapArray(data || []);
    },
    markRead: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    clear: async () => {
      const { error } = await supabase.from('notifications').delete().neq('id', '0');
      if (error) throw error;
      return { success: true };
    }
  },
  attendance: {
    getAll: async () => {
      const { data, error } = await supabase.from('activity_logs').select('*').eq('icon', 'ATTENDANCE_SESSION').order('timestamp', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => {
        try {
          const payload = JSON.parse(row.action);
          return { id: row.id, ...payload };
        } catch { return null; }
      }).filter(Boolean);
    },
    getByUser: async (userId: string) => {
      const { data, error } = await supabase.from('activity_logs').select('*').eq('icon', 'ATTENDANCE_SESSION').order('timestamp', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => {
        try {
          const payload = JSON.parse(row.action);
          if (payload.userId !== userId) return null;
          return { id: row.id, ...payload };
        } catch { return null; }
      }).filter(Boolean);
    },
    getToday: async (userId: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from('activity_logs').select('*').eq('icon', 'ATTENDANCE_SESSION').gte('timestamp', today.toISOString()).order('timestamp', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => {
        try {
          const payload = JSON.parse(row.action);
          if (payload.userId !== userId) return null;
          return { id: row.id, ...payload };
        } catch { return null; }
      }).filter(Boolean);
    },
    checkIn: async (input: { userId: string; userName: string; projectId?: string; projectName?: string; checkInImage?: string; notes?: string }) => {
      const payloadData = {
        userId: input.userId,
        userName: input.userName,
        projectId: input.projectId || null,
        projectName: input.projectName || null,
        checkInTime: new Date().toISOString(),
        checkOutTime: null,
        checkInImage: input.checkInImage || null,
        checkOutImage: null,
        notes: input.notes || null,
      };
      const payload = {
        user: input.userName,
        project: input.projectName || '',
        icon: 'ATTENDANCE_SESSION',
        action: JSON.stringify(payloadData),
        timestamp: payloadData.checkInTime,
      };
      const { data, error } = await supabase.from('activity_logs').insert(payload).select().single();
      if (error) throw error;
      return { id: data.id, ...payloadData } as any;
    },
    checkOut: async (id: string, input: { checkOutImage?: string; notes?: string }) => {
      const { data: row, error: fetchErr } = await supabase.from('activity_logs').select('action').eq('id', id).single();
      if (fetchErr) throw fetchErr;
      const payloadData = JSON.parse(row.action);
      payloadData.checkOutTime = new Date().toISOString();
      if (input.checkOutImage) payloadData.checkOutImage = input.checkOutImage;
      if (input.notes) payloadData.notes = payloadData.notes ? payloadData.notes + ' | ' + input.notes : input.notes;
      
      const { data, error } = await supabase.from('activity_logs').update({ action: JSON.stringify(payloadData) }).eq('id', id).select().single();
      if (error) throw error;
      return { id: data.id, ...payloadData } as any;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('activity_logs').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  }
};
