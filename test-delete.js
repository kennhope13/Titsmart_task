
const { Client } = require('./backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
async function run() {
  await client.connect();
  await client.query(\DELETE FROM tasks WHERE name = 'Test Task';\);
  await client.end();
}
run();

