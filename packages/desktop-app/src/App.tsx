import { useEffect, useState, type ReactNode } from "react";
import { ArrowClockwise, CheckCircle, Cube, FolderSimple, Info, UsersThree, WarningCircle, X } from "@phosphor-icons/react";
import { FaJava } from "react-icons/fa";
import { SiCursor, SiGo, SiJavascript, SiPython, SiUnity } from "react-icons/si";
import { TbBrandOpenai } from "react-icons/tb";

type StackChoice = "unity" | "js-ts" | "java" | "go" | "python";
type PlatformChoice = "codex" | "qoder" | "cursor" | "workbuddy";
type Mode = "install" | "update" | "uninstall";
type Page = "projects" | "ides";
type Change = { path: string; action: "add" | "modify" | "remove"; before?: string; after?: string };
type Issue = { code: string; message: string };
type ProjectStatus = { root: string; installed: boolean; valid: boolean; rulepacks: string[]; targets: PlatformChoice[]; version?: string; issues: Issue[] };
type RegisteredProject = { root: string; addedAt: string; status?: ProjectStatus; error?: string };
type UpdateCheck = { root: string; currentVersion: string; latestVersion: string; available: boolean; targetsChanged: boolean };
type Preview = { kind: Mode; root: string; changes: Change[]; retainedPaths: string[]; conflicts: Issue[]; version?: string; targets: PlatformChoice[] };
type SoftwareUpdateState = { phase: "idle" | "checking" | "current" | "available" | "downloading" | "ready" | "manual" | "error"; currentVersion: string; availableVersion?: string; percent?: number; message?: string };
type DesktopApi = {
  chooseProject(): Promise<ProjectStatus | undefined>;
  listProjects(): Promise<RegisteredProject[]>;
  selectProject(root: string): Promise<ProjectStatus>;
  forgetProject(root: string): Promise<void>;
  previewInstall(stack: StackChoice, platforms: PlatformChoice[]): Promise<Preview>;
  applyInstall(): Promise<ProjectStatus>;
  checkUpdate(platforms: PlatformChoice[]): Promise<UpdateCheck>;
  previewUpdate(): Promise<Preview>;
  applyUpdate(): Promise<ProjectStatus>;
  previewUninstall(): Promise<Preview>;
  applyUninstall(): Promise<ProjectStatus>;
  clearPreview(): Promise<void>;
  getSoftwareUpdate(): Promise<SoftwareUpdateState>;
  checkSoftwareUpdate(): Promise<SoftwareUpdateState>;
  downloadSoftwareUpdate(): Promise<SoftwareUpdateState>;
  installSoftwareUpdate(): Promise<void>;
  openSoftwareDownload(): Promise<void>;
  onSoftwareUpdate(listener: (state: SoftwareUpdateState) => void): () => void;
};
declare global { interface Window { agentRuleKit?: DesktopApi } }

const stacks = [
  { id: "unity", name: "Unity", Icon: SiUnity, color: "#252525", packs: ["通用规则", "Unity 开发规则", "Unity 文档规则"] },
  { id: "js-ts", name: "JS + TS", Icon: SiJavascript, color: "#e3bf19", packs: ["通用规则", "JavaScript 开发规则", "TypeScript 开发规则", "JS/TS 文档规则"] },
  { id: "java", name: "Java", Icon: FaJava, color: "#e75822", packs: ["通用规则", "Java 开发规则", "Java 文档规则"] },
  { id: "go", name: "Go", Icon: SiGo, color: "#0798b8", packs: ["通用规则", "Go 开发规则", "Go 文档规则"] },
  { id: "python", name: "Python", Icon: SiPython, color: "#3475a7", packs: ["通用规则", "Python 开发规则", "Python 文档规则"] },
] as const;
const platforms = [
  { id: "codex", name: "Codex", Icon: TbBrandOpenai },
  { id: "qoder", name: "Qoder", Icon: Cube },
  { id: "cursor", name: "Cursor", Icon: SiCursor },
  { id: "workbuddy", name: "WorkBuddy", Icon: UsersThree },
] as const;
const platformName: Record<PlatformChoice, string> = Object.fromEntries(platforms.map((item) => [item.id, item.name])) as Record<PlatformChoice, string>;
function platformLabel(targets: PlatformChoice[]): string { return targets.map((target) => platformName[target] ?? target).join(" · "); }
const packNames: Record<string, string> = {
  common: "通用规则", unity: "Unity 开发规则", javascript: "JavaScript 开发规则", typescript: "TypeScript 开发规则",
  java: "Java 开发规则", go: "Go 开发规则", python: "Python 开发规则",
  "project-docs/unity": "Unity 文档规则", "project-docs/js-ts": "JS/TS 文档规则",
  "project-docs/java": "Java 文档规则", "project-docs/go": "Go 文档规则", "project-docs/python": "Python 文档规则",
};

function message(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/^Error invoking remote method '[^']+': Error: /, "");
  return String(error);
}
function Choice({ item, selected, disabled, multi, onSelect }: {
  item: (typeof stacks)[number] | (typeof platforms)[number]; selected: boolean; disabled?: boolean; multi?: boolean; onSelect?: () => void;
}) {
  const Icon = item.Icon;
  return <button type="button" className={`choice${selected ? " selected" : ""}${multi ? " multi" : ""}`}
    role={multi ? "checkbox" : "radio"} aria-checked={selected} disabled={disabled} onClick={onSelect}>
    <Icon className="choice-icon" size={45} color={"color" in item ? item.color : undefined} aria-hidden="true" />
    <span className="choice-name">{item.name}</span>
    <span className="radio-indicator" aria-hidden="true"><span /></span>
  </button>;
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop"><section className="modal preview-modal" role="dialog" aria-modal="true" aria-label={title}>
    <header className="modal-header"><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="关闭"><X size={22} /></button></header>
    {children}
  </section></div>;
}
function PreviewDialog({ preview, busy, onClose, onApply }: { preview: Preview; busy: boolean; onClose: () => void; onApply: () => void }) {
  const [selected, setSelected] = useState(0);
  const current = preview.changes[selected];
  const actionLabel = { add: "新增", modify: "修改", remove: "删除" };
  return <Modal title={preview.kind === "install" ? "安装预览" : preview.kind === "update" ? "更新变更" : "卸载预览"} onClose={onClose}>
    <div className="preview-meta"><strong>{preview.root}</strong><span>{platformLabel(preview.targets)} · {preview.kind === "uninstall" ? "项目规则" : `规则版本 ${preview.version}`}</span></div>
    {preview.conflicts.length > 0 && <div className="issue-box"><WarningCircle size={19} /><div>{preview.conflicts.map((issue) => <p key={issue.code + issue.message}>{issue.message}</p>)}</div></div>}
    <div className="preview-section"><h3>文件变更 · {preview.changes.length}</h3><div className="change-list">
      {preview.changes.map((change, index) => <button type="button" key={change.path} className={`change-row${selected === index ? " active" : ""}`} onClick={() => setSelected(index)}>
        <span className={`change-action ${change.action}`}>{actionLabel[change.action]}</span><span>{change.path}</span>
      </button>)}
    </div></div>
    {current && <div className="preview-section"><h3>文件内容 · {current.path}</h3><div className="content-comparison">
      {current.before !== undefined && <div><span>原内容</span><pre>{current.before}</pre></div>}
      {current.after !== undefined && <div><span>变更后</span><pre>{current.after}</pre></div>}
    </div></div>}
    {preview.retainedPaths.length > 0 && <div className="preview-section"><h3>保留项目文件</h3><ul className="retained-list">{preview.retainedPaths.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    <div className="demo-note"><Info size={18} />{preview.kind === "install" ? "确认后才会写入项目。" : preview.kind === "update" ? "确认后才会更新规则；项目本地文件会保留。" : "仅删除内容未漂移的受管文件；上方列出的项目文件会保留。"}</div>
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>返回</button>
      <button type="button" className={`primary-button${preview.kind === "uninstall" ? " danger-button" : ""}`} onClick={onApply} disabled={busy || preview.conflicts.length > 0 || preview.changes.length === 0}>
        {busy ? "处理中…" : preview.kind === "install" ? "确认安装" : preview.kind === "update" ? "确认更新" : "确认卸载"}
      </button></div>
  </Modal>;
}

export function App() {
  const [page, setPage] = useState<Page>("projects");
  const [mode, setMode] = useState<Mode>("install");
  const [status, setStatus] = useState<ProjectStatus>();
  const [projects, setProjects] = useState<RegisteredProject[]>([]);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck>();
  const [stackId, setStackId] = useState<StackChoice>("unity");
  const [platformIds, setPlatformIds] = useState<PlatformChoice[]>(["codex"]);
  const [preview, setPreview] = useState<Preview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [softwareState, setSoftwareState] = useState<SoftwareUpdateState>();
  const [softwareBusy, setSoftwareBusy] = useState(false);
  const [softwareError, setSoftwareError] = useState("");
  const stack = stacks.find((item) => item.id === stackId)!;
  const unavailable = !window.agentRuleKit;

  useEffect(() => {
    const desktop = window.agentRuleKit;
    if (!desktop) return;
    const unsubscribe = desktop.onSoftwareUpdate(setSoftwareState);
    void desktop.getSoftwareUpdate().then(setSoftwareState).catch(() => {});
    void desktop.listProjects().then(setProjects).catch((problem) => setError(message(problem)));
    return unsubscribe;
  }, []);

  function softwareAction(): void {
    const desktop = window.agentRuleKit;
    if (!desktop || !softwareState || softwareBusy) return;
    setSoftwareBusy(true); setSoftwareError("");
    void (async () => {
      try {
        if (softwareState.phase === "manual") return await desktop.openSoftwareDownload();
        if (softwareState.phase === "ready") return await desktop.installSoftwareUpdate();
        let state = softwareState;
        if (state.phase === "error") state = await desktop.checkSoftwareUpdate();
        if (state.phase === "manual") return await desktop.openSoftwareDownload();
        if (state.phase === "error") { setSoftwareError(state.message ?? "检查软件版本失败"); return; }
        if (state.phase !== "available") return;
        state = await desktop.downloadSoftwareUpdate();
        if (state.phase === "ready") await desktop.installSoftwareUpdate();
        else if (state.phase === "error") setSoftwareError(state.message ?? "下载软件更新失败");
      } catch (problem) { setSoftwareError(message(problem)); }
      finally { setSoftwareBusy(false); }
    })();
  }

  const softwareTip = softwareState?.phase === "available" || softwareState?.phase === "manual" || softwareState?.phase === "downloading" || softwareState?.phase === "ready" || (softwareState?.phase === "error" && !!softwareState.availableVersion);
  const softwareLabel = softwareState?.phase === "ready" ? "重启完成更新" : softwareState?.phase === "downloading" ? `正在下载 ${softwareState.percent ?? 0}%`
    : softwareState?.phase === "error" ? "更新失败 · 重试" : softwareState?.phase === "manual" ? "发现新版 · 下载后安装" : "发现新版 · 点击更新";

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true); setError("");
    try { await action(); } catch (problem) { setError(message(problem)); }
    finally { setBusy(false); }
  }
  function api(): DesktopApi {
    if (!window.agentRuleKit) throw new Error("请在桌面应用中使用工具箱");
    return window.agentRuleKit;
  }
  function showProject(selected: ProjectStatus): void {
    setStatus(selected); setMode(selected.installed ? "update" : "install");
    setPlatformIds(selected.installed ? selected.targets : ["codex"]);
    setUpdateCheck(undefined); setPreview(undefined); setNotice(""); setPage("projects");
  }
  function clearPreview(): void {
    setPreview(undefined);
    if (window.agentRuleKit) void window.agentRuleKit.clearPreview().catch((problem) => setError(message(problem)));
  }
  function chooseProject(): void {
    void run(async () => {
      const selected = await api().chooseProject();
      if (selected) { showProject(selected); setProjects(await api().listProjects()); }
    });
  }
  function selectProject(root: string): void {
    void run(async () => showProject(await api().selectProject(root)));
  }
  function forgetProject(root: string): void {
    void run(async () => {
      await api().forgetProject(root);
      if (status?.root === root) { setStatus(undefined); setPreview(undefined); setUpdateCheck(undefined); }
      setProjects(await api().listProjects());
      setNotice("已从工具箱列表移除；项目规则文件没有变化。");
    });
  }
  function openPreview(): void {
    void run(async () => {
      if (!status) throw new Error("请先选择项目文件夹");
      setPreview(mode === "install" ? await api().previewInstall(stackId, platformIds) : mode === "update" ? await api().previewUpdate() : await api().previewUninstall());
    });
  }
  function checkForUpdate(): void {
    void run(async () => {
      if (!status) throw new Error("请先选择项目文件夹");
      const result = await api().checkUpdate(platformIds);
      setUpdateCheck(result);
      setNotice(result.targetsChanged ? `平台选择有变更，可查看变更。规则版本 ${result.latestVersion}。` : result.available ? `发现规则版本 ${result.latestVersion}，可查看变更。` : `已是最新规则版本 ${result.latestVersion}。`);
    });
  }
  function apply(): void {
    if (!preview) return;
    void run(async () => {
      const result = preview.kind === "install" ? await api().applyInstall() : preview.kind === "update" ? await api().applyUpdate() : await api().applyUninstall();
      setStatus(result); setPlatformIds(result.installed ? result.targets : ["codex"]); setPreview(undefined);
      setUpdateCheck(undefined);
      setProjects(await api().listProjects());
      setNotice(preview.kind === "install" ? "安装完成，项目规则校验通过。" : preview.kind === "update" ? `更新完成，当前规则版本 ${result.version}。` : "卸载完成，项目本地文件已保留。");
      if (!result.valid && result.installed) setError(result.issues.map((item) => item.message).join("；"));
    });
  }

  function togglePlatform(id: PlatformChoice): void {
    setPlatformIds((current) => current.includes(id) ? current.filter((target) => target !== id) : [...current, id]);
    setUpdateCheck(undefined); setNotice("");
  }
  const cannotPreview = busy || !status || (mode === "install" ? status.installed || platformIds.length === 0 : mode === "update" ? !status.installed || !status.valid || platformIds.length === 0 : !status.installed);
  return <div className="app-shell">
    <header className="app-header"><span className="brand">AI 开发工具箱</span>
      {!unavailable && softwareTip && <button type="button" className="software-tip has-update" onClick={softwareAction} disabled={softwareBusy || softwareState?.phase === "downloading"} title={softwareError || softwareState?.message || undefined} aria-label={`软件更新：${softwareLabel}`}><ArrowClockwise size={18} aria-hidden="true" />{softwareLabel}</button>}
      <nav className="mode-switch" aria-label="工具箱页面">
      <button type="button" className={page === "projects" ? "active" : ""} disabled={busy} onClick={() => setPage("projects")}>项目</button>
      <button type="button" className={page === "ides" ? "active" : ""} disabled={busy} onClick={() => { clearPreview(); setPage("ides"); }}>IDE</button>
    </nav></header>
    {page === "ides" ? <main className="main-content"><h1>IDE 交付</h1>
      <p className="section-intro">工具箱独立运行；以后选择的 Skill 和能力插件会安装到对应 IDE 的个人环境。当前只提供项目规则交付。</p>
      <div className="ide-status-grid">
        {platforms.map((item) => <section className="ide-status-card" key={item.id}><strong>{item.name}</strong>
          <span>{item.id === "codex" ? "项目规则入口已实现" : "共享 AGENTS.md 项目规则入口已生成；客户端加载待验收"}</span>
          <small>个人环境 Skill／能力插件安装：尚未实现</small>
        </section>)}
        <section className="ide-status-card"><strong>Trae</strong><span>适配器尚未实现</span><small>个人环境 Skill／能力插件安装：尚未实现</small></section>
      </div>
      {error && <div className="error" role="alert"><WarningCircle size={20} />{error}</div>}
    </main> : <>
    <main className="main-content"><h1>项目</h1>
      <p className="section-intro">一个工具箱管理多个项目；每个项目分别安装和更新自己的规则。</p>
      <section className="registered-projects" aria-label="已登记项目"><div className="section-heading"><h2>我的项目</h2><button type="button" className="secondary-button" onClick={chooseProject} disabled={busy || unavailable}><FolderSimple size={18} aria-hidden="true" />添加项目</button></div>
        {projects.length === 0 ? <p className="empty-projects">尚未添加项目。选择已有工程后，可以查看其规则状态或安装规则。</p> :
          <div className="project-list">{projects.map((item) => <div className={`project-list-item${status?.root === item.root ? " current" : ""}`} key={item.root}>
            <button type="button" className="project-list-select" onClick={() => selectProject(item.root)} disabled={busy || !!item.error} title={item.root}>
              <strong>{item.root.split(/[\\/]/).filter(Boolean).at(-1) ?? item.root}</strong><span>{item.root}</span>
            </button>
            <span className="project-list-state">{item.error ? "路径不可用" : item.status?.installed ? item.status.valid ? `规则 ${item.status.version ?? "已安装"}` : "规则需处理" : "未安装规则"}</span>
            <button type="button" className="text-button" onClick={() => forgetProject(item.root)} disabled={busy} title="仅从工具箱列表移除，不卸载项目规则">移出列表</button>
          </div>)}</div>}
      </section>
      <nav className="mode-switch rule-mode-switch" aria-label="规则操作">
      <button type="button" className={mode === "install" ? "active" : ""} disabled={busy} onClick={() => { setMode("install"); clearPreview(); setError(""); }}>安装</button>
      <button type="button" className={mode === "update" ? "active" : ""} disabled={busy} onClick={() => { setMode("update"); clearPreview(); setError(""); }}>更新</button>
      <button type="button" className={mode === "uninstall" ? "active" : ""} disabled={busy} onClick={() => { setMode("uninstall"); clearPreview(); setError(""); }}>卸载</button>
    </nav><h2 className="rule-heading">{mode === "install" ? "安装规则" : mode === "update" ? "更新规则" : "卸载规则"}</h2>
      <div className="project-row"><span className="section-inline-label">项目</span><div className="project-field">
        <span className={`project-path${status ? "" : " placeholder"}`} title={status?.root}>{status?.root ?? "请选择项目文件夹"}</span>
        <button type="button" className="project-button" onClick={chooseProject} disabled={busy || unavailable}><FolderSimple size={26} aria-hidden="true" />选择</button>
      </div></div>
      {status && <div className={`project-status ${status.installed ? status.valid ? "installed" : "invalid" : "empty"}`}>
        {status.installed ? status.valid ? `已安装 · ${platformLabel(status.targets)}${status.version ? ` · ${status.version}` : ""}` : "规则状态需处理" : "未安装规则"}
      </div>}
      {mode === "install" ? <>
        <section className="selection-section" aria-labelledby="stack-heading"><h2 id="stack-heading">技术栈</h2><div className="choice-grid stack-grid" role="radiogroup" aria-label="技术栈">
          {stacks.map((item) => <Choice key={item.id} item={item} selected={stackId === item.id} disabled={busy || !!status?.installed} onSelect={() => setStackId(item.id)} />)}
        </div></section>
        <section className="selection-section platform-section" aria-labelledby="platform-heading"><h2 id="platform-heading">平台（可多选）</h2><div className="choice-grid platform-grid" role="group" aria-label="目标平台">
          {platforms.map((item) => <Choice key={item.id} item={item} multi selected={platformIds.includes(item.id)} disabled={busy || !!status?.installed}
            onSelect={() => togglePlatform(item.id)} />)}
        </div></section>
      </> : <section className="selection-section uninstall-section"><h2>已安装规则</h2>
        <div className="uninstall-card">{status?.installed ? <><strong>{platformLabel(status.targets)} · {status.version ?? "版本未知"}</strong><span>{status.rulepacks.map((id) => packNames[id] ?? id).join(" · ") || "规则包信息无法读取"}</span></> : <span>{status ? "该项目没有安装规则" : "选择已安装规则的项目"}</span>}</div>
        {mode === "update" && status?.installed && <div className="platform-edit"><h2>平台（可调整）</h2><div className="choice-grid platform-grid" role="group" aria-label="更新目标平台">
          {platforms.map((item) => <Choice key={item.id} item={item} multi selected={platformIds.includes(item.id)} disabled={busy || !status.valid} onSelect={() => togglePlatform(item.id)} />)}
        </div></div>}
        {mode === "update" && updateCheck && <p className="update-result">{updateCheck.targetsChanged ? `平台选择有变更 · 规则版本 ${updateCheck.latestVersion}` : updateCheck.available ? `当前 ${updateCheck.currentVersion} → 最新 ${updateCheck.latestVersion}` : `当前 ${updateCheck.currentVersion} · 已是最新版本`}</p>}
        {status?.issues.map((issue) => <p className="inline-issue" key={issue.code + issue.message}>{issue.message}</p>)}
      </section>}
      {error && <div className="error" role="alert"><WarningCircle size={20} />{error}</div>}
      {notice && <div className="notice" role="status"><CheckCircle size={20} />{notice}</div>}
      {unavailable && <div className="error" role="alert">请在桌面应用中打开此页面。</div>}
    </main>
    <footer className="app-footer"><div className="summary">{mode === "install" ? `本次安装：${stack.packs.join(" · ")}${platformIds.length ? ` · ${platformLabel(platformIds)}` : " · 请选择平台"}` : mode === "update" ? "更新前可逐文件查看变更" : "卸载后保留项目本地文件"}</div>
      <button type="button" className={`primary-button${mode === "uninstall" ? " danger-button" : ""}`} onClick={mode === "update" && !updateCheck?.available ? checkForUpdate : openPreview} disabled={cannotPreview}>
        {busy ? "处理中…" : mode === "install" ? "安装" : mode === "update" ? updateCheck?.available ? "查看变更" : "检查更新" : "卸载"}
      </button></footer>
    </>}
    {preview && <PreviewDialog preview={preview} busy={busy} onClose={() => { if (!busy) clearPreview(); }} onApply={apply} />}
    {softwareError && <div className="software-error" role="alert">{softwareError}</div>}
  </div>;
}
