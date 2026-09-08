import { create } from 'zustand';
import { Project, Task, Engineer, Issue, FieldLog } from '../types';
import { api } from './apiSupabase';
import { useAuthStore } from './authStore';

interface DataStoreState {
  projects: Project[];
  tasks: Task[];
  engineers: Engineer[];
  issues: Issue[];
  fieldLogs: FieldLog[];
  isLoading: boolean;
  
  fetchProjects: () => Promise<void>;
  fetchTasks: (projectId?: string) => Promise<void>;
  fetchEngineers: () => Promise<void>;
  fetchIssues: (projectId?: string) => Promise<void>;
  fetchFieldLogs: () => Promise<void>;
  
  filterByUserProjects: <T extends { projectCode?: string, projectName?: string }>(data: T[]) => T[];
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  projects: [],
  tasks: [],
  engineers: [],
  issues: [],
  fieldLogs: [],
  isLoading: false,

  filterByUserProjects: (data) => {
    const user = useAuthStore.getState().user;
    if (!user || user.role === 'admin') return data;
    const codes = user.projectCodes || [];
    return data.filter(item => {
      const pCode = item.projectCode;
      if (!pCode) return true;
      return codes.includes(pCode);
    });
  },

  fetchProjects: async () => {
    try {
      set({ isLoading: true });
      const data = await api.projects.getAll();
      const user = useAuthStore.getState().user;
      let filtered = data;
      if (user && user.role !== 'admin') {
        const codes = user.projectCodes || [];
        filtered = data.filter((p: Project) => codes.includes(p.code));
      }
      set({ projects: filtered as Project[], isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  fetchTasks: async (projectId?: string) => {
    try {
      set({ isLoading: true });
      const data = await api.tasks.getAll(projectId);
      set({ tasks: get().filterByUserProjects(data) as Task[], isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  fetchEngineers: async () => {
    try {
      set({ isLoading: true });
      const data = await api.engineers.getAll();
      set({ engineers: data as Engineer[], isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  fetchIssues: async (projectId?: string) => {
    try {
      set({ isLoading: true });
      const data = await api.issues.getAll(projectId);
      set({ issues: get().filterByUserProjects(data) as Issue[], isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  fetchFieldLogs: async () => {
    try {
      set({ isLoading: true });
      const data = await api.fieldLogs.getAll();
      set({ fieldLogs: get().filterByUserProjects(data) as FieldLog[], isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));
