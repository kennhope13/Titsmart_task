
const { createClient } = require('./web-admin/node_modules/@supabase/supabase-js');
const supabase = createClient('https://svwnezevorhrdictnbyn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2d25lemV2b3JocmRpY3RuYnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4ODkwMTcsImV4cCI6MjEwMzQ2NTAxN30.RhQfBbfvIXaccvsixdKtY32JBym9Y0M6bzsvg3QqoWk');

async function run() {
  const { data, error } = await supabase.from('projects').delete().eq('code', 'TRAM_BIEN_AP');
  console.log('Error:', error);
}
run();

