import { app, BrowserWindow, shell, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import updatePkg from "electron-updater";
const { autoUpdater } = updatePkg;
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
let mainWindow;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    // titleBarStyle: 'hidden', // Lấy cảm hứng từ Notion (giấu thanh tiêu đề mặc định)
    // titleBarOverlay: {
    //   color: '#ffffff',
    //   symbolColor: '#00236f',
    // },
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(process.env.DIST || path.join(__dirname$1, "../dist"), "index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
}
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}
function normalizeReleaseNotes(notes) {
  if (Array.isArray(notes)) {
    return notes.map((n) => typeof n === "string" ? n : (n == null ? void 0 : n.note) ?? "").filter(Boolean).join("\n");
  }
  return notes ?? "";
}
function setupAutoUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => {
    sendToRenderer("update:status", { status: "checking" });
  });
  ipcMain.on("open-external", async (event, url) => {
    if (url && typeof url === "string") {
      try {
        await shell.openExternal(url);
      } catch (error) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${url}
Lý do: ${error.message}`);
      }
    }
  });
  autoUpdater.on("update-available", (info) => {
    sendToRenderer("update:status", {
      status: "available",
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes)
    });
  });
  autoUpdater.on("update-not-available", (info) => {
    sendToRenderer("update:status", { status: "not-available", version: info.version });
  });
  autoUpdater.on("download-progress", (progress) => {
    sendToRenderer("update:status", {
      status: "downloading",
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    sendToRenderer("update:status", { status: "downloaded", version: info.version });
  });
  autoUpdater.on("error", (err) => {
    sendToRenderer("update:status", { status: "error", message: (err == null ? void 0 : err.message) ?? String(err) });
  });
  ipcMain.on("update:check", () => {
    autoUpdater.checkForUpdates();
  });
  ipcMain.on("update:download", () => {
    autoUpdater.downloadUpdate();
  });
  ipcMain.on("update:install", () => {
    autoUpdater.quitAndInstall();
  });
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      sendToRenderer("update:status", { status: "error", message: (err == null ? void 0 : err.message) ?? String(err) });
    });
  }, 5e3);
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.commandLine.appendSwitch("disable-http2");
app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  if (mainWindow) {
    mainWindow.webContents.session.clearCache().then(() => {
      console.log("[Electron] Session cache cleared successfully");
    }).catch((err) => {
      console.error("[Electron] Failed to clear session cache:", err);
    });
  }
});
