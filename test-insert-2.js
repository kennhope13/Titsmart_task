
const { createClient } = require('./web-admin/node_modules/@supabase/supabase-js');
const supabase = createClient('https://svwnezevorhrdictnbyn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2d25lemV2b3JocmRpY3RuYnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4ODkwMTcsImV4cCI6MjEwMzQ2NTAxN30.RhQfBbfvIXaccvsixdKtY32JBym9Y0M6bzsvg3QqoWk');

function toSnakeCase(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/[A-Z]/g, letter => \_\\),
      toSnakeCase(v)
    ])
  );
}

async function run() {
  const data = {
    stt: '1',
    code: 'TSK-1234567',
    name: 'Test Task 2',
    projectCode: 'TRAM_BIEN_AP',
    projectName: 'Tram Bien Ap',
    volume: 10,
    unit: 'cái',
    progress: 0,
    status: 'Chua b?t d?u',
    purchaseStatus: 'Chua d?t hàng',
    constrStatus: 'Chua thi công',
    isDone: false,
    isSectionHeader: false,
    sectionName: 'Test Section',
    parentId: undefined,
    assignedEngineerId: undefined,
    assignedEngineerName: ''
  };
  
  const payload = toSnakeCase(data);
  if (payload.parent_id === '') payload.parent_id = null;
  if (payload.assigned_engineer_id === '') payload.assigned_engineer_id = null;
  if (payload.assigner_id === '') payload.assigner_id = null;
  if (payload.reviewer_id === '') payload.reviewer_id = null;

  const { data: result, error } = await supabase.from('tasks').insert(payload).select().single();
  console.log('Error:', error);
  console.log('Result:', result);
}
run();

