
const { Client } = require('./backend/node_modules/pg');
const client = new Client({ connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
async function run() {
  await client.connect();
  const res = await client.query(\
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'projects' AND tc.constraint_type = 'FOREIGN KEY';
  \);
  console.log(res.rows);
  await client.end();
}
run();

