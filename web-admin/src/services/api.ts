import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanUuid = (value: unknown) => (typeof value === 'string' && UUID_RE.test(value) ? value : null);

const sanitizeTaskPayload = (data: any) => {
  const payload = { ...data };
  if ('assignedEngineerId' in payload) payload.assignedEngineerId = cleanUuid(payload.assignedEngineerId);
  if ('assigned_engineer_id' in payload) payload.assigned_engineer_id = cleanUuid(payload.assigned_engineer_id);
  return payload;
};

const sanitizeProjectPayload = (data: any) => {
  const payload = { ...data };
  if ('managerId' in payload) payload.managerId = cleanUuid(payload.managerId);
  if ('manager_id' in payload) payload.manager_id = cleanUuid(payload.manager_id);
  return payload;
};

export const api = {
  projects: {
    getAll: async () => (await axios.get(`${API_URL}/projects`)).data,
    getById: async (id: string) => (await axios.get(`${API_URL}/projects/${id}`)).data,
    create: async (data: any) => (await axios.post(`${API_URL}/projects`, sanitizeProjectPayload(data))).data,
    update: async (id: string, data: any) => (await axios.put(`${API_URL}/projects/${id}`, sanitizeProjectPayload(data))).data,
    delete: async (id: string) => (await axios.delete(`${API_URL}/projects/${id}`)).data,
  },
  tasks: {
    getAll: async (projectId?: string) => {
      const url = projectId ? `${API_URL}/tasks?projectId=${projectId}` : `${API_URL}/tasks`;
      return (await axios.get(url)).data;
    },
    create: async (data: any) => (await axios.post(`${API_URL}/tasks`, sanitizeTaskPayload(data))).data,
    update: async (id: string, data: any) => (await axios.put(`${API_URL}/tasks/${id}`, sanitizeTaskPayload(data))).data,
    delete: async (id: string) => (await axios.delete(`${API_URL}/tasks/${id}`)).data,
  },
  materials: {
    getAll: async (projectId?: string) => {
      const url = projectId ? `${API_URL}/materials?projectId=${projectId}` : `${API_URL}/materials`;
      return (await axios.get(url)).data;
    },
  },
  issues: {
    getAll: async (projectId?: string) => {
      const url = projectId ? `${API_URL}/issues?projectId=${projectId}` : `${API_URL}/issues`;
      return (await axios.get(url)).data;
    },
  },
  engineers: {
    getAll: async () => (await axios.get(`${API_URL}/users/engineers`)).data,
  },
  activityLogs: {
    getAll: async () => (await axios.get(`${API_URL}/activity-logs`)).data,
  },
  fieldLogs: {
    getAll: async () => {
      try {
        return (await axios.get(`${API_URL}/field-logs`)).data;
      } catch (e) {
        return []; // Fallback empty array if endpoint not ready
      }
    },
    create: async (data: any) => {
      try {
        return (await axios.post(`${API_URL}/field-logs`, data)).data;
      } catch (e) {
        return data; // Return mock if fail
      }
    },
  },
  accounting: {
    getMaterialPlans: async () => (await axios.get(`${API_URL}/accounting/material-plans`)).data,
    createMaterialPlan: async (data: any) => (await axios.post(`${API_URL}/accounting/material-plans`, data)).data,
    updateMaterialPlan: async (id: string, data: any) => (await axios.put(`${API_URL}/accounting/material-plans/${id}`, data)).data,
    deleteMaterialPlan: async (id: string) => (await axios.delete(`${API_URL}/accounting/material-plans/${id}`)).data,

    getPurchasings: async () => (await axios.get(`${API_URL}/accounting/purchasings`)).data,
    createPurchasing: async (data: any) => (await axios.post(`${API_URL}/accounting/purchasings`, data)).data,
    updatePurchasing: async (id: string, data: any) => (await axios.put(`${API_URL}/accounting/purchasings/${id}`, data)).data,
    deletePurchasing: async (id: string) => (await axios.delete(`${API_URL}/accounting/purchasings/${id}`)).data,

    getExpenses: async () => (await axios.get(`${API_URL}/accounting/expenses`)).data,
    createExpense: async (data: any) => (await axios.post(`${API_URL}/accounting/expenses`, data)).data,
    updateExpense: async (id: string, data: any) => (await axios.put(`${API_URL}/accounting/expenses/${id}`, data)).data,
    deleteExpense: async (id: string) => (await axios.delete(`${API_URL}/accounting/expenses/${id}`)).data,

    getPayrolls: async () => (await axios.get(`${API_URL}/accounting/payrolls`)).data,
    createPayroll: async (data: any) => (await axios.post(`${API_URL}/accounting/payrolls`, data)).data,
    updatePayroll: async (id: string, data: any) => (await axios.put(`${API_URL}/accounting/payrolls/${id}`, data)).data,
    deletePayroll: async (id: string) => (await axios.delete(`${API_URL}/accounting/payrolls/${id}`)).data,

    getDocumentTracks: async () => (await axios.get(`${API_URL}/accounting/document-tracks`)).data,
    createDocumentTrack: async (data: any) => (await axios.post(`${API_URL}/accounting/document-tracks`, data)).data,
    updateDocumentTrack: async (id: string, data: any) => (await axios.put(`${API_URL}/accounting/document-tracks/${id}`, data)).data,
    deleteDocumentTrack: async (id: string) => (await axios.delete(`${API_URL}/accounting/document-tracks/${id}`)).data,
  }
};
