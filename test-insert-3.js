
const { createClient } = require('./web-admin/node_modules/@supabase/supabase-js');
const supabase = createClient('https://svwnezevorhrdictnbyn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2d25lemV2b3JocmRpY3RuYnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4ODkwMTcsImV4cCI6MjEwMzQ2NTAxN30.RhQfBbfvIXaccvsixdKtY32JBym9Y0M6bzsvg3QqoWk');

async function run() {
  const payload = {
    stt: '1',
    code: 'TSK-12345678',
    name: 'Test Task 3',
    project_code: 'TRAM_BIEN_AP',
    project_name: 'Tram Bien Ap',
    volume: 10,
    unit: 'cái',
    progress: 0,
    status: 'Chua b?t d?u',
    purchase_status: 'Chua d?t hàng',
    constr_status: 'Chua thi công',
    is_done: false,
    is_section_header: false,
    section_name: 'Test Section',
    assigned_engineer_name: ''
  };
  
  const { data: result, error } = await supabase.from('tasks').insert(payload).select().single();
  console.log('Error:', error);
  console.log('Result:', result);
}
run();

