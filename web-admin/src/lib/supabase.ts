import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const CLOUD_SUPABASE_URL = 'https://nvdonaaxbtqjfmxtlgzb.supabase.co';
const CLOUD_SUPABASE_ANON_KEY = 'sb_publishable_gzUeVF_f2jadDuuii66pCw_W_0xmqjg';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseUrl = envUrl || CLOUD_SUPABASE_URL;
let supabaseAnonKey = envKey || CLOUD_SUPABASE_ANON_KEY;

// Nếu chế độ phát triển dev:local yêu cầu kết nối local docker thì giữ localhost
if (import.meta.env.MODE === 'development' && !envUrl) {
  const LOCAL_LAN_IP = '192.168.1.102';
  const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  supabaseUrl = Capacitor.isNativePlatform() ? `http://${LOCAL_LAN_IP}:54321` : 'http://127.0.0.1:54321';
  supabaseAnonKey = LOCAL_ANON_KEY;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    timeout: 20000,
  }
});

