const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('../web-admin/.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('activity_logs').select('*').limit(1);
  if (error) {
    console.error('REST API Error:', error);
  } else {
    console.log('Columns returned:', Object.keys(data[0] || {}));
  }
}
test();
