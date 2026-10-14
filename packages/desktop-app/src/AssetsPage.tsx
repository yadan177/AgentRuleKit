import { useEffect, useState } from "react";
import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";

type Ide = "codex" | "traework";
type Source = { kind: "skill" | "capability-plugin"; key: string; name: string; version: string; title: string; author: string; license: string;
  sourceRoot: string; files: { path: string }[]; skills: string[]; runtimeDependencies: string[]; delivery: string };
type Installed = { id: string; title: string; kind: string; version: string; sourceKey: string; destination: string;
  target: { ideId: string }; issues: string[]; recognition: string; recognitionNote?: string; runtimeVerified: false };
type Plan = { token: string; action: "install" | "update" | "uninstall"; ideId: string; title: string; version: string; destination: string;
  conflicts: string[]; retainedPaths: string[]; changes: { path: string; action: string; before?: string; after?: string }[] };
export type AssetsApi = {
  listPluginImports(): Promise<Source[]>;
  inspectPluginSource(): Promise<Source | undefined>;
  importPluginSource(): Promise<Source>;
  exportTraeWorkSkill(key: string): Promise<{ path: string } | undefined>;
  listUserAssets(): Promise<Installed[]>;
  previewUserAsset(action: Plan["action"], key: string, ide: Ide, id?: string): Promise<Plan>;
  applyUserAsset(token: string): Promise<Installed[]>;
};
const ideNames: Record<string, string> = { codex: "Codex", traework: "TraeWork（实验）" };
const verbs = { install: "安装", update: "更新", uninstall: "卸载" };
export function AssetsPage({ api }: { api?: AssetsApi }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [ide, setIde] = useState<Ide>("codex");
  const [source, setSource] = useState<Source>();
  const [plan, setPlan] = useState<Plan>();
  const [selected, setSelected] = useState(0);
  const [updateKeys, setUpdateKeys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (problem) { setError(problem instanceof Error ? problem.message : String(problem)); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (api) void run(async () => {
    const [library, records] = await Promise.allSettled([api.listPluginImports(), api.listUserAssets()]);
    if (library.status === "fulfilled") setSources(library.value);
    if (records.status === "fulfilled") setInstalled(records.value);
    const failure = [library, records].find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }); }, [api]);
  function preview(action: Plan["action"], key: string, target: Ide, id?: string) {
    if (!api) return;
    void run(async () => { setSelected(0); setPlan(await api.previewUserAsset(action, key, target, id)); });
  }
  const change = plan?.changes[selected];
  return <main className="main-content assets-page"><h1>插件与技能</h1>
    <div className="asset-toolbar"><label>安装到 <select value={ide} disabled={busy} onChange={(event) => setIde(event.target.value as Ide)}>
      <option value="codex">Codex</option><option value="traework">TraeWork（实验）</option></select></label>
      <button className="secondary-button" disabled={busy || !api} onClick={() => { if (api) void run(async () => setSource(await api.inspectPluginSource())); }}>导入</button>
      <button className="secondary-button" disabled={busy || !api} onClick={() => { if (api) void run(async () => setInstalled(await api.listUserAssets())); }}>检查状态</button>
    </div>
    {error && <div className="error" role="alert"><WarningCircle size={20} />{error}</div>}
    {notice && <div className="notice" role="status"><CheckCircle size={20} />{notice}</div>}
    <section className="registered-projects"><h2>内容库</h2>
      {sources.length === 0 ? <p className="empty-projects">暂无内容</p> : sources.map((item) => {
        const supported = ide === "codex" || item.kind === "skill" || item.delivery === "traework-skill";
        return <article className="imported-plugin" key={item.key}><strong>{item.title} · {item.version}</strong>
          <span>{item.kind === "skill" ? "技能" : `插件 · ${item.skills.length} 个技能`} · {item.license}</span>
          {item.runtimeDependencies.length > 0 && <span>需授权</span>}
          <div className="asset-actions"><button className="primary-button" disabled={busy || !api || !supported} onClick={() => preview("install", item.key, ide)}>安装到 {ideNames[ide]}</button>
            {item.delivery === "traework-skill" && <button className="secondary-button" disabled={busy || !api} onClick={() => { if (api) void run(async () => {
              const result = await api.exportTraeWorkSkill(item.key); if (result) setNotice(`已导出：${result.path}`);
            }); }}>导出技能包</button>}</div>
          {!supported && <span>不支持</span>}
        </article>;
      })}
    </section>
    <section className="registered-projects"><h2>已安装</h2>
      {installed.length === 0 ? <p className="empty-projects">暂无安装记录</p> : installed.map((item) => {
        const sourceName = item.sourceKey.split("@")[0].replace(/^skill\./, "");
        const candidates = sources.filter((candidate) => candidate.name === sourceName && candidate.kind === (item.sourceKey.startsWith("skill.") ? "skill" : "capability-plugin"));
        const row = `${item.target.ideId}:${item.id}`;
        const key = updateKeys[row] ?? candidates.at(-1)?.key ?? item.sourceKey;
        return <article className="imported-plugin" key={row}><strong>{item.title} · {item.version}</strong>
          <span>{ideNames[item.target.ideId]} · {item.issues.length ? "需处理" : item.recognition === "host-verified" ? "已识别" : "文件正常"}</span>
          {item.recognitionNote && <span>已停用</span>}
          {item.issues.map((issue) => <p className="inline-issue" key={issue}>{issue}</p>)}
          <div className="asset-actions"><label>更新来源 <select value={key} disabled={busy || !candidates.length} onChange={(event) => setUpdateKeys((current) => ({ ...current, [row]: event.target.value }))}>
            {candidates.length ? candidates.map((candidate) => <option key={candidate.key} value={candidate.key}>{candidate.version}</option>) : <option value={key}>未导入来源</option>}</select></label>
            <button className="secondary-button" disabled={busy || !api || !candidates.length || !!item.issues.length} onClick={() => preview("update", key, item.target.ideId as Ide, item.id)}>预览更新</button>
            <button className="secondary-button" disabled={busy || !api || !!item.issues.length} onClick={() => preview("uninstall", "", item.target.ideId as Ide, item.id)}>预览卸载</button></div>
        </article>;
      })}
    </section>
    {source && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="导入预览"><div className="modal-header"><h2>导入预览</h2><button className="icon-button" aria-label="关闭" disabled={busy} onClick={() => setSource(undefined)}><X /></button></div>
      <p>{source.title} · {source.version}</p><p>{source.kind === "skill" ? "技能" : "插件"} · {source.files.length} 个文件 · {source.license}</p>
      <div className="modal-actions"><button className="secondary-button" disabled={busy} onClick={() => setSource(undefined)}>返回</button><button className="primary-button" disabled={busy} onClick={() => { if (api) void run(async () => {
        await api.importPluginSource(); setSources(await api.listPluginImports()); setSource(undefined); setNotice("导入完成");
      }); }}>确认导入</button></div></section></div>}
    {plan && <div className="modal-backdrop"><section className="modal preview-modal" role="dialog" aria-modal="true" aria-label="安装变更预览"><div className="modal-header"><h2>{verbs[plan.action]}预览</h2><button className="icon-button" aria-label="关闭" disabled={busy} onClick={() => setPlan(undefined)}><X /></button></div>
      <p>{plan.title} · {ideNames[plan.ideId]} · {plan.version}</p><p className="asset-destination">{plan.destination}</p>
      {plan.conflicts.map((conflict) => <p className="error" key={conflict}>{conflict}</p>)}
      <div className="change-list">{plan.changes.map((file, index) => <button className={`change-row${selected === index ? " active" : ""}`} key={file.path} onClick={() => setSelected(index)}>
        <span className={`change-action ${file.action}`}>{file.action === "add" ? "新增" : file.action === "remove" ? "删除" : "修改"}</span><span>{file.path}</span></button>)}</div>
      {change && <div className="file-diff"><pre>{change.before ?? "（原文件不存在）"}</pre><pre>{change.after ?? "（将删除）"}</pre></div>}
      {plan.retainedPaths.length > 0 && <p>保留：{plan.retainedPaths.join("、")}</p>}
      <div className="modal-actions"><button className="secondary-button" disabled={busy} onClick={() => setPlan(undefined)}>返回</button><button className="primary-button" disabled={busy || !!plan.conflicts.length} onClick={() => { if (api) void run(async () => {
        setInstalled(await api.applyUserAsset(plan.token)); setPlan(undefined);
        setNotice(`${verbs[plan.action]}完成`);
      }); }}>确认{verbs[plan.action]}</button></div></section></div>}
  </main>;
}
