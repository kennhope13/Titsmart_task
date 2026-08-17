const fs = require('fs');
const path = require('path');

// 1. Create public/version.json
const versionJson = {
  "version": "1.0.31",
  "date": new Date().toLocaleDateString('vi-VN'),
  "notes": [
    "Căn chỉnh lại chiều cao thanh tiêu đề đồng nhất 72px trên toàn hệ thống.",
    "Khóa thanh Sidebar không bị thu gọn khi đang mở bảng thông báo.",
    "Tự động phát hiện phiên bản mới để yêu cầu người dùng cập nhật (F5)."
  ]
};
fs.writeFileSync(path.join(__dirname, 'public', 'version.json'), JSON.stringify(versionJson, null, 2));

// 2. Create src/hooks/useVersionCheck.ts
const hookCode = `import { useState, useEffect } from 'react';

export interface VersionInfo {
  version: string;
  date: string;
  notes: string[];
}

export const useVersionCheck = (checkIntervalMs = 5 * 60 * 1000) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    const currentVersion = import.meta.env.VITE_APP_VERSION as string;

    const checkForUpdate = async () => {
      try {
        const response = await fetch(\`/version.json?t=\${new Date().getTime()}\`);
        if (!response.ok) return;
        
        const data: VersionInfo = await response.json();
        
        if (data.version && currentVersion && data.version !== currentVersion) {
          const parseVersion = (v: string) => v.split('.').map(Number);
          const currParts = parseVersion(currentVersion);
          const newParts = parseVersion(data.version);
          
          let isNewer = false;
          for (let i = 0; i < Math.max(currParts.length, newParts.length); i++) {
            const curr = currParts[i] || 0;
            const newVal = newParts[i] || 0;
            if (newVal > curr) {
              isNewer = true;
              break;
            } else if (newVal < curr) {
              break;
            }
          }

          if (isNewer) {
            setHasUpdate(true);
            setNewVersionInfo(data);
          }
        }
      } catch (error) {
        console.error("Failed to check for version update:", error);
      }
    };

    setTimeout(checkForUpdate, 3000);
    const interval = setInterval(checkForUpdate, checkIntervalMs);
    const handleFocus = () => checkForUpdate();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkIntervalMs]);

  return { hasUpdate, newVersionInfo };
};
`;
fs.writeFileSync(path.join(__dirname, 'src', 'hooks', 'useVersionCheck.ts'), hookCode);

// 3. Create src/components/common/WebUpdateNotification.tsx
const componentCode = `import React from 'react';
import { useVersionCheck } from '../../hooks/useVersionCheck';

export const WebUpdateNotification: React.FC = () => {
  const { hasUpdate, newVersionInfo } = useVersionCheck(5 * 60 * 1000);

  if (!hasUpdate || !newVersionInfo) return null;

  const handleUpdate = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-white">
            <span className="material-symbols-outlined text-2xl">system_update</span>
          </div>
          <div className="text-white">
            <h3 className="font-extrabold text-xl leading-tight">Có phiên bản mới!</h3>
            <p className="text-blue-100 text-sm font-medium">Phiên bản {newVersionInfo.version}</p>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-sm font-semibold text-slate-800 mb-3">Tính năng mới & Cải tiến:</p>
          <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {newVersionInfo.notes.map((note, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-[18px] shrink-0 mt-0.5">check_circle</span>
                <span className="leading-snug">{note}</span>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={handleUpdate}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Cập nhật ngay
          </button>
        </div>
      </div>
    </div>
  );
};
`;
fs.writeFileSync(path.join(__dirname, 'src', 'components', 'common', 'WebUpdateNotification.tsx'), componentCode);

// 4. Update src/App.tsx
let appContent = fs.readFileSync(path.join(__dirname, 'src', 'App.tsx'), 'utf8');
if (!appContent.includes('WebUpdateNotification')) {
  appContent = appContent.replace(
    "import { UpdateNotifier } from './components/common/UpdateNotifier';",
    "import { UpdateNotifier } from './components/common/UpdateNotifier';\nimport { WebUpdateNotification } from './components/common/WebUpdateNotification';"
  );
  
  appContent = appContent.replace(
    "<UpdateNotifier />",
    "<UpdateNotifier />\n      <WebUpdateNotification />"
  );
  
  fs.writeFileSync(path.join(__dirname, 'src', 'App.tsx'), appContent);
}

console.log('All files created and updated successfully!');
