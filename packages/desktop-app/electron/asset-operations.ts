import os from "node:os";
import path from "node:path";
import { CodexPluginHost, codexRunner, discoverCodexSkills, findCodexCli } from "../../../adapters/codex/user-assets.ts";
import { traeWorkDelivery, traeWorkSkillRoot } from "../../../adapters/traework/user-assets.ts";
import { UserAssetStore, readAssetFiles, type UserAssetDelivery, type UserAssetPreview, type UserAssetReceipt } from "../../core/src/user-assets.ts";
import type { PluginLibrary } from "./plugin-library.ts";

type Ide = "codex" | "traework";
export type InstalledUserAsset = UserAssetReceipt & { issues: string[]; recognition: "files-verified" | "host-verified"; recognitionNote?: string; runtimeVerified: false };
type Options = { userHome?: string; codexHome?: string; host?: CodexPluginHost; findCli?: typeof findCodexCli };
export class AssetOperations {
  private store: UserAssetStore;
  private userHome: string;
  private codexHome: string;
  private host?: CodexPluginHost;
  private pending?: { preview: UserAssetPreview; delivery: UserAssetDelivery; name: string; sourceFiles: Map<string, Buffer>; previous?: UserAssetReceipt };
  private running = false;
  constructor(private readonly library: PluginLibrary, private readonly stateRoot: string, private readonly options: Options = {}) {
    this.userHome = options.userHome ?? os.homedir();
    this.codexHome = options.codexHome ?? process.env.CODEX_HOME ?? path.join(this.userHome, ".codex");
    this.host = options.host;
    this.store = new UserAssetStore(path.join(stateRoot, "receipts"), {
      codex: [path.join(this.userHome, ".agents/skills"), path.join(stateRoot, "codex")], traework: [traeWorkSkillRoot(this.userHome)],
    });
  }
  private async serialized<T>(action: () => Promise<T>): Promise<T> {
    if (this.running) throw new Error("资产操作仍在进行，请稍后重试");
    this.running = true; try { return await action(); } finally { this.running = false; }
  }
  private async codexHost(): Promise<CodexPluginHost> {
    if (this.host) return this.host;
    const binary = await (this.options.findCli ?? findCodexCli)();
    if (!binary) throw new Error("未找到支持插件安装的 Codex CLI；请安装或更新 Codex 后重试");
    this.host = new CodexPluginHost(codexRunner(binary, this.codexHome), this.codexHome); return this.host;
  }
  async list(): Promise<InstalledUserAsset[]> {
    const result: InstalledUserAsset[] = [];
    const records = await this.store.list();
    let discovered: Awaited<ReturnType<typeof discoverCodexSkills>> | undefined;
    if (records.some((item) => item.kind === "skill" && item.target.ideId === "codex")) {
      const binary = await (this.options.findCli ?? findCodexCli)();
      if (binary) { try { discovered = await discoverCodexSkills(binary, this.userHome, this.codexHome); } catch { /* File verification remains available when the host cannot be queried. */ } }
    }
    for (const receipt of records) {
      const issues: string[] = [];
      try {
        issues.push(...await this.store.validate(receipt));
        if (receipt.target.ideId === "codex" && receipt.kind === "capability-plugin") issues.push(...await (await this.codexHost()).validate(receipt.id.replace(/^plugin-/, ""), receipt));
      } catch (error) { issues.push(error instanceof Error ? error.message : String(error)); }
      const skill = discovered?.find((item) => item.scope === "user" && item.path === path.join(receipt.destination, "SKILL.md"));
      result.push({ ...receipt, issues, recognition: receipt.host || skill?.enabled ? "host-verified" : "files-verified",
        recognitionNote: skill && !skill.enabled ? "Skill 已被 Codex 全局停用；安装文件仍保留。" : undefined, runtimeVerified: false });
    }
    return result;
  }
  async preview(action: UserAssetPreview["action"], key: string, ide: Ide, installedId?: string): Promise<UserAssetPreview> {
    return this.serialized(async () => {
      this.pending = undefined;
      if (!["install", "update", "uninstall"].includes(action) || !["codex", "traework"].includes(ide)) throw new Error("资产操作或目标软件无效");
      const previous = (await this.store.list()).find((item) => item.id === installedId && item.target.ideId === ide);
      if (action !== "install" && !previous) throw new Error("请从已安装列表选择内容");
      let delivery: UserAssetDelivery, name: string, sourceFiles: Map<string, Buffer>;
      if (action === "uninstall") {
        delivery = { manifest: { schemaVersion: 1, id: previous!.id, kind: previous!.kind, version: previous!.version, title: previous!.title,
          supportedIdes: [ide], dependencies: [], requiredTools: [], ruleCategories: [] }, destination: previous!.destination,
          sourceKey: previous!.sourceKey, sourceDigest: previous!.sourceDigest, files: new Map() };
        name = previous!.id.replace(/^plugin-/, "").replace(/^skill-/, ""); sourceFiles = new Map();
      } else {
        const snapshot = await this.library.snapshot(key); const source = snapshot.receipt;
        name = source.name; sourceFiles = snapshot.files;
        let files = new Map(sourceFiles), kind = source.kind, destination: string;
        if (ide === "traework") {
          const adapted = traeWorkDelivery(source, files); name = adapted.name; files = adapted.files; kind = "skill";
          if (source.kind === "capability-plugin") files.set("provenance.json", Buffer.from(`${JSON.stringify({ ...source,
            adapter: "traework-product-design-v1", deliveryKind: "skill", runtime: "local", verification: "files-installed-not-runtime-verified" }, null, 2)}\n`));
          destination = path.join(traeWorkSkillRoot(this.userHome), name);
        } else if (source.kind === "skill") {
          destination = path.join(this.userHome, ".agents/skills", name);
          // Older Codex user locations must not create a duplicate standalone skill.
          if ((await readAssetFiles(path.join(this.codexHome, "skills", name))).size) throw new Error("旧 Codex 用户技能目录已有同名内容，请先处理，未覆盖");
        } else {
          const host = await this.codexHost();
          const state = await host.inspect(name);
          if (!previous && (state.installed || state.source || state.cached)) throw new Error("Codex 已有同名工具箱插件、市场或缓存，拒绝接管未知安装");
          if (previous && state.installed && !state.enabled) throw new Error("此插件已在 Codex 中停用，请在软件中处理后再更新");
          destination = path.join(this.stateRoot, "codex", name);
          const catalog = { name: `agentrulekit-${name}`, plugins: [{ name, source: { source: "local", path: `./plugins/${name}` },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Productivity" }] };
          files = new Map([...sourceFiles].map(([file, data]) => [`plugins/${name}/${file}`, data]));
          files.set(".agents/plugins/marketplace.json", Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`));
        }
        const id = `${kind === "skill" ? "skill" : "plugin"}-${name}`;
        if (previous && previous.id !== id) throw new Error("更新来源的名称或类型与已安装内容不一致");
        delivery = { manifest: { schemaVersion: 1, id, kind, version: source.version, title: source.title,
          supportedIdes: [ide], dependencies: [], requiredTools: [], ruleCategories: [] }, destination, sourceKey: key, sourceDigest: source.sourceDigest, files };
      }
      const preview = await this.store.preview(action, ide, delivery);
      if (previous?.host) preview.conflicts.push(...await (await this.codexHost()).validate(name, previous));
      this.pending = { preview, delivery, name, sourceFiles, previous };
      return preview;
    });
  }
  async apply(token: string): Promise<InstalledUserAsset[]> {
    return this.serialized(async () => {
      const pending = this.pending;
      if (!pending || token !== pending.preview.token) throw new Error("预览已失效，请重新预览");
      const { preview, delivery, name, previous, sourceFiles } = pending;
      if (preview.action !== "uninstall" && (await this.library.snapshot(delivery.sourceKey)).receipt.sourceDigest !== delivery.sourceDigest) throw new Error("来源在预览后发生变化");
      const isPlugin = preview.ideId === "codex" && delivery.manifest.kind === "capability-plugin";
      const host = isPlugin ? await this.codexHost() : undefined;
      if (host && !previous) {
        const state = await host.inspect(name);
        if (state.installed || state.source || state.cached) throw new Error("Codex 安装状态在预览后发生变化，请重新预览");
      }
      if (previous?.host && (await host!.validate(name, previous)).length) throw new Error("Codex 安装状态在预览后发生变化，请重新预览");
      if (host && previous && preview.action === "update" && !(await host.inspect(name)).enabled) throw new Error("Codex 插件在预览后被停用，请重新预览");
      await this.store.apply(token, host ? async (next) => {
        if (next) return host.install(name, next.destination, sourceFiles);
        await host.remove(name);
      } : undefined, host ? async (old) => {
        if (!old) { try { await host.remove(name); } catch { /* Preserve the original failure. */ } }
        else {
          const restored = await readAssetFiles(path.join(old.destination, "plugins", name));
          await host.install(name, old.destination, restored);
        }
      } : undefined);
      this.pending = undefined; return this.list();
    });
  }
}
