import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";

import { AGENTS_MD_TARGETS, codexAdapter } from "../../../adapters/codex/src/index.ts";
import {
  applyUninstall,
  applyProject,
  assertReleaseAssetUnchanged,
  assertReleaseNotOlder,
  downloadRulepacks,
  findLatestRelease,
  initializeGithubProject,
  loadProjectConfig,
  loadProjectLock,
  listRetainedRulePaths,
  planProject,
  planUninstall,
  validateProject,
} from "../../../packages/core/src/index.ts";
import type { ProjectChange, ProjectConfig, ProjectPlan, ReleaseInfo, SourceSnapshot, UninstallPlan, ValidationIssue } from "../../../packages/core/src/index.ts";

export const REPOSITORY = "yadan177/AgentRuleKit";
export const STACK_PACKS = {
  unity: ["common", "unity", "project-docs/unity"],
  "js-ts": ["common", "javascript", "typescript", "project-docs/js-ts"],
  java: ["common", "java", "project-docs/java"],
  go: ["common", "go", "project-docs/go"],
  python: ["common", "python", "project-docs/python"],
} as const;
export type StackChoice = keyof typeof STACK_PACKS;
export type PlatformChoice = (typeof AGENTS_MD_TARGETS)[number];

type LoadedSource = { snapshot: SourceSnapshot; cleanup: () => Promise<void> };
type SourceLoader = (release?: ReleaseInfo) => Promise<LoadedSource>;
type ReleaseLoader = (repository: string) => Promise<ReleaseInfo>;

async function loadLatestSource(release?: ReleaseInfo): Promise<LoadedSource> {
  release ??= await findLatestRelease(REPOSITORY);
  const downloaded = await downloadRulepacks(release);
  return {
    snapshot: {
      root: downloaded.sourceRoot,
      version: downloaded.version,
      digest: release.digest,
      commit: downloaded.sourceCommit,
    },
    cleanup: downloaded.cleanup,
  };
}

async function isPresent(file: string): Promise<boolean> {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function checkedRoot(root: string): Promise<string> {
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("请选择项目文件夹");
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("项目路径必须是普通文件夹");
  return realpath(root);
}

function checkedTargets(targets: PlatformChoice[]): PlatformChoice[] {
  if (!Array.isArray(targets) || targets.length === 0 || new Set(targets).size !== targets.length ||
    targets.some((target) => !AGENTS_MD_TARGETS.includes(target))) throw new Error("请选择至少一个受支持的平台");
  return AGENTS_MD_TARGETS.filter((target) => targets.includes(target));
}

function configFor(stack: StackChoice, targets: PlatformChoice[]): ProjectConfig {
  if (!Object.hasOwn(STACK_PACKS, stack)) throw new Error("技术栈选项无效");
  return {
    schemaVersion: 1,
    source: { type: "github", repository: REPOSITORY },
    rulepacks: [...STACK_PACKS[stack]],
    targets: checkedTargets(targets),
    project: { overrides: ".agent-rules/overrides.md" },
    updates: { channel: "stable", strategy: "manual" },
  };
}

export interface ProjectStatus {
  root: string;
  installed: boolean;
  valid: boolean;
  rulepacks: string[];
  targets: string[];
  version?: string;
  issues: ValidationIssue[];
}

export async function inspectProjectRoot(root: string): Promise<ProjectStatus> {
  const resolved = await checkedRoot(root);
  if (!(await isPresent(path.join(resolved, "agent-rules.yaml")))) {
    return { root: resolved, installed: false, valid: false, rulepacks: [], targets: [], issues: [] };
  }
  const validation = await validateProject(resolved, codexAdapter);
  let rulepacks: string[] = [];
  let targets: string[] = [];
  let version: string | undefined;
  try { const config = await loadProjectConfig(resolved); rulepacks = config.rulepacks; targets = config.targets; }
  catch (error) { validation.issues.push({ code: "invalid-config", message: String(error) }); }
  try { version = (await loadProjectLock(resolved)).sourceVersion; }
  catch { /* validateProject reports invalid lock */ }
  return { root: resolved, installed: true, valid: validation.valid && !validation.issues.length, rulepacks, targets, version, issues: validation.issues };
}

export interface UpdateCheck {
  root: string;
  currentVersion: string;
  latestVersion: string;
  available: boolean;
  targetsChanged: boolean;
}

export interface Preview {
  kind: "install" | "update" | "uninstall";
  root: string;
  changes: ProjectChange[];
  retainedPaths: string[];
  conflicts: ValidationIssue[];
  version?: string;
  targets: string[];
}

type Pending =
  | { kind: "install"; root: string; stack: StackChoice; targets: PlatformChoice[]; plan: ProjectPlan; source: LoadedSource }
  | { kind: "update"; root: string; plan: ProjectPlan; config: ProjectConfig; configContent: string; nextConfigContent?: string; source: LoadedSource; release: ReleaseInfo }
  | { kind: "uninstall"; root: string; plan: UninstallPlan };

export class DesktopOperations {
  private pending: Pending | undefined;
  private checked: { root: string; repository: string; release: ReleaseInfo; targets: PlatformChoice[] } | undefined;
  private busy = false;

  constructor(private readonly sourceLoader: SourceLoader = loadLatestSource, private readonly releaseLoader: ReleaseLoader = findLatestRelease) {}

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error("已有操作正在进行，请稍候");
    this.busy = true;
    try { return await operation(); }
    finally { this.busy = false; }
  }

  private async discardPending(): Promise<void> {
    if (this.pending?.kind === "install" || this.pending?.kind === "update") await this.pending.source.cleanup();
    this.pending = undefined;
  }

  async clearPreview(): Promise<void> {
    return this.exclusive(() => this.discardPending());
  }

  async inspect(root: string): Promise<ProjectStatus> {
    return this.exclusive(async () => {
      await this.discardPending();
      this.checked = undefined;
      return inspectProjectRoot(root);
    });
  }

  async previewInstall(root: string, stack: StackChoice, targets: PlatformChoice[] = ["codex"]): Promise<Preview> {
    return this.exclusive(async () => {
      await this.discardPending();
      const resolved = await checkedRoot(root);
      if (await isPresent(path.join(resolved, "agent-rules.yaml"))) throw new Error("项目已经安装规则；请先卸载或使用 CLI 更新");
      if (await isPresent(path.join(resolved, ".agent-rules.lock.json"))) throw new Error("项目存在孤立的规则锁文件；请先检查或恢复原配置，不会覆盖它");
      const config = configFor(stack, targets);
      const source = await this.sourceLoader();
      try {
        const plan = await planProject(resolved, config, codexAdapter, source.snapshot);
        const changes: ProjectChange[] = [
          { path: "agent-rules.yaml", action: "add", after: stringify(config) },
          ...plan.changes,
        ];
        if (plan.conflicts.length) {
          await source.cleanup();
        } else {
          this.pending = { kind: "install", root: resolved, stack, targets: config.targets as PlatformChoice[], plan, source };
        }
        return { kind: "install", root: resolved, changes, retainedPaths: [], conflicts: plan.conflicts, version: source.snapshot.version, targets: config.targets };
      } catch (error) {
        await source.cleanup();
        throw error;
      }
    });
  }

  async applyInstall(root: string): Promise<ProjectStatus> {
    return this.exclusive(async () => {
      const resolved = await checkedRoot(root);
      const pending = this.pending;
      if (!pending || pending.kind !== "install" || pending.root !== resolved) throw new Error("安装预览已失效，请重新预览");
      this.pending = undefined;
      try {
        await initializeGithubProject(resolved, codexAdapter, pending.source.snapshot, REPOSITORY, [...STACK_PACKS[pending.stack]], pending.plan, pending.targets);
        const validation = await validateProject(resolved, codexAdapter);
        return { root: resolved, installed: true, valid: validation.valid, rulepacks: [...STACK_PACKS[pending.stack]], targets: pending.targets, version: pending.source.snapshot.version, issues: validation.issues };
      } finally {
        await pending.source.cleanup();
      }
    });
  }

  private async updateProject(root: string): Promise<{ config: ProjectConfig; currentVersion: string }> {
    if (!(await isPresent(path.join(root, "agent-rules.yaml")))) throw new Error("该项目尚未安装规则");
    const validation = await validateProject(root, codexAdapter);
    if (!validation.valid) throw new Error(`项目规则校验未通过：${validation.issues.map((issue) => issue.message).join("；")}`);
    const config = await loadProjectConfig(root);
    if (config.source.type !== "github" || !config.source.repository || config.updates.channel !== "stable") {
      throw new Error("桌面版更新目前仅支持 GitHub stable 规则源");
    }
    const lock = await loadProjectLock(root);
    if (!lock.sourceVersion) throw new Error("项目锁文件缺少当前规则版本");
    return { config, currentVersion: lock.sourceVersion };
  }

  async checkUpdate(root: string, targets?: PlatformChoice[]): Promise<UpdateCheck> {
    return this.exclusive(async () => {
      await this.discardPending();
      this.checked = undefined;
      const resolved = await checkedRoot(root);
      const { config, currentVersion } = await this.updateProject(resolved);
      const requested = checkedTargets(targets ?? config.targets as PlatformChoice[]);
      const release = await this.releaseLoader(config.source.repository!);
      const lock = await loadProjectLock(resolved);
      assertReleaseAssetUnchanged(lock, release);
      assertReleaseNotOlder(lock, release);
      const targetsChanged = requested.join("\0") !== config.targets.join("\0");
      const available = lock.sourceVersion !== release.version || lock.sourceDigest !== release.digest || targetsChanged;
      if (available) this.checked = { root: resolved, repository: config.source.repository!, release, targets: requested };
      return { root: resolved, currentVersion, latestVersion: release.version, available, targetsChanged };
    });
  }

  async previewUpdate(root: string): Promise<Preview> {
    return this.exclusive(async () => {
      await this.discardPending();
      const resolved = await checkedRoot(root);
      const checked = this.checked;
      if (!checked || checked.root !== resolved) throw new Error("请先检查更新");
      const { config } = await this.updateProject(resolved);
      if (config.source.repository !== checked.repository) {
        throw new Error("项目规则源在检查更新后发生变化，请重新检查");
      }
      const lock = await loadProjectLock(resolved);
      assertReleaseAssetUnchanged(lock, checked.release);
      assertReleaseNotOlder(lock, checked.release);
      const source = await this.sourceLoader(checked.release);
      try {
        if (source.snapshot.version !== checked.release.version || source.snapshot.digest !== checked.release.digest) {
          throw new Error("下载的规则包与检查到的版本不一致");
        }
        const configContent = await readFile(path.join(resolved, "agent-rules.yaml"), "utf8");
        const targetsChanged = checked.targets.join("\0") !== config.targets.join("\0");
        const nextConfig = targetsChanged ? { ...config, targets: checked.targets } : config;
        const nextConfigContent = targetsChanged ? stringify(nextConfig) : undefined;
        const plan = await planProject(resolved, nextConfig, codexAdapter, source.snapshot);
        const changes = nextConfigContent ? [{ path: "agent-rules.yaml", action: "modify" as const, before: configContent, after: nextConfigContent }, ...plan.changes] : plan.changes;
        const retainedPaths = await listRetainedRulePaths(resolved, lock.managedFiles);
        if (!plan.conflicts.length && changes.length) {
          this.pending = { kind: "update", root: resolved, config: nextConfig, configContent, nextConfigContent, plan, source, release: checked.release };
        } else {
          await source.cleanup();
        }
        return { kind: "update", root: resolved, changes, retainedPaths, conflicts: plan.conflicts, version: checked.release.version, targets: nextConfig.targets };
      } catch (error) {
        await source.cleanup();
        throw error;
      }
    });
  }

  async applyUpdate(root: string): Promise<ProjectStatus> {
    return this.exclusive(async () => {
      const resolved = await checkedRoot(root);
      const pending = this.pending;
      if (!pending || pending.kind !== "update" || pending.root !== resolved) throw new Error("更新预览已失效，请重新查看变更");
      this.pending = undefined;
      this.checked = undefined;
      try {
        if (await readFile(path.join(resolved, "agent-rules.yaml"), "utf8") !== pending.configContent) {
          throw new Error("项目配置在预览后发生变化；请重新查看变更");
        }
        await this.updateProject(resolved);
        const latest = await this.releaseLoader(pending.config.source.repository!);
        if (latest.version !== pending.release.version || latest.digest !== pending.release.digest) throw new Error("发布版本在预览后发生变化，请重新检查更新");
        await applyProject(resolved, pending.config, codexAdapter, pending.nextConfigContent, pending.source.snapshot, pending.plan, pending.configContent);
        const validation = await validateProject(resolved, codexAdapter);
        return { root: resolved, installed: true, valid: validation.valid, rulepacks: pending.config.rulepacks, targets: pending.config.targets, version: pending.source.snapshot.version, issues: validation.issues };
      } finally {
        await pending.source.cleanup();
      }
    });
  }

  async previewUninstall(root: string): Promise<Preview> {
    return this.exclusive(async () => {
      await this.discardPending();
      const resolved = await checkedRoot(root);
      const plan = await planUninstall(resolved, codexAdapter);
      if (!plan.conflicts.length) this.pending = { kind: "uninstall", root: resolved, plan };
      return { kind: "uninstall", root: resolved, changes: plan.changes, retainedPaths: plan.retainedPaths, conflicts: plan.conflicts, targets: (await loadProjectConfig(resolved)).targets };
    });
  }

  async applyUninstall(root: string): Promise<ProjectStatus> {
    return this.exclusive(async () => {
      const resolved = await checkedRoot(root);
      const pending = this.pending;
      if (!pending || pending.kind !== "uninstall" || pending.root !== resolved) throw new Error("卸载预览已失效，请重新预览");
      this.pending = undefined;
      await applyUninstall(resolved, codexAdapter, pending.plan);
      return { root: resolved, installed: false, valid: false, rulepacks: [], targets: [], issues: [] };
    });
  }
}
