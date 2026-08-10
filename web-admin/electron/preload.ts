import { contextBridge, ipcRenderer } from 'electron';

// Giao tiếp an toàn giữa React và hệ điều hành
contextBridge.exposeInMainWorld('electronAPI', {
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data));
  },
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  }
});
