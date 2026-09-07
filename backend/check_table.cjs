const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

c.connect().then(async () => {
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(r.rows.map(r => r.table_name));
  
  // also check permissions
  const p = await c.query("SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='attendance_logs'");
  console.log("Grants:", p.rows);

  // grant permissions to anon and authenticated
  await c.query("GRANT ALL ON TABLE attendance_logs TO anon, authenticated, service_role;");
  
  await c.query(`NOTIFY pgrst, 'reload schema'`);
  console.log("Done");
  await c.end();
}).catch(e => {
  console.error(e.message);
  c.end();
});
