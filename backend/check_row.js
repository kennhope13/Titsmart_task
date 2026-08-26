const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function check() {
  await client.connect();
  const res = await client.query("SELECT id, project_id, doc_stamp FROM material_plans WHERE issue_content LIKE '%TKD%'");
  console.log(res.rows);
  await client.end();
}
check();
