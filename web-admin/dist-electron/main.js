import { app as s, BrowserWindow as p, shell as u, ipcMain as i } from "electron";
import d from "path";
import { fileURLToPath as m } from "url";
import h from "electron-updater";
const { autoUpdater: a } = h, w = m(import.meta.url), r = d.dirname(w);
let o;
const l = process.env.VITE_DEV_SERVER_URL;
function c() {
  o = new p({
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
      preload: d.join(r, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), l ? o.loadURL(l) : o.loadFile(d.join(process.env.DIST || d.join(r, "../dist"), "index.html")), o.webContents.setWindowOpenHandler(({ url: t }) => ((t.startsWith("http://") || t.startsWith("https://")) && u.openExternal(t), { action: "deny" }));
}
function n(t, e) {
  o && !o.isDestroyed() && o.webContents.send(t, e);
}
function g(t) {
  return Array.isArray(t) ? t.map((e) => typeof e == "string" ? e : (e == null ? void 0 : e.note) ?? "").filter(Boolean).join(`
`) : t ?? "";
}
function v() {
  s.isPackaged && (a.autoDownload = !1, a.autoInstallOnAppQuit = !0, a.on("checking-for-update", () => {
    n("update:status", { status: "checking" });
  }), i.on("open-external", async (t, e) => {
    if (e && typeof e == "string")
      try {
        await u.openExternal(e);
      } catch (f) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${e}
Lý do: ${f.message}`);
      }
  }), a.on("update-available", (t) => {
    n("update:status", {
      status: "available",
      version: t.version,
      releaseNotes: g(t.releaseNotes)
    });
  }), a.on("update-not-available", (t) => {
    n("update:status", { status: "not-available", version: t.version });
  }), a.on("download-progress", (t) => {
    n("update:status", {
      status: "downloading",
      percent: Math.round(t.percent),
      transferred: t.transferred,
      total: t.total,
      bytesPerSecond: t.bytesPerSecond
    });
  }), a.on("update-downloaded", (t) => {
    n("update:status", { status: "downloaded", version: t.version });
  }), a.on("error", (t) => {
    n("update:status", { status: "error", message: (t == null ? void 0 : t.message) ?? String(t) });
  }), i.on("update:check", () => {
    a.checkForUpdates();
  }), i.on("update:download", () => {
    a.downloadUpdate();
  }), i.on("update:install", () => {
    a.quitAndInstall();
  }), setTimeout(() => {
    a.checkForUpdates().catch((t) => {
      n("update:status", { status: "error", message: (t == null ? void 0 : t.message) ?? String(t) });
    });
  }, 5e3));
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), o = null);
});
s.on("activate", () => {
  p.getAllWindows().length === 0 && c();
});
s.whenReady().then(() => {
  c(), v();
});
