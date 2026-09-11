"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_, data) => callback(data));
  },
  send: (channel, data) => {
    electron.ipcRenderer.send(channel, data);
  },
  // Auto-update
  onUpdateStatus: (callback) => {
    electron.ipcRenderer.on("update:status", (_, payload) => callback(payload));
  },
  checkForUpdates: () => electron.ipcRenderer.send("update:check"),
  downloadUpdate: () => electron.ipcRenderer.send("update:download"),
  installUpdate: () => electron.ipcRenderer.send("update:install"),
  openExternal: (url) => electron.ipcRenderer.send("open-external", url)
});
