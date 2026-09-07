const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});
c.connect().then(async () => {
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='activity_logs'");
  console.log(r.rows.map(x=>x.column_name));
  await c.end();
});
