const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function addColumn() {
  try {
    await client.connect();
    
    // Add doc_stamp column to material_plans if it doesn't exist
    const res = await client.query(`
      ALTER TABLE "material_plans"
      ADD COLUMN IF NOT EXISTS "doc_stamp" BOOLEAN NOT NULL DEFAULT false;
    `);
    
    console.log('Column added successfully:', res);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

addColumn();
