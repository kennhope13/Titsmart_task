import { useState, useEffect } from 'react';

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
        const response = await fetch(`/version.json?t=${new Date().getTime()}`);
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
