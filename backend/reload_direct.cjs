const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:phamminhtien.113@db.svwnezevorhrdictnbyn.supabase.co:5432/postgres'
});

c.connect().then(async () => {
  await c.query(`NOTIFY pgrst, 'reload schema'`);
  console.log('Schema cache reloaded successfully on direct DB host!');
  await c.end();
}).catch(e => {
  console.error('Error:', e.message);
  c.end();
});
