import { app as i, BrowserWindow as f, ipcMain as s, shell as h } from "electron";
import r from "path";
import { fileURLToPath as w } from "url";
import g from "electron-updater";
import d from "fs";
const { autoUpdater: n } = g, y = w(import.meta.url), c = r.dirname(y);
let o;
const p = process.env.VITE_DEV_SERVER_URL;
function m() {
  o = new f({
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
      preload: r.join(c, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), p ? (o.loadURL(p), o.webContents.openDevTools()) : o.loadFile(r.join(process.env.DIST || r.join(c, "../dist"), "index.html")), o.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && h.openExternal(e), { action: "deny" }));
}
function a(e, t) {
  o && !o.isDestroyed() && o.webContents.send(e, t);
}
function v(e) {
  return Array.isArray(e) ? e.map((t) => typeof t == "string" ? t : (t == null ? void 0 : t.note) ?? "").filter(Boolean).join(`
`) : e ?? "";
}
function S() {
  i.isPackaged && (n.autoDownload = !0, n.autoInstallOnAppQuit = !0, n.disableDifferentialDownload = !0, n.disableWebInstaller = !0, n.on("checking-for-update", () => {
    a("update:status", { status: "checking" });
  }), s.on("open-external", async (e, t) => {
    if (t && typeof t == "string")
      try {
        await h.openExternal(t);
      } catch (u) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${t}
Lý do: ${u.message}`);
      }
  }), n.on("update-available", (e) => {
    a("update:status", {
      status: "available",
      version: e.version,
      releaseNotes: v(e.releaseNotes)
    });
  }), n.on("update-not-available", (e) => {
    a("update:status", { status: "not-available", version: e.version });
  }), n.on("download-progress", (e) => {
    a("update:status", {
      status: "downloading",
      percent: Math.round(e.percent),
      transferred: e.transferred,
      total: e.total,
      bytesPerSecond: e.bytesPerSecond
    });
  }), n.on("update-downloaded", (e) => {
    a("update:status", { status: "downloaded", version: e.version });
  }), n.on("error", (e) => {
    a("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
  }), s.on("update:check", () => {
    n.checkForUpdates();
  }), s.on("update:download", () => {
    n.downloadUpdate();
  }), s.on("update:install", () => {
    n.quitAndInstall();
  }), setTimeout(() => {
    n.checkForUpdates().catch((e) => {
      a("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
    });
  }, 5e3));
}
i.on("window-all-closed", () => {
  process.platform !== "darwin" && (i.quit(), o = null);
});
i.on("activate", () => {
  f.getAllWindows().length === 0 && m();
});
const l = r.join(i.getPath("userData"), "auth_session.json");
s.on("session:save", (e, t) => {
  try {
    t ? d.writeFileSync(l, JSON.stringify(t), "utf-8") : d.existsSync(l) && d.unlinkSync(l);
  } catch (u) {
    console.error("Failed to write auth_session.json:", u);
  }
});
s.on("session:load", (e) => {
  try {
    if (d.existsSync(l)) {
      const t = d.readFileSync(l, "utf-8");
      if (t) {
        e.returnValue = JSON.parse(t);
        return;
      }
    }
  } catch (t) {
    console.error("Failed to read auth_session.json:", t);
  }
  e.returnValue = null;
});
i.whenReady().then(() => {
  m(), S();
});
