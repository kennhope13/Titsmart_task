import { createClient } from '@supabase/supabase-js';

const supabaseLocal = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

const supabaseProd = createClient(
  'https://nvdonaaxbtqjfmxtlgzb.supabase.co',
  'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg'
);

async function cleanClient(client: any, name: string) {
  try {
    console.log(`Clearing issue fields on ${name}...`);
    const { data: tasks, error: fetchErr } = await client.from('tasks').select('id, name, issue, issue_status');
    if (fetchErr) {
      console.log(`[${name}] Could not fetch tasks:`, fetchErr.message);
      return;
    }
    console.log(`[${name}] Found ${tasks?.length || 0} tasks`);
    const { data, error } = await client
      .from('tasks')
      .update({
        issue: null,
        issue_status: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      console.log(`[${name}] Update error:`, error.message);
    } else {
      console.log(`[${name}] Successfully cleared issue & issue_status in DB!`);
    }
  } catch (e: any) {
    console.log(`[${name}] Exception:`, e.message);
  }
}

async function run() {
  await cleanClient(supabaseLocal, 'LOCAL DB');
  await cleanClient(supabaseProd, 'PROD SUPABASE DB');
}

run();
