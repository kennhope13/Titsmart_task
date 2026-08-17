import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import updatePkg from 'electron-updater';
const { autoUpdater } = updatePkg;

// Handle ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden', // Lấy cảm hứng từ Notion (giấu thanh tiêu đề mặc định)
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#00236f',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(process.env.DIST || path.join(__dirname, '../dist'), 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function sendToRenderer(channel: string, data?: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function normalizeReleaseNotes(notes?: string | Array<{ version?: string; note?: string }>): string {
  if (Array.isArray(notes)) {
    return notes.map((n) => (typeof n === 'string' ? n : n?.note ?? '')).filter(Boolean).join('\n');
  }
  return notes ?? '';
}

function setupAutoUpdater() {
  // Chỉ chạy ở bản đã đóng gói, không chạy ở môi trường dev/electron script
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false; // Không tải về ngay, để người dùng chọn
  autoUpdater.autoInstallOnAppQuit = true; // Nếu đã tải xong thì cài khi thoát app

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update:status', { status: 'checking' });
  });

  // Listener for manual open external
  ipcMain.on('open-external', (event, url) => {
    if (url && typeof url === 'string') {
      shell.openExternal(url);
    }
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update:status', {
      status: 'available',
      version: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendToRenderer('update:status', { status: 'not-available', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update:status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update:status', { status: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('update:status', { status: 'error', message: err?.message ?? String(err) });
  });

  ipcMain.on('update:check', () => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.on('update:download', () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  // Tự kiểm tra update khi app khởi động (trì hoãn một chút cho app chạy ổn định)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      sendToRenderer('update:status', { status: 'error', message: err?.message ?? String(err) });
    });
  }, 5000);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});