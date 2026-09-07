const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});
c.connect().then(async () => {
  const r = await c.query("SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace");
  console.log(r.rows.map(x=>x.proname));
  await c.end();
}).catch(e => { console.error(e); c.end(); });
