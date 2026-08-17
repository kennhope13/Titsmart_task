import { useState, useEffect } from 'react';

export const useVersionCheck = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const currentVersion = import.meta.env.VITE_APP_VERSION;

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?t=' + new Date().getTime());
        const data = await response.json();
        
        if (data.version && data.version !== currentVersion) {
          setHasUpdate(true);
          setServerVersion(data.version);
          setReleaseNotes(data.notes || []);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    // Check immediately
    checkVersion();

    // Then check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentVersion]);

  return { hasUpdate, currentVersion, serverVersion, releaseNotes };
};
