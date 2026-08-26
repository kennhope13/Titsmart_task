const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
