import { app as a, ipcMain as i, BrowserWindow as h, shell as m } from "electron";
import r from "path";
import { fileURLToPath as g } from "url";
import y from "electron-updater";
import d from "fs";
const { autoUpdater: o } = y, v = g(import.meta.url), p = r.dirname(v);
let n, c = !1;
const f = process.env.VITE_DEV_SERVER_URL;
function w() {
  n = new h({
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
      preload: r.join(p, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), f ? (n.loadURL(f), n.webContents.openDevTools()) : n.loadFile(r.join(process.env.DIST || r.join(p, "../dist"), "index.html")), n.webContents.setWindowOpenHandler(({ url: e }) => ((e.startsWith("http://") || e.startsWith("https://")) && m.openExternal(e), { action: "deny" })), n.on("close", (e) => {
    !c && n && !n.isDestroyed() && (e.preventDefault(), n.webContents.send("app:request-close"));
  });
}
function s(e, t) {
  n && !n.isDestroyed() && n.webContents.send(e, t);
}
function b(e) {
  return Array.isArray(e) ? e.map((t) => typeof t == "string" ? t : (t == null ? void 0 : t.note) ?? "").filter(Boolean).join(`
`) : e ?? "";
}
function S() {
  a.isPackaged && (o.autoDownload = !0, o.autoInstallOnAppQuit = !0, o.disableDifferentialDownload = !0, o.disableWebInstaller = !0, o.on("checking-for-update", () => {
    s("update:status", { status: "checking" });
  }), i.on("open-external", async (e, t) => {
    if (t && typeof t == "string")
      try {
        await m.openExternal(t);
      } catch (u) {
        require("electron").dialog.showErrorBox("Lỗi mở ảnh", `Không thể mở đường dẫn: ${t}
Lý do: ${u.message}`);
      }
  }), o.on("update-available", (e) => {
    s("update:status", {
      status: "available",
      version: e.version,
      releaseNotes: b(e.releaseNotes)
    });
  }), o.on("update-not-available", (e) => {
    s("update:status", { status: "not-available", version: e.version });
  }), o.on("download-progress", (e) => {
    s("update:status", {
      status: "downloading",
      percent: Math.round(e.percent),
      transferred: e.transferred,
      total: e.total,
      bytesPerSecond: e.bytesPerSecond
    });
  }), o.on("update-downloaded", (e) => {
    s("update:status", { status: "downloaded", version: e.version });
  }), o.on("error", (e) => {
    s("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
  }), i.on("update:check", () => {
    o.checkForUpdates();
  }), i.on("update:download", () => {
    o.downloadUpdate();
  }), i.on("update:install", () => {
    o.quitAndInstall();
  }), setTimeout(() => {
    o.checkForUpdates().catch((e) => {
      s("update:status", { status: "error", message: (e == null ? void 0 : e.message) ?? String(e) });
    });
  }, 5e3));
}
a.on("before-quit", () => {
  c = !0;
});
i.on("app:confirm-quit", () => {
  c = !0, n && !n.isDestroyed() && n.destroy(), a.quit();
});
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (a.quit(), n = null);
});
a.on("activate", () => {
  h.getAllWindows().length === 0 && w();
});
const l = r.join(a.getPath("userData"), "auth_session.json");
i.on("session:save", (e, t) => {
  try {
    t ? d.writeFileSync(l, JSON.stringify(t), "utf-8") : d.existsSync(l) && d.unlinkSync(l);
  } catch (u) {
    console.error("Failed to write auth_session.json:", u);
  }
});
i.on("session:load", (e) => {
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
a.whenReady().then(() => {
  w(), S();
});
