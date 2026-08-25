const fs = require('fs');

let api = fs.readFileSync('web-admin/src/services/api.ts', 'utf8');

const updateBlock = `    update: async (id: string, data: { note?: string; images?: string[]; existingImages?: string[] }) => {
      const form = new FormData();
      if (data.note !== undefined) form.append('note', data.note);
      if (data.images) data.images.forEach(f => form.append('images', f));
      if (data.existingImages) data.existingImages.forEach(img => form.append('existingImages', img));
      return (await axios.put(\`\${API_URL}/field-logs/\${id}\`, form)).data;
    },`;

api = api.replace(/delete: async \(id: string\) => \(await axios\.delete\(\`\$\{API_URL\}\/field-logs\/\$\{id\}\`\)\)\.data,/g, `delete: async (id: string) => (await axios.delete(\`\${API_URL}/field-logs/\${id}\`)).data,\n${updateBlock}`);

fs.writeFileSync('web-admin/src/services/api.ts', api);
console.log('API fixed');
