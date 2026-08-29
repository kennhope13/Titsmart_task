
const { Client } = require('./backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
async function run() {
  await client.connect();
  try {
    const q = \INSERT INTO tasks (code, name, volume, unit, progress, purchase_status, construction_status, is_done, is_section_header) VALUES ('TSK-TEST', 'Test Task', 0, 'cai', 0, '', '', false, false) RETURNING id;\;
    const res = await client.query(q);
    console.log('Inserted task:', res.rows[0].id);
  } catch (e) {
    console.log('Insert error:', e.message);
  }
  await client.end();
}
run();

