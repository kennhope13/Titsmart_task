const fs = require('fs');

let f = fs.readFileSync('web-admin/src/pages/ProjectDetailPage.tsx', 'utf8');

if (!f.includes('useAuthStore')) {
  f = f.replace("import { useRealtimeStore } from '../services/realtimeStore';", "import { useRealtimeStore } from '../services/realtimeStore';\nimport { useAuthStore } from '../services/authStore';");
}

if (!f.includes('const role =')) {
  f = f.replace('const location = useLocation();', 'const location = useLocation();\n  const role = useAuthStore(state => state.user?.role);');
}

fs.writeFileSync('web-admin/src/pages/ProjectDetailPage.tsx', f);
console.log('Fixed');
