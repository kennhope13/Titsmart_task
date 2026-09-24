import { app as s, BrowserWindow as c, shell as u, ipcMain as i } from "electron";
import r from "path";
import { fileURLToPath as f } from "url";
import m from "electron-updater";
const { autoUpdater: t } = m, w = f(import.meta.url), d = r.dirname(w);
let n;
const l = process.env.VITE_DEV_SERVER_URL;
function p() {
  n = new c({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: !0,
    // titleBarStyle: 'hidden', // Lấy cảm hứng từ Notion (giấu thanh tiêu đề mặc định)
    // titleBarOverlay: {
    //   color: '#ffffff',
    //   symbolColor: '#00236f',
    // },
    webPreferences: {
      preload: r.join(d, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), l ? (n.loadURL(l), n.webContents.openDevTools()) : n.loadFile(r.join(process.env.DIST || r.join(d, "../dist"), "index.html")), n.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && u.openExternal(e), { action: "deny" }));
}
function o(e, a) {
  n && !n.isDestroyed() && n.webContents.send(e, a);
}
function g(e) {
  return Array.isArray(e) ? e.map((a) => typeof a == "string" ? a : (a == null ? void 0 : a.note) ?? "").filter(Boolean).join(`
`) : e ?? "";
}
function b() {
  s.isPackaged && (t.autoDownload = !1, t.autoInstallOnAppQuit = !0, t.disableDifferentialDownload = !0, t.disableWebInstaller = !0, t.on("checking-for-update", () => {
    o("update:status", { status: "checking" });
  }), i.on("open-external", async (e, a) => {
    if (a && typeof a == "string")
      try {
        await u.openExternal(a);
      } catch (h) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${a}
Lý do: ${h.message}`);
      }
  }), t.on("update-available", (e) => {
    o("update:status", {
      status: "available",
      version: e.version,
      releaseNotes: g(e.releaseNotes)
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
  }), i.on("update:check", () => {
    t.checkForUpdates();
  }), i.on("update:download", () => {
    t.downloadUpdate();
  }), i.on("update:install", () => {
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
  c.getAllWindows().length === 0 && p();
});
s.commandLine.appendSwitch("disable-http2");
s.whenReady().then(() => {
  p(), b(), n && n.webContents.session.clearCache().then(() => {
    console.log("[Electron] Session cache cleared successfully");
  }).catch((e) => {
    console.error("[Electron] Failed to clear session cache:", e);
  });
});
