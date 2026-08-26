const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function check() {
  await client.connect();
  const res = await client.query("SELECT issue_content FROM material_plans WHERE id = '06f5410d-164b-4187-98ba-05df3fc5c7b4'");
  console.log(res.rows[0]);
  await client.end();
}
check();
