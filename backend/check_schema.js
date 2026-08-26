const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function check() {
  await client.connect();
  const res = await client.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%material_plans%'");
  console.log(res.rows);
  await client.end();
}
check();
