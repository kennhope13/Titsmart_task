import { app as s, BrowserWindow as c, shell as u, ipcMain as i } from "electron";
import d from "path";
import { fileURLToPath as m } from "url";
import f from "electron-updater";
const { autoUpdater: o } = f, w = m(import.meta.url), r = d.dirname(w);
let a;
const l = process.env.VITE_DEV_SERVER_URL;
function p() {
  a = new c({
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
      preload: d.join(r, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), l ? (a.loadURL(l), a.webContents.openDevTools()) : a.loadFile(d.join(process.env.DIST || d.join(r, "../dist"), "index.html")), a.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && u.openExternal(e), { action: "deny" }));
}
function n(e, t) {
  a && !a.isDestroyed() && a.webContents.send(e, t);
}
function g(e) {
  return Array.isArray(e) ? e.map((t) => typeof t == "string" ? t : (t == null ? void 0 : t.note) ?? "").filter(Boolean).join(`
`) : e ?? "";
}
function v() {
  s.isPackaged && (o.autoDownload = !1, o.autoInstallOnAppQuit = !0, o.on("checking-for-update", () => {
    n("update:status", { status: "checking" });
  }), i.on("open-external", async (e, t) => {
    if (t && typeof t == "string")
      try {
        await u.openExternal(t);
      } catch (h) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${t}
Lý do: ${h.message}`);
      }
  }), o.on("update-available", (e) => {
    n("update:status", {
      status: "available",
      version: e.version,
      releaseNotes: g(e.releaseNotes)
    });
  }), o.on("update-not-available", (e) => {
    n("update:status", { status: "not-available", version: e.version });
  }), o.on("download-progress", (e) => {
    n("update:status", {
      status: "downloading",
      percent: Math.round(e.percent),
      transferred: e.transferred,
      total: e.total,
      bytesPerSecond: e.bytesPerSecond
    });
  }), o.on("update-downloaded", (e) => {
    n("update:status", { status: "downloaded", version: e.version });
  }), o.on("error", (e) => {
    n("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
  }), i.on("update:check", () => {
    o.checkForUpdates();
  }), i.on("update:download", () => {
    o.downloadUpdate();
  }), i.on("update:install", () => {
    o.quitAndInstall();
  }), setTimeout(() => {
    o.checkForUpdates().catch((e) => {
      n("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
    });
  }, 5e3));
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), a = null);
});
s.on("activate", () => {
  c.getAllWindows().length === 0 && p();
});
s.commandLine.appendSwitch("disable-http2");
s.whenReady().then(() => {
  p(), v(), a && a.webContents.session.clearCache().then(() => {
    console.log("[Electron] Session cache cleared successfully");
  }).catch((e) => {
    console.error("[Electron] Failed to clear session cache:", e);
  });
});
