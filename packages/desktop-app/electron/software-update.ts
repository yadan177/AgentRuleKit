import { app, shell } from "electron";
import { execFileSync } from "node:child_process";
import * as electronUpdater from "electron-updater";
import { compareDesktopVersions, fetchDesktopRelease, matchesUpdateInfo, type DesktopRelease } from "./desktop-releases.ts";

const { autoUpdater } = electronUpdater;

export type SoftwareUpdateState = {
  phase: "idle" | "checking" | "current" | "available" | "downloading" | "ready" | "manual" | "error";
  currentVersion: string;
  availableVersion?: string;
  percent?: number;
  message?: string;
};

function canInstallAutomatically(): boolean {
  if (!app.isPackaged || process.platform !== "win32") return false;
  try {
    const status = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(Get-AuthenticodeSignature -LiteralPath $env:AGENTRULEKIT_APP_EXE).Status"], {
      env: { ...process.env, AGENTRULEKIT_APP_EXE: process.execPath }, timeout: 10000, encoding: "utf8", windowsHide: true,
    });
    return status.trim() === "Valid";
  } catch { /* 无法确认签名时只允许手动安装。 */ }
  return false;
}

export class SoftwareUpdateService {
  private state: SoftwareUpdateState = { phase: "idle", currentVersion: app.getVersion() };
  private release?: DesktopRelease;
  private pendingCheck?: Promise<SoftwareUpdateState>;

  constructor(private readonly notify: (state: SoftwareUpdateState) => void) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.on("error", (error) => {
      if (this.state.phase === "available" || this.state.phase === "downloading" || this.state.phase === "ready") {
        this.setState({ phase: "error", currentVersion: app.getVersion(), availableVersion: this.release?.version,
          message: error instanceof Error ? error.message : "软件更新失败" });
      }
    });
    autoUpdater.on("download-progress", ({ percent }) => {
      if (this.state.phase === "downloading") this.setState({ ...this.state, percent: Math.max(0, Math.min(100, Math.round(percent))) });
    });
    autoUpdater.on("update-downloaded", () => {
      if (this.state.phase === "downloading") this.setState({ ...this.state, phase: "ready", percent: 100 });
    });
  }

  getState(): SoftwareUpdateState { return { ...this.state }; }

  private setState(state: SoftwareUpdateState): SoftwareUpdateState {
    this.state = state;
    this.notify(this.getState());
    return this.getState();
  }

  check(): Promise<SoftwareUpdateState> {
    if (this.pendingCheck) return this.pendingCheck;
    if (this.state.phase === "downloading" || this.state.phase === "ready") return Promise.resolve(this.getState());
    this.pendingCheck = this.checkNow().finally(() => { this.pendingCheck = undefined; });
    return this.pendingCheck;
  }

  private async checkNow(): Promise<SoftwareUpdateState> {
    this.setState({ phase: "checking", currentVersion: app.getVersion() });
    this.release = undefined;
    try {
      if (!app.isPackaged) return this.setState({ phase: "current", currentVersion: app.getVersion(), message: "开发模式不检查软件更新" });
      const release = await fetchDesktopRelease(process.platform, process.arch);
      this.release = release;
      if (!release || compareDesktopVersions(release.version, app.getVersion()) <= 0) {
        return this.setState({ phase: "current", currentVersion: app.getVersion() });
      }
      if (process.platform === "darwin") {
        return this.setState({ phase: "manual", currentVersion: app.getVersion(), availableVersion: release.version,
          message: "下载 DMG 后打开安装包，将应用拖入“应用程序”并替换旧版。" });
      }
      if (!canInstallAutomatically()) {
        return this.setState({ phase: "manual", currentVersion: app.getVersion(), availableVersion: release.version, message: "当前 Windows 安装包未通过签名校验，请手动安装新版。" });
      }
      autoUpdater.setFeedURL({ provider: "generic", url: release.feedUrl });
      const result = await autoUpdater.checkForUpdates();
      if (!result?.isUpdateAvailable || !matchesUpdateInfo(result.updateInfo, release.version, process.platform, process.arch)) throw new Error("软件更新清单与发布资产不一致");
      return this.setState({ phase: "available", currentVersion: app.getVersion(), availableVersion: release.version });
    } catch (error) {
      return this.setState({ phase: "error", currentVersion: app.getVersion(), availableVersion: this.release?.version,
        message: error instanceof Error ? error.message : "检查软件版本失败" });
    }
  }

  async download(): Promise<SoftwareUpdateState> {
    if (this.state.phase !== "available" || !this.release) throw new Error("请先检查软件更新");
    this.setState({ ...this.state, phase: "downloading", percent: 0 });
    try {
      await autoUpdater.downloadUpdate();
      return this.setState({ ...this.state, phase: "ready", percent: 100 });
    } catch (error) {
      return this.setState({ phase: "error", currentVersion: app.getVersion(), availableVersion: this.release.version, message: error instanceof Error ? error.message : "下载软件更新失败" });
    }
  }

  install(): void {
    if (this.state.phase !== "ready") throw new Error("软件更新尚未下载完成");
    autoUpdater.quitAndInstall(true, true);
  }

  async openDownloadPage(): Promise<void> {
    if (this.state.phase !== "manual" || !this.release) throw new Error("当前没有可手动安装的软件更新");
    await shell.openExternal(process.platform === "darwin" ? this.release.downloadUrl : this.release.pageUrl);
  }
}
