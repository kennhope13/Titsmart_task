import axios from 'axios';

const API_URLS = [
  'http://127.0.0.1:3001/api',
  'http://10.0.2.2:3001/api',
  'http://192.168.0.168:3001/api',
  'http://192.168.0.156:3001/api',
];

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
  accounting: {
    getMaterialPlans: async () => get('/accounting/material-plans'),
    getPurchasings: async () => get('/accounting/purchasings'),
    getExpenses: async () => get('/accounting/expenses'),
    getPayrolls: async () => get('/accounting/payrolls'),
    getDocumentTracks: async () => get('/accounting/document-tracks'),
  }
};