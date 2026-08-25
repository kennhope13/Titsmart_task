const fs = require('fs');

// 1. web-admin/src/services/api.ts
let api = fs.readFileSync('web-admin/src/services/api.ts', 'utf8');
api = api.replace(
  "delete: async (id: string) => (await axios.delete(`${API_URL}/field-logs/${id}`)).data,",
  "delete: async (id: string) => (await axios.delete(`${API_URL}/field-logs/${id}`)).data,\n    update: async (id: string, data: { note?: string; images?: File[]; existingImages?: string[] }) => {\n      const form = new FormData();\n      if (data.note !== undefined) form.append('note', data.note);\n      if (data.images) data.images.forEach(f => form.append('images', f));\n      if (data.existingImages) data.existingImages.forEach(img => form.append('existingImages', img));\n      return (await axios.put(`${API_URL}/field-logs/${id}`, form)).data;\n    },"
);
fs.writeFileSync('web-admin/src/services/api.ts', api);

// 2. web-admin/src/services/realtimeStore.ts
let store = fs.readFileSync('web-admin/src/services/realtimeStore.ts', 'utf8');
const updateStore = `
    updateFieldLog: async (id, input) => {
      try {
        const updated = await api.fieldLogs.update(id, input);
        set((state) => {
          const nextLogs = state.fieldLogs.map(l => l.id === id ? updated : l);
          get().logActivity('Cập nhật nhật ký hiện trường: ' + (updated.projectCode), 'COMPANY');
          persistAndNotify({ fieldLogs: nextLogs });
          return { fieldLogs: nextLogs };
        });
      } catch (e) {
        console.error('Failed to update field log', e);
        throw e;
      }
    },
`;
store = store.replace(
  "deleteFieldLog: (id: string) => Promise<void>;",
  "deleteFieldLog: (id: string) => Promise<void>;\n  updateFieldLog: (id: string, input: { note?: string; images?: File[]; existingImages?: string[] }) => Promise<void>;"
);
store = store.replace(
  "addFieldLog: async (input) => {",
  updateStore + "\n    addFieldLog: async (input) => {"
);
fs.writeFileSync('web-admin/src/services/realtimeStore.ts', store);

console.log('Frontend store updated');
