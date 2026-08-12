import { app as s, BrowserWindow as u, ipcMain as d } from "electron";
import i from "path";
import { fileURLToPath as c } from "url";
import f from "electron-updater";
const { autoUpdater: t } = f, m = c(import.meta.url), l = i.dirname(m);
let n;
const r = process.env.VITE_DEV_SERVER_URL;
function p() {
  n = new u({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hidden",
    // Lấy cảm hứng từ Notion (giấu thanh tiêu đề mặc định)
    titleBarOverlay: {
      color: "#ffffff",
      symbolColor: "#00236f"
    },
    webPreferences: {
      preload: i.join(l, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), r ? n.loadURL(r) : n.loadFile(i.join(process.env.DIST || i.join(l, "../dist"), "index.html"));
}
function o(e, a) {
  n && !n.isDestroyed() && n.webContents.send(e, a);
}
function w(e) {
  return Array.isArray(e) ? e.map((a) => typeof a == "string" ? a : (a == null ? void 0 : a.note) ?? "").filter(Boolean).join(`
`) : e ?? "";
}
function h() {
  s.isPackaged && (t.autoDownload = !1, t.autoInstallOnAppQuit = !0, t.on("checking-for-update", () => {
    o("update:status", { status: "checking" });
  }), t.on("update-available", (e) => {
    o("update:status", {
      status: "available",
      version: e.version,
      releaseNotes: w(e.releaseNotes)
    });
  }), t.on("update-not-available", (e) => {
    o("update:status", { status: "not-available", version: e.version });
  }), t.on("download-progress", (e) => {
    o("update:status", {
      status: "downloading",
      percent: Math.round(e.percent),
      transferred: e.transferred,
      total: e.total,
      bytesPerSecond: e.bytesPerSecond
    });
  }), t.on("update-downloaded", (e) => {
    o("update:status", { status: "downloaded", version: e.version });
  }), t.on("error", (e) => {
    o("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
  }), d.on("update:check", () => {
    t.checkForUpdates();
  }), d.on("update:download", () => {
    t.downloadUpdate();
  }), d.on("update:install", () => {
    t.quitAndInstall();
  }), setTimeout(() => {
    t.checkForUpdates().catch((e) => {
      o("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
    });
  }, 5e3));
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), n = null);
});
s.on("activate", () => {
  u.getAllWindows().length === 0 && p();
});
s.whenReady().then(() => {
  p(), h();
});
