import { createClient } from '@supabase/supabase-js';

// Các thông số này sẽ được lấy từ file .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('⚡ [SUPABASE DB CONNECTED TO]:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

