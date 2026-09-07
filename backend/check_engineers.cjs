const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

c.connect().then(async () => {
  // Check columns in engineers table
  const r = await c.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='engineers' ORDER BY ordinal_position");
  r.rows.forEach(row => console.log(row.column_name, row.data_type, row.is_nullable));
  
  console.log('\n--- Constraints ---');
  const r2 = await c.query("SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name='engineers'");
  r2.rows.forEach(row => console.log(row.constraint_name, row.constraint_type));
  
  await c.end();
}).catch(e => { console.error(e.message); c.end(); });
