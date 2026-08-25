const fs = require('fs');

// api.ts
let api = fs.readFileSync('web-admin/src/services/api.ts', 'utf8');
const createBlock = `    create: async (data: { projectCode: string; note?: string; images: File[] }) => {
      const form = new FormData();
      form.append('projectCode', data.projectCode);
      if (data.note) form.append('note', data.note);
      data.images.forEach(f => form.append('images', f));
      return (await axios.post(\`\${API_URL}/field-logs\`, form)).data;
    },`;
const updateBlock = `    update: async (id: string, data: { note?: string; images?: string[]; existingImages?: string[] }) => {
      const form = new FormData();
      if (data.note !== undefined) form.append('note', data.note);
      if (data.images) data.images.forEach(f => form.append('images', f));
      if (data.existingImages) data.existingImages.forEach(img => form.append('existingImages', img));
      return (await axios.put(\`\${API_URL}/field-logs/\${id}\`, form)).data;
    },`;
api = api.replace(/delete: async \(id: string\) =>[^\n]+\n/, `delete: async (id: string) => (await axios.delete(\`\${API_URL}/field-logs/\${id}\`)).data,\n${updateBlock}\n`);
fs.writeFileSync('web-admin/src/services/api.ts', api);

// realtimeStore.ts
let store = fs.readFileSync('web-admin/src/services/realtimeStore.ts', 'utf8');

const typeDel = `deleteFieldLog: (id: string) => Promise<void>;`;
const typeUp = `deleteFieldLog: (id: string) => Promise<void>;
  updateFieldLog: (id: string, input: { note?: string; images?: string[]; existingImages?: string[] }) => Promise<void>;`;
store = store.replace(typeDel, typeUp);

const fnAdd = `    addFieldLog: async (input) => {`;
const fnUp = `    updateFieldLog: async (id, input) => {
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
    addFieldLog: async (input) => {`;
store = store.replace(fnAdd, fnUp);

fs.writeFileSync('web-admin/src/services/realtimeStore.ts', store);
console.log('Fixed api and store');
