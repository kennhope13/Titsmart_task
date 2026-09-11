import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';
import packageJson from './package.json';

const isWebOnly = process.env.WEB_ONLY === 'true';

function terminalDbLoggerPlugin(mode: string) {
  return {
    name: 'terminal-db-logger',
    configureServer() {
      const env = loadEnv(mode, process.cwd(), '');
      const dbUrl = env.VITE_SUPABASE_URL || 'Not Configured';
      const anonKey = env.VITE_SUPABASE_ANON_KEY || '';
      const isLocal = dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost');
      
      console.log('\n' + '='.repeat(60));
      console.log(`  🚀 TITSMART APP DEV SERVER STARTED`);
      console.log(`  📌 SUPABASE DATABASE URL : ${dbUrl}`);
      console.log(`  📊 DB CONNECTION MODE    : ${isLocal ? 'LOCAL SUPABASE (CLI)' : 'CLOUD SUPABASE (ONLINE)'}`);
      if (isLocal) {
        console.log(`  🛠️ LOCAL STUDIO DB URL   : http://localhost:54323`);
      }
      
      // Ping DB endpoint to verify active connectivity
      fetch(`${dbUrl}/rest/v1/materials?select=count`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      }).then(res => {
        if (res.ok || res.status === 200 || res.status === 206) {
          console.log(`  🟢 DB HEALTHCHECK        : KẾT NỐI THÀNH CÔNG! (Status: ${res.status})`);
        } else {
          console.log(`  🟡 DB HEALTHCHECK        : PHẢN HỒI MÃ (${res.status} ${res.statusText})`);
        }
        console.log('='.repeat(60) + '\n');
      }).catch(err => {
        console.log(`  🔴 DB HEALTHCHECK        : KẾT NỐI THẤT BẠI! (${err.message})`);
        console.log('='.repeat(60) + '\n');
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  base: './',
  plugins: [
    react(),
    terminalDbLoggerPlugin(mode),
    ...(!isWebOnly
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: {
                build: {
                  rollupOptions: {
                    external: ['electron-updater'],
                  },
                },
              },
            },
            preload: {
              input: 'electron/preload.ts',
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
}));

