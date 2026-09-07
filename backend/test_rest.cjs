const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Read env from web-admin/.env
const env = dotenv.parse(fs.readFileSync('../web-admin/.env'));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('attendance_logs').select('*');
  if (error) {
    console.error('REST API Error:', error);
  } else {
    console.log('REST API Success. Rows:', data.length);
  }
}
test();
