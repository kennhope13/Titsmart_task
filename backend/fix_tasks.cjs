const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

c.connect().then(async () => {
  // Find a valid project_id to use as a fallback, or just create a dummy one
  const p = await c.query("SELECT id FROM projects LIMIT 1");
  let fallbackId = p.rows.length > 0 ? p.rows[0].id : '00000000-0000-0000-0000-000000000000';
  
  // Update tasks that have null project_id
  const r = await c.query("UPDATE tasks SET project_id = $1 WHERE project_id IS NULL", [fallbackId]);
  console.log(`Updated ${r.rowCount} tasks with null project_id`);
  
  await c.end();
}).catch(e => {
  console.error(e.message);
  c.end();
});
