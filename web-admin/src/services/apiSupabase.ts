import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

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
      if (error) throw error;
      return mapArray(result || []);
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
      
      // Update material stock
      if (data.materialId) {
        const { data: currentMat } = await supabase.from('materials').select('initial_stock, total_import, total_export').eq('id', data.materialId).single();
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
          }).eq('id', data.materialId);
        }
      }
      
      return toCamelCase(result);
    },
    create: async (data: any) => {
      const payload = toSnakeCase(data);
      if (payload.id && String(payload.id).startsWith('mat-')) {
        delete payload.id;
      }
      const { data: result, error } = await supabase.from('materials').insert(payload).select().single();
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
      const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
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

  accounting: {
    getMaterialPlans: async () => {
      const { data, error } = await supabase.from('material_plans').select('*');
      if (error) throw error;
      return data.map(toCamelCase);
    },
    createMaterialPlan: async (data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('material_plans').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    createMaterialPlanBatch: async (dataArray: any[]) => {
      const payloads = dataArray.map(toSnakeCase);
      const { data: result, error } = await supabase.from('material_plans').insert(payloads).select();
      if (error) throw error;
      return mapArray(result || []);
    },
    updateMaterialPlan: async (id: string, data: any) => {
      const { data: result, error } = await supabase.from('material_plans').update(toSnakeCase(data)).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
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
          console.warn('Fallback: saving without parent_id because columns are missing in DB');
          delete payload.parent_id;
          delete payload.material_plan_id;
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
          console.warn('Fallback: saving batch without parent_id because columns are missing in DB');
          payloads.forEach(p => {
             delete p.parent_id;
             delete p.material_plan_id;
          });
          const { data: retryResult, error: retryError } = await supabase.from('purchasing_plans').insert(payloads).select();
          if (retryError) throw retryError;
          return retryResult.map((r: any, i: number) => toCamelCase({ ...r, parent_id: dataArray[i].parentId, material_plan_id: dataArray[i].materialPlanId }));
        }
        throw error;
      }
      return mapArray(result || []);
    },
    updatePurchasing: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      const { data: result, error } = await supabase.from('purchasing_plans').update(payload).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST204' || String(error.code).includes('400') || String(error.message).includes('column')) {
          delete payload.parent_id;
          delete payload.material_plan_id;
          const { data: retryResult, error: retryError } = await supabase.from('purchasing_plans').update(payload).eq('id', id).select().single();
          if (retryError) throw retryError;
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
      if (error) throw error;
      return toCamelCase(result);
    },
    updateExpense: async (id: string, data: any) => {
      const { data: result, error } = await supabase.from('expenses').update(toSnakeCase(data)).eq('id', id).select().single();
      if (error) throw error;
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
      if (error) throw error;
      return toCamelCase(result);
    },
    updateLaborPayroll: async (id: string, data: any) => {
      const { data: result, error } = await supabase.from('labor_payrolls').update(toSnakeCase(data)).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    deleteLaborPayroll: async (id: string) => {
      const { error } = await supabase.from('labor_payrolls').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    getDocumentTracks: async () => {
      const { data, error } = await supabase.from('document_tracks').select('*');
      if (error) throw error;
      return data.map(toCamelCase);
    },
    createDocumentTrack: async (data: any) => {
      const payload = toSnakeCase(data);
      if (!payload.receive_date) payload.receive_date = null;
      if (payload.project_code) {
        const { data: proj } = await supabase.from('projects').select('id').eq('code', payload.project_code).single();
        if (proj) payload.project_id = proj.id;
        delete payload.project_code;
      }
      const { data: result, error } = await supabase.from('document_tracks').insert(payload).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    updateDocumentTrack: async (id: string, data: any) => {
      const payload = toSnakeCase(data);
      if (payload.receive_date === '') payload.receive_date = null;
      if (payload.project_code !== undefined) {
        if (payload.project_code) {
          const { data: proj } = await supabase.from('projects').select('id').eq('code', payload.project_code).single();
          if (proj) payload.project_id = proj.id;
        }
        delete payload.project_code;
      }
      const { data: result, error } = await supabase.from('document_tracks').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(result);
    },
    deleteDocumentTrack: async (id: string) => {
      const { error } = await supabase.from('document_tracks').delete().eq('id', id);
      if (error) throw error;
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
};
