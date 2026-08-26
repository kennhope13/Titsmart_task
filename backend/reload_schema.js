const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function reload() {
  await client.connect();
  await client.query("NOTIFY pgrst, 'reload schema'");
  console.log('Schema reloaded!');
  
  // Try to update one row manually to see if doc_stamp can be true
  const res = await client.query("UPDATE material_plans SET doc_stamp = true WHERE issue_content LIKE '%TKD%' RETURNING id, doc_stamp");
  console.log('Updated rows manually:', res.rows);
  
  await client.end();
}
reload();
