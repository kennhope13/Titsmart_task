const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function check() {
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='material_plans'");
  console.log(res.rows);
  await client.end();
}
check();
