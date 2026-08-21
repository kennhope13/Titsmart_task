const { Client } = require('pg');
require('dotenv/config');
const client = new Client({ connectionString: process.env.DIRECT_URL });
async function run() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_versions (
      id INT PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO app_versions (id, version) VALUES (1, '1.0.0') ON CONFLICT (id) DO NOTHING;
  `);
  
  // also create a trigger to enable realtime for app_versions
  await client.query(`
    alter publication supabase_realtime add table app_versions;
  `).catch(e => console.log('Notice: ' + e.message));

  console.log('Success');
  await client.end();
}
run().catch(console.error);
