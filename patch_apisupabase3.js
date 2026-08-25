const fs = require('fs');

let f = fs.readFileSync('web-admin/src/services/apiSupabase.ts', 'utf8');
const updateFn = `
    update: async (id: string, data: any) => {
      const payload: any = {};
      if (data.note !== undefined) payload.notes = data.note;
      if (data.images || data.existingImages) {
        payload.photos = [...(data.existingImages || []), ...(data.images || [])];
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
    },`;

// Find the fieldLogs object
const start = f.indexOf('fieldLogs: {');
const end = f.indexOf('},', f.indexOf('delete: async', start));
const newStr = f.substring(0, end + 2) + updateFn + f.substring(end + 2);
fs.writeFileSync('web-admin/src/services/apiSupabase.ts', newStr);
console.log('Fixed apiSupabase!');
