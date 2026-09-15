import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// Ưu tiên đọc biến môi trường Local trước
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cấu hình URL cho Local Docker DB:
// - Máy giả lập (Android Emulator): http://10.0.2.2:54321
// - Điện thoại thật kết nối Wi-Fi cùng mạng LAN: http://192.168.1.102:54321
// - Web / Localhost: http://127.0.0.1:54321
const LOCAL_LAN_IP = '192.168.1.102';
const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

let supabaseUrl = envUrl || (Capacitor.isNativePlatform() ? `http://${LOCAL_LAN_IP}:54321` : 'http://127.0.0.1:54321');
let supabaseAnonKey = envKey || LOCAL_ANON_KEY;

// Trên thiết bị Android thật / emulator, nếu chỉ vào localhost/127.0.0.1 -> chuyển sang IP LAN 192.168.1.102
if (Capacitor.isNativePlatform() && (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('10.0.2.2'))) {
  supabaseUrl = `http://${LOCAL_LAN_IP}:54321`;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    timeout: 20000,
  }
});

