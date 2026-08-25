const fs = require('fs');

let api = fs.readFileSync('web-admin/src/services/apiSupabase.ts', 'utf8');

const updateBlock = `    update: async (id: string, data: any) => {
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

api = api.replace(/delete: async \(id: string\) => \{[^\}]+\},/g, `delete: async (id: string) => {
      const { error } = await supabase.from('field_logs').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },\n${updateBlock}`);

fs.writeFileSync('web-admin/src/services/apiSupabase.ts', api);
console.log('apiSupabase fixed');
