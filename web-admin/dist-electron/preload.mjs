"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_, data) => callback(data));
  },
  send: (channel, data) => {
    electron.ipcRenderer.send(channel, data);
  }
});
