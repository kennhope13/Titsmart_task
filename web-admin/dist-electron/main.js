import { app as s, BrowserWindow as c, shell as u, ipcMain as i } from "electron";
import d from "path";
import { fileURLToPath as m } from "url";
import f from "electron-updater";
const { autoUpdater: a } = f, w = m(import.meta.url), r = d.dirname(w);
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
      preload: d.join(r, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), l ? n.loadURL(l) : n.loadFile(d.join(process.env.DIST || d.join(r, "../dist"), "index.html")), n.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && u.openExternal(e), { action: "deny" }));
}
function o(e, t) {
  n && !n.isDestroyed() && n.webContents.send(e, t);
}
function g(e) {
  return Array.isArray(e) ? e.map((t) => typeof t == "string" ? t : (t == null ? void 0 : t.note) ?? "").filter(Boolean).join(`
`) : e ?? "";
}
function v() {
  s.isPackaged && (a.autoDownload = !1, a.autoInstallOnAppQuit = !0, a.on("checking-for-update", () => {
    o("update:status", { status: "checking" });
  }), i.on("open-external", async (e, t) => {
    if (t && typeof t == "string")
      try {
        await u.openExternal(t);
      } catch (h) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${t}
Lý do: ${h.message}`);
      }
  }), a.on("update-available", (e) => {
    o("update:status", {
      status: "available",
      version: e.version,
      releaseNotes: g(e.releaseNotes)
    });
  }), a.on("update-not-available", (e) => {
    o("update:status", { status: "not-available", version: e.version });
  }), a.on("download-progress", (e) => {
    o("update:status", {
      status: "downloading",
      percent: Math.round(e.percent),
      transferred: e.transferred,
      total: e.total,
      bytesPerSecond: e.bytesPerSecond
    });
  }), a.on("update-downloaded", (e) => {
    o("update:status", { status: "downloaded", version: e.version });
  }), a.on("error", (e) => {
    o("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
  }), i.on("update:check", () => {
    a.checkForUpdates();
  }), i.on("update:download", () => {
    a.downloadUpdate();
  }), i.on("update:install", () => {
    a.quitAndInstall();
  }), setTimeout(() => {
    a.checkForUpdates().catch((e) => {
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
  p(), v(), n && n.webContents.session.clearCache().then(() => {
    console.log("[Electron] Session cache cleared successfully");
  }).catch((e) => {
    console.error("[Electron] Failed to clear session cache:", e);
  });
});
