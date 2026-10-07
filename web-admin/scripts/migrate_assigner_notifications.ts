import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../src/services/realtimeStore'; // reuse auth helper if available

// Initialize Supabase client (replace with your env variables or hardcode for one-time use)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching tasks without assigner info...');
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, created_by_id, created_by_name')
    .is('assigner_id', null)
    .is('assigner_name', null);

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log('No tasks need migration.');
    return;
  }

  console.log(`Found ${tasks.length} tasks to update.`);

  const updates = tasks.map((t: any) => {
    const assignerId = t.created_by_id || '';
    const assignerName = t.created_by_name || 'Quản lý';
    return supabase
      .from('tasks')
      .update({ assigner_id: assignerId, assigner_name: assignerName })
      .eq('id', t.id);
  });

  // Run updates sequentially to avoid rate limits
  for (const upd of updates) {
    const { error: upErr } = await upd;
    if (upErr) {
      console.error('Failed to update a task:', upErr);
    }
  }

  console.log('Migration completed.');
}

migrate().catch((e) => console.error('Unexpected error:', e));
