const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.nvdonaaxbtqjfmxtlgzb:phamminhtien.113@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => {
  return client.query(`NOTIFY pgrst, 'reload schema';`);
}).then(() => {
  console.log('Schema reloaded');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
