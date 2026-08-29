
const { createClient } = require('./web-admin/node_modules/@supabase/supabase-js');
const supabase = createClient('https://svwnezevorhrdictnbyn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2d25lemV2b3JocmRpY3RuYnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4ODkwMTcsImV4cCI6MjEwMzQ2NTAxN30.RhQfBbfvIXaccvsixdKtY32JBym9Y0M6bzsvg3QqoWk');

async function run() {
  const payload = {
    code: 'TSK-123',
    name: 'Test Task',
    project_code: 'TRAM_BIEN_AP',
    project_name: 'Tram Bien Ap',
    volume: 0,
    unit: '',
    progress: 0,
    status: 'Chua b?t d?u',
    purchase_status: '',
    constr_status: '',
    is_done: false,
    is_section_header: true,
    section_name: 'Test',
    parent_id: null,
    assigned_engineer_id: null
  };
  const { data, error } = await supabase.from('tasks').insert(payload).select().single();
  console.log('Error:', error);
  console.log('Data:', data);
}
run();

