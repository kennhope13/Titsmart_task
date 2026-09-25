import { createClient } from '@supabase/supabase-js';

const supabaseLocal = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function cleanCorruptedLocalNotes() {
  const { data: tasks, error } = await supabaseLocal
    .from('tasks')
    .select('id, name, notes')
    .like('notes', '%[THREAD:%');

  if (error) {
    console.error(error);
    return;
  }

  for (const t of tasks || []) {
    let notes = t.notes || '';
    // Sửa các trường hợp ] thừa bị kẹp trước [THREAD:
    if (notes.includes('] [THREAD:')) {
      notes = notes.replace(/\]\s*\[THREAD:/g, '[THREAD:');
      await supabaseLocal.from('tasks').update({ notes }).eq('id', t.id);
      console.log('Fixed task note for:', t.name);
    }
  }
}

cleanCorruptedLocalNotes();
