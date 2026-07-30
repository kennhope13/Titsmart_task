import axios from 'axios';

const configuredApiUrl = (globalThis as any).process?.env?.EXPO_PUBLIC_API_URL as string | undefined;

const normalizeApiUrl = (url: string) => url.replace(/\/+$/, '');

const API_URLS = [
  configuredApiUrl,
  'http://10.0.2.2:3001/api',
  'http://192.168.0.173:3001/api',
  'http://127.0.0.1:3001/api',
].filter((url): url is string => Boolean(url?.trim())).map(normalizeApiUrl);

const get = async (path: string) => {
  let lastError: unknown;

  for (const baseUrl of API_URLS) {
    try {
      const res = await axios.get(`${baseUrl}${path}`, { timeout: 4000 });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const post = async (path: string, data: any) => {
  let lastError: unknown;

  for (const baseUrl of API_URLS) {
    try {
      const res = await axios.post(`${baseUrl}${path}`, data, { timeout: 4000 });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const put = async (path: string, data: any) => {
  let lastError: unknown;

  for (const baseUrl of API_URLS) {
    try {
      const res = await axios.put(`${baseUrl}${path}`, data, { timeout: 4000 });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const del = async (path: string) => {
  let lastError: unknown;

  for (const baseUrl of API_URLS) {
    try {
      const res = await axios.delete(`${baseUrl}${path}`, { timeout: 4000 });
      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const api = {
  projects: {
    getAll: async () => get('/projects'),
    getById: async (id: string) => get(`/projects/${id}`),
    create: async (data: any) => post('/projects', data),
    update: async (id: string, data: any) => put(`/projects/${id}`, data),
    delete: async (id: string) => del(`/projects/${id}`),
  },
  tasks: {
    getAll: async (projectId?: string) => get(projectId ? `/tasks?projectId=${projectId}` : '/tasks'),
    create: async (data: any) => post('/tasks', data),
    update: async (id: string, data: any) => put(`/tasks/${id}`, data),
    delete: async (id: string) => del(`/tasks/${id}`),
  },
  materials: {
    getAll: async (projectId?: string) => get(projectId ? `/materials?projectId=${projectId}` : '/materials'),
  },
  issues: {
    getAll: async (projectId?: string) => get(projectId ? `/issues?projectId=${projectId}` : '/issues'),
  },
  engineers: {
    getAll: async () => get('/users/engineers'),
  },
  activityLogs: {
    getAll: async () => get('/activity-logs'),
  },
  fieldLogs: {
    getAll: async () => {
      try { return await get('/field-logs'); } catch (e) { return []; }
    },
    create: async (data: any) => {
      try { return await post('/field-logs', data); } catch (e) { return data; }
    },
  },
  accounting: {
    getMaterialPlans: async () => get('/accounting/material-plans'),
    createMaterialPlan: async (data: any) => post('/accounting/material-plans', data),
    updateMaterialPlan: async (id: string, data: any) => put(`/accounting/material-plans/${id}`, data),
    deleteMaterialPlan: async (id: string) => del(`/accounting/material-plans/${id}`),
    getPurchasings: async () => get('/accounting/purchasings'),
    createPurchasing: async (data: any) => post('/accounting/purchasings', data),
    updatePurchasing: async (id: string, data: any) => put(`/accounting/purchasings/${id}`, data),
    deletePurchasing: async (id: string) => del(`/accounting/purchasings/${id}`),
    getExpenses: async () => get('/accounting/expenses'),
    createExpense: async (data: any) => post('/accounting/expenses', data),
    updateExpense: async (id: string, data: any) => put(`/accounting/expenses/${id}`, data),
    deleteExpense: async (id: string) => del(`/accounting/expenses/${id}`),
    getPayrolls: async () => get('/accounting/payrolls'),
    createPayroll: async (data: any) => post('/accounting/payrolls', data),
    updatePayroll: async (id: string, data: any) => put(`/accounting/payrolls/${id}`, data),
    deletePayroll: async (id: string) => del(`/accounting/payrolls/${id}`),
    getDocumentTracks: async () => get('/accounting/document-tracks'),
    createDocumentTrack: async (data: any) => post('/accounting/document-tracks', data),
    updateDocumentTrack: async (id: string, data: any) => put(`/accounting/document-tracks/${id}`, data),
    deleteDocumentTrack: async (id: string) => del(`/accounting/document-tracks/${id}`),
  }
};

