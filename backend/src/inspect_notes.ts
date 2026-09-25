import { createClient } from '@supabase/supabase-js';

const supabaseLocal = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function inspectNotes() {
  const { data: tasks, error } = await supabaseLocal
    .from('tasks')
    .select('id, name, notes')
    .like('notes', '%[THREAD:%');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${tasks?.length || 0} tasks with [THREAD:`);
  tasks?.forEach(t => {
    console.log('ID:', t.id);
    console.log('Name:', t.name);
    console.log('Notes:', JSON.stringify(t.notes));
    console.log('---');
  });
}

inspectNotes();
