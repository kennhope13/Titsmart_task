const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.svwnezevorhrdictnbyn:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

c.connect().then(async () => {
  await c.query(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      project_id TEXT,
      project_name TEXT,
      check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      check_out_time TIMESTAMPTZ,
      check_in_image TEXT,
      check_out_image TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_project ON attendance_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_checkin ON attendance_logs(check_in_time);
  `);
  console.log('Table attendance_logs created successfully!');

  // grant permissions to anon and authenticated
  await c.query("GRANT ALL ON TABLE attendance_logs TO anon, authenticated, service_role;");
  
  await c.query(`NOTIFY pgrst, 'reload schema'`);
  console.log("Schema reloaded!");
  await c.end();
}).catch(e => {
  console.error('Error:', e.message);
  c.end();
});
