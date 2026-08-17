import { contextBridge, ipcRenderer } from 'electron';

export type UpdateStatusPayload = {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
};

// Giao tiếp an toàn giữa React và hệ điều hành
contextBridge.exposeInMainWorld('electronAPI', {
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data));
  },
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  // Auto-update
  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => {
    ipcRenderer.on('update:status', (_, payload: UpdateStatusPayload) => callback(payload));
  },
  checkForUpdates: () => ipcRenderer.send('update:check'),
  downloadUpdate: () => ipcRenderer.send('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
});