const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('../web-admin/.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const payload = {
    user: 'Test User',
    action: 'Test action',
    timestamp: new Date().toISOString()
  };
  const { data, error } = await supabase.from('activity_logs').insert(payload).select().single();
  console.log('Result:', data);
  console.log('Error:', error);
}
test();
