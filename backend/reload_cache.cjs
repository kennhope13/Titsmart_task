const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

c.connect().then(async () => {
  await c.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('Schema cache reloaded successfully!');
  await c.end();
}).catch(e => {
  console.error('Error:', e.message);
  c.end();
});
