import { createHash } from "node:crypto";
import {
  access,
  cp,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { parse, stringify } from "yaml";

import { assertTargetAdapter, extractManagedBlock, mergeManagedBlock } from "./adapter.js";
import type { TargetAdapter } from "./adapter.js";
import { detectProject } from "./detect.js";
import { assertReleaseNotOlder } from "./release.js";
import type {
  ProjectConfig,
  ProjectChange,
  ProjectLock,
  ProjectPlan,
  RulePackManifest,
  StackId,
  ValidationIssue,
  ValidationResult,
} from "./types.js";

const TOOLKIT_VERSION = "0.1.0";
const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9/-]*$/;
const PACK_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const TRANSACTION_PREFIX = ".agent-rules.transaction-";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function assertKnownFields(value: Record<string, unknown>, allowed: readonly string[], section: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${section} 包含当前版本不支持的字段：${unknown.join(", ")}`);
}

export function parseProjectLock(content: string): ProjectLock {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("锁文件不是合法 JSON");
  }
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.toolkitVersion !== "string" || !VERSION_PATTERN.test(value.toolkitVersion) ||
    !["workspace", "github"].includes(String(value.sourceType)) || typeof value.source !== "string" || !value.source ||
    !isStringMap(value.rulepacks) || !isStringMap(value.targets) || !isStringMap(value.managedFiles) ||
    Object.keys(value.rulepacks).length === 0 || Object.keys(value.targets).length !== 1 || Object.keys(value.managedFiles).length > 5000 ||
    typeof value.managedBlockDigest !== "string" || !DIGEST_PATTERN.test(value.managedBlockDigest)) {
    throw new Error("锁文件缺少必需字段或字段类型不合法");
  }
  const allowed = new Set(["$schema", "schemaVersion", "toolkitVersion", "sourceType", "source", "sourceVersion", "sourceDigest", "sourceCommit", "rulepacks", "targets", "managedFiles", "managedBlockDigest"]);
  if (Object.keys(value).some((key) => !allowed.has(key)) ||
    Object.values(value.rulepacks).some((version) => !VERSION_PATTERN.test(version)) ||
    Object.values(value.targets).some((version) => !VERSION_PATTERN.test(version)) ||
    Object.values(value.managedFiles).some((hash) => !DIGEST_PATTERN.test(hash)) ||
    (value.sourceVersion !== undefined && (typeof value.sourceVersion !== "string" || !VERSION_PATTERN.test(value.sourceVersion))) ||
    (value.sourceDigest !== undefined && (typeof value.sourceDigest !== "string" || !DIGEST_PATTERN.test(value.sourceDigest))) ||
    (value.sourceCommit !== undefined && (typeof value.sourceCommit !== "string" || !COMMIT_PATTERN.test(value.sourceCommit)))) {
    throw new Error("锁文件包含未知字段、非法版本或无效摘要");
  }
  return value as unknown as ProjectLock;
}

export async function loadProjectLock(root: string): Promise<ProjectLock> {
  return parseProjectLock(await readFile(path.join(root, ".agent-rules.lock.json"), "utf8"));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function digest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function toPortablePath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep);
}

function isManagedPath(relativePath: string): boolean {
  if (!relativePath.startsWith(".agent-rules/") || relativePath.includes("\\")) return false;
  const segments = relativePath.split("/");
  return segments.length > 1 && segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isPackRulePath(relativePath: unknown): relativePath is string {
  return typeof relativePath === "string" && relativePath.endsWith(".md") && !/[\\:\0]/.test(relativePath) &&
    !path.posix.isAbsolute(relativePath) && relativePath.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function resolveInside(base: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`规则包路径不能是绝对路径：${relativePath}`);
  }
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(resolvedBase, relativePath);
  if (resolved !== resolvedBase && !resolved.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new Error(`规则包路径越出目标目录：${relativePath}`);
  }
  return resolved;
}

function documentationPack(stack: StackId): string | undefined {
  switch (stack) {
    case "python":
    case "go":
    case "java":
    case "unity":
      return `project-docs/${stack}`;
    case "javascript":
    case "typescript":
      return "project-docs/js-ts";
  }
}

async function loadRulePack(
  sourceRoot: string,
  id: string,
): Promise<{ directory: string; manifest: RulePackManifest }> {
  if (!PACK_ID_PATTERN.test(id) || id.includes("//") || id.endsWith("/")) {
    throw new Error(`非法规则包 ID：${id}`);
  }
  const directory = resolveInside(path.join(sourceRoot, "rulepacks"), id);
  const manifestPath = path.join(directory, "pack.json");
  if (await hasSymlinkAncestor(sourceRoot, path.posix.join("rulepacks", id, "pack.json"))) {
    throw new Error(`规则包 ${id} 的清单路径包含符号链接`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new Error(`规则包 ${id} 的 manifest 缺失或不是合法 JSON`);
  }
  if (!isRecord(parsed)) throw new Error(`规则包 ${id} 的 manifest 必须是对象`);
  assertKnownFields(parsed, ["$schema", "id", "version", "status", "kind", "entry", "dependencies", "rules"], `规则包 ${id}`);
  if (parsed.id !== id) throw new Error(`规则包 ${id} 的 manifest ID 不匹配：${String(parsed.id)}`);
  if ((parsed.$schema !== undefined && typeof parsed.$schema !== "string") ||
    typeof parsed.version !== "string" || !PACK_VERSION_PATTERN.test(parsed.version) ||
    !["common", "development", "documentation"].includes(String(parsed.kind)) ||
    !Array.isArray(parsed.dependencies) || parsed.dependencies.some((dependency) => typeof dependency !== "string" || !PACK_ID_PATTERN.test(dependency) || dependency.includes("//") || dependency.endsWith("/")) ||
    new Set(parsed.dependencies).size !== parsed.dependencies.length ||
    !Array.isArray(parsed.rules) || parsed.rules.length === 0 || parsed.rules.some((rule) => !isPackRulePath(rule)) ||
    new Set(parsed.rules).size !== parsed.rules.length || !isPackRulePath(parsed.entry) || !parsed.rules.includes(parsed.entry)) {
    throw new Error(`规则包 ${id} 的 manifest 字段、入口或文件路径不合法`);
  }
  if (parsed.status !== "ready") {
    throw new Error(`规则包 ${id} 尚未准备完成`);
  }
  const manifest = parsed as unknown as RulePackManifest;
  for (const rule of manifest.rules) {
    if (await hasSymlinkAncestor(sourceRoot, path.posix.join("rulepacks", id, rule))) {
      throw new Error(`规则包 ${id} 的规则路径包含符号链接：${rule}`);
    }
    if (!(await lstat(resolveInside(directory, rule))).isFile()) {
      throw new Error(`规则包 ${id} 的规则不是普通文件：${rule}`);
    }
  }
  return { directory, manifest };
}

async function resolveRulePacks(
  sourceRoot: string,
  requested: string[],
): Promise<Array<{ directory: string; manifest: RulePackManifest }>> {
  const resolved = new Map<string, { directory: string; manifest: RulePackManifest }>();
  const visiting = new Set<string>();

  const visit = async (id: string): Promise<void> => {
    if (resolved.has(id)) return;
    if (visiting.has(id)) throw new Error(`规则包依赖存在循环：${id}`);
    visiting.add(id);
    const pack = await loadRulePack(sourceRoot, id);
    for (const dependency of pack.manifest.dependencies ?? []) {
      await visit(dependency);
    }
    visiting.delete(id);
    resolved.set(id, pack);
  };

  for (const id of requested) await visit(id);
  return [...resolved.values()];
}

function resolveSourceRoot(root: string, config: ProjectConfig): string {
  if (config.source.type !== "workspace" || !config.source.path) {
    throw new Error("当前版本只支持 workspace 规则源");
  }
  return path.resolve(root, config.source.path);
}

export async function createDefaultConfig(
  root: string,
  adapter: TargetAdapter,
  sourceRoot: string = root,
): Promise<ProjectConfig> {
  assertTargetAdapter(adapter);
  const detection = await detectProject(root);
  const rulepacks = [
    "common",
    ...detection.stacks.flatMap((stack) => {
      const documentation = documentationPack(stack.id);
      return documentation ? [stack.id, documentation] : [stack.id];
    }),
  ];
  const relativeSource = path.relative(path.resolve(root), path.resolve(sourceRoot)) || ".";

  return {
    schemaVersion: 1,
    source: {
      type: "workspace",
      path: toPortablePath(relativeSource),
    },
    rulepacks: [...new Set(rulepacks)],
    targets: [adapter.id],
    project: {
      overrides: ".agent-rules/overrides.md",
    },
    updates: {
      channel: "stable",
      strategy: "manual",
    },
  };
}

export async function loadProjectConfig(root: string): Promise<ProjectConfig> {
  const configPath = path.join(root, "agent-rules.yaml");
  const config: unknown = parse(await readFile(configPath, "utf8"));
  if (!isRecord(config) || config.schemaVersion !== 1) {
    throw new Error(`不支持的 AgentRuleKit schema 版本：${isRecord(config) ? String(config.schemaVersion) : "缺失"}`);
  }
  assertSupportedConfig(config as unknown as ProjectConfig);
  return config as unknown as ProjectConfig;
}

function assertSupportedConfig(config: ProjectConfig, adapter?: TargetAdapter): void {
  if (!isRecord(config)) throw new Error("项目配置必须是对象");
  assertKnownFields(config, ["$schema", "schemaVersion", "source", "rulepacks", "targets", "project", "updates"], "项目配置");
  if (config.schemaVersion !== 1 || (config.$schema !== undefined && typeof config.$schema !== "string")) {
    throw new Error("项目配置的 schema 版本或声明不合法");
  }
  if (!isRecord(config.updates)) throw new Error("项目配置缺少更新策略");
  assertKnownFields(config.updates, ["channel", "strategy"], "updates");
  if (config.updates.channel !== "stable" || config.updates.strategy !== "manual") {
    throw new Error("当前版本仅支持 stable 通道与人工批准更新；不会静默忽略其他策略");
  }
  if (!Array.isArray(config.targets) || config.targets.length !== 1 || typeof config.targets[0] !== "string" || !config.targets[0]) {
    throw new Error("当前版本仅支持一个目标工具");
  }
  if (adapter && config.targets[0] !== adapter.id) {
    throw new Error(`项目配置的目标工具不是 ${adapter.id}`);
  }
  if (!Array.isArray(config.rulepacks) || config.rulepacks.length === 0 || config.rulepacks.some((id) => typeof id !== "string" || !PACK_ID_PATTERN.test(id) || id.includes("//") || id.endsWith("/")) ||
    new Set(config.rulepacks).size !== config.rulepacks.length || !isRecord(config.project) || typeof config.project.overrides !== "string" || !isManagedPath(config.project.overrides) || !config.project.overrides.endsWith(".md")) {
    throw new Error("项目配置缺少规则包或项目覆盖规则路径");
  }
  assertKnownFields(config.project, ["overrides"], "project");
  if (!isRecord(config.source) || !["workspace", "github"].includes(String(config.source.type))) {
    throw new Error("项目配置缺少有效的规则源");
  }
  if (config.source.type === "workspace") {
    assertKnownFields(config.source, ["type", "path"], "source");
    if (typeof config.source.path !== "string" || !config.source.path) throw new Error("workspace 规则源缺少 path");
  } else {
    assertKnownFields(config.source, ["type", "repository"], "source");
    if (typeof config.source.repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.source.repository)) {
      throw new Error("GitHub 规则源缺少有效的 owner/repository");
    }
  }
}

interface PreparedProject {
  plan: ProjectPlan;
  files: Map<string, string>;
  entryContent: string;
  lock: ProjectLock;
  oldLock?: ProjectLock;
}

export interface SourceSnapshot {
  root: string;
  version: string;
  digest: string;
  commit: string;
}

async function hasSymlinkAncestor(base: string, relativePath: string): Promise<boolean> {
  let current = path.resolve(base);
  for (const segment of relativePath.split(/[\\/]/)) {
    current = path.join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return false;
}

async function inspectLockedManagedFiles(root: string, lock: ProjectLock): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const expected = new Set<string>();
  for (const [id, version] of Object.entries(lock.rulepacks ?? {})) {
    if (!PACK_ID_PATTERN.test(id) || id.includes("//") || id.endsWith("/")) {
      issues.push({ code: "invalid-locked-pack", message: `锁文件包含非法规则包 ID：${id}` });
      continue;
    }
    const manifestPath = path.posix.join(".agent-rules", id, "pack.json");
    expected.add(manifestPath);
    if (await hasSymlinkAncestor(root, manifestPath)) {
      issues.push({ code: "symlink-path", message: `已安装规则清单包含符号链接：${manifestPath}` });
      continue;
    }
    let manifest: RulePackManifest;
    try {
      manifest = JSON.parse(await readFile(path.join(root, manifestPath), "utf8")) as RulePackManifest;
    } catch {
      issues.push({ code: "invalid-installed-pack", message: `已安装规则清单缺失或无法解析：${manifestPath}` });
      continue;
    }
    if (manifest.id !== id || manifest.version !== version || !Array.isArray(manifest.rules) || typeof manifest.entry !== "string" || !manifest.rules.includes(manifest.entry)) {
      issues.push({ code: "invalid-installed-pack", message: `已安装规则清单与锁文件不一致：${manifestPath}` });
      continue;
    }
    for (const rule of manifest.rules) {
      if (!isPackRulePath(rule)) {
        issues.push({ code: "invalid-installed-pack", message: `已安装规则清单包含不安全路径：${id}/${String(rule)}` });
        continue;
      }
      expected.add(path.posix.join(".agent-rules", id, rule));
    }
  }
  for (const relativePath of Object.keys(lock.managedFiles ?? {})) {
    if (!expected.has(relativePath)) issues.push({ code: "unexpected-managed-file", message: `锁文件试图接管非规则包文件：${relativePath}` });
  }
  for (const relativePath of expected) {
    if (!Object.hasOwn(lock.managedFiles ?? {}, relativePath)) issues.push({ code: "missing-managed-lock", message: `锁文件缺少已安装规则文件：${relativePath}` });
  }
  return issues;
}

async function prepareProject(root: string, config: ProjectConfig, adapter: TargetAdapter, snapshot?: SourceSnapshot): Promise<PreparedProject> {
  assertTargetAdapter(adapter);
  assertSupportedConfig(config, adapter);
  const resolvedRoot = path.resolve(root);
  if ((await listInterruptedTransactions(resolvedRoot)).length) {
    throw new Error("检测到未完成的规则更新事务；请先运行 agent-rule recover <project-directory> 查看并恢复");
  }
  if (config.source.type === "github" && (!snapshot || !path.isAbsolute(snapshot.root) || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(snapshot.version) || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(snapshot.commit) || !/^sha256:[a-f0-9]{64}$/.test(snapshot.digest))) {
    throw new Error("GitHub 规则源缺少经过校验的版本、摘要或来源提交");
  }
  const sourceRoot = snapshot?.root ?? resolveSourceRoot(resolvedRoot, config);
  const packs = await resolveRulePacks(sourceRoot, config.rulepacks);
  if (snapshot) {
    for (const { manifest } of packs) {
      if (manifest.version !== snapshot.version) {
        throw new Error(`Release ${snapshot.version} 中的规则包 ${manifest.id} 版本是 ${manifest.version}；拒绝安装版本不一致的规则源`);
      }
    }
  }
  const rulesDirectory = path.join(resolvedRoot, ".agent-rules");
  const entryPath = path.join(resolvedRoot, adapter.entryFile);
  const lockPath = path.join(resolvedRoot, ".agent-rules.lock.json");
  const conflicts: ValidationIssue[] = [];
  const linkedControls = new Set<string>();
  for (const controlPath of [adapter.entryFile, ".agent-rules.lock.json", "agent-rules.yaml"]) {
    if (await hasSymlinkAncestor(resolvedRoot, controlPath)) {
      linkedControls.add(controlPath);
      conflicts.push({ code: "symlink-path", message: `控制文件是符号链接：${controlPath}` });
    }
  }
  const oldEntry = !linkedControls.has(adapter.entryFile) && (await exists(entryPath)) ? await readFile(entryPath, "utf8") : "";
  const oldLockContent = !linkedControls.has(".agent-rules.lock.json") && (await exists(lockPath)) ? await readFile(lockPath, "utf8") : undefined;
  const oldLock = oldLockContent ? parseProjectLock(oldLockContent) : undefined;
  if (oldLock && snapshot) assertReleaseNotOlder(oldLock, snapshot);
  const entries = Object.fromEntries(packs.map(({ manifest }) => [manifest.id, manifest.entry as string]));
  const block = adapter.renderManagedBlock(config, entries);
  if (!block.startsWith(adapter.blockStart) || !block.endsWith(adapter.blockEnd)) {
    throw new Error(`适配器 ${adapter.id} 生成的受控区块边界不合法`);
  }
  const entryContent = mergeManagedBlock(oldEntry, block, adapter);
  const files = new Map<string, string>();
  const managedFiles: Record<string, string> = {};
  if (oldLock) conflicts.push(...await inspectLockedManagedFiles(resolvedRoot, oldLock));
  if (!oldLock && oldEntry.includes(adapter.blockStart)) {
    conflicts.push({ code: "unknown-managed-block", message: `${adapter.entryFile} 已含受控区块，但缺少可验证的锁文件` });
  }

  for (const { directory, manifest } of packs) {
    const installedManifest = { ...manifest };
    delete installedManifest.$schema;
    const manifestPath = toPortablePath(path.join(".agent-rules", manifest.id, "pack.json"));
    files.set(manifestPath, `${JSON.stringify(installedManifest, null, 2)}\n`);
    for (const rule of manifest.rules) {
      const relativePath = toPortablePath(path.join(".agent-rules", manifest.id, rule));
      if (files.has(relativePath)) throw new Error(`规则包目标路径重复：${relativePath}`);
      files.set(relativePath, await readFile(resolveInside(directory, rule), "utf8"));
    }
  }
  for (const [relativePath, content] of files) managedFiles[relativePath] = digest(content);

  const lock: ProjectLock = {
    schemaVersion: 1,
    toolkitVersion: TOOLKIT_VERSION,
    sourceType: config.source.type,
    source: config.source.type === "workspace" ? config.source.path ?? "." : config.source.repository ?? "",
    ...(snapshot ? { sourceVersion: snapshot.version, sourceDigest: snapshot.digest, sourceCommit: snapshot.commit } : {}),
    rulepacks: Object.fromEntries(packs.map(({ manifest }) => [manifest.id, manifest.version])),
    targets: Object.fromEntries(config.targets.map((target) => [target, TOOLKIT_VERSION])),
    managedFiles,
    managedBlockDigest: digest(block),
  };
  const changes: ProjectChange[] = [];
  const candidates = new Set([...Object.keys(oldLock?.managedFiles ?? {}), ...files.keys()]);
  for (const relativePath of [...candidates].sort()) {
    if (!isManagedPath(relativePath)) {
      conflicts.push({ code: "unsafe-lock-path", message: `锁文件路径不在受管目录：${relativePath}` });
      continue;
    }
    const absolutePath = resolveInside(resolvedRoot, relativePath);
    if (await hasSymlinkAncestor(resolvedRoot, relativePath)) {
      conflicts.push({ code: "symlink-path", message: `受管路径包含符号链接：${relativePath}` });
      continue;
    }
    const before = (await exists(absolutePath)) ? await readFile(absolutePath, "utf8") : undefined;
    const after = files.get(relativePath);
    const recorded = oldLock?.managedFiles[relativePath];
    if (recorded && (before === undefined || digest(before) !== recorded)) {
      conflicts.push({ code: "managed-file-drift", message: `受管文件已发生漂移：${relativePath}` });
    }
    if (!recorded && before !== undefined && after !== undefined) {
      conflicts.push({ code: "unknown-file-collision", message: `拒绝接管已有文件：${relativePath}` });
    }
    if (before !== after) {
      changes.push({ path: relativePath, action: before === undefined ? "add" : after === undefined ? "remove" : "modify", before, after });
    }
  }
  if (oldLock?.managedBlockDigest) {
    const oldBlock = extractManagedBlock(oldEntry, adapter) ?? "";
    if (digest(oldBlock) !== oldLock.managedBlockDigest) {
      conflicts.push({ code: "managed-block-drift", message: `${adapter.entryFile} 受控区块已被手工修改` });
    }
  }
  if (oldEntry !== entryContent) changes.push({ path: adapter.entryFile, action: oldEntry ? "modify" : "add", before: oldEntry || undefined, after: entryContent });
  const newLockContent = `${JSON.stringify(lock, null, 2)}\n`;
  if (oldLockContent !== newLockContent) changes.push({ path: ".agent-rules.lock.json", action: oldLockContent ? "modify" : "add", before: oldLockContent, after: newLockContent });
  if (await hasSymlinkAncestor(resolvedRoot, ".agent-rules")) {
    conflicts.push({ code: "symlink-path", message: "受管目录 .agent-rules 是符号链接" });
  }
  const overrideRelative = toPortablePath(config.project.overrides);
  const overrideTarget = resolveInside(resolvedRoot, overrideRelative);
  const overlapsManagedFile = [...files.keys()].some((managedPath) =>
    managedPath === overrideRelative || managedPath.startsWith(`${overrideRelative}/`) || overrideRelative.startsWith(`${managedPath}/`));
  if (!overrideRelative.startsWith(".agent-rules/") || !overrideTarget.startsWith(`${rulesDirectory}${path.sep}`) || overlapsManagedFile) {
    conflicts.push({ code: "unsafe-overrides", message: `项目覆盖规则路径不安全：${overrideRelative}` });
  } else if (await hasSymlinkAncestor(resolvedRoot, overrideRelative)) {
    conflicts.push({ code: "symlink-path", message: `项目覆盖规则路径包含符号链接：${overrideRelative}` });
  }
  return { plan: { changes, conflicts, from: oldLock?.rulepacks ?? {}, to: lock.rulepacks }, files, entryContent, lock, oldLock };
}

export async function planProject(root: string, config: ProjectConfig, adapter: TargetAdapter, snapshot?: SourceSnapshot): Promise<ProjectPlan> {
  return (await prepareProject(root, config, adapter, snapshot)).plan;
}

export async function applyProject(root: string, config: ProjectConfig, adapter: TargetAdapter, configContent?: string, snapshot?: SourceSnapshot, expectedPlan?: ProjectPlan): Promise<ProjectLock> {
  const resolvedRoot = path.resolve(root);
  const prepared = await prepareProject(resolvedRoot, config, adapter, snapshot);
  if (prepared.plan.conflicts.length) {
    throw new Error(prepared.plan.conflicts.map((issue) => `[${issue.code}] ${issue.message}`).join("\n"));
  }
  if (expectedPlan && !isDeepStrictEqual(prepared.plan, expectedPlan)) {
    throw new Error("预览后规则源或项目文件发生变化；拒绝应用未经审查的差异，请重新运行 diff");
  }
  const rulesDirectory = path.join(resolvedRoot, ".agent-rules");
  const transaction = await mkdtemp(path.join(resolvedRoot, TRANSACTION_PREFIX));
  const staging = path.join(transaction, "staging");
  const backup = path.join(transaction, "backup");
  const entryPath = path.join(resolvedRoot, adapter.entryFile);
  const lockPath = path.join(resolvedRoot, ".agent-rules.lock.json");
  const configPath = path.join(resolvedRoot, "agent-rules.yaml");
  const snapshots = new Map<string, string | undefined>();
  let movedRules = false;
  let installedRules = false;
  let completed = false;
  try {
    if (await exists(rulesDirectory)) await cp(rulesDirectory, staging, { recursive: true });
    else await mkdir(staging);
    for (const relativePath of Object.keys(prepared.oldLock?.managedFiles ?? {})) {
      await rm(resolveInside(staging, relativePath.slice(".agent-rules/".length)), { force: true });
    }
    const overrides = resolveInside(staging, config.project.overrides.slice(".agent-rules/".length));
    await mkdir(path.dirname(overrides), { recursive: true });
    if (!(await exists(overrides))) {
      await writeFile(overrides, "# 项目覆盖规则\n\n在此添加项目特有规则。AgentRuleKit 更新时会保留本文件。\n", "utf8");
    }
    for (const [relativePath, content] of prepared.files) {
      const target = resolveInside(staging, relativePath.slice(".agent-rules/".length));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, "utf8");
    }
    for (const filePath of [entryPath, lockPath, ...(configContent === undefined ? [] : [configPath])]) {
      snapshots.set(filePath, (await exists(filePath)) ? await readFile(filePath, "utf8") : undefined);
    }
    await writeFile(path.join(transaction, "journal.json"), JSON.stringify({
      schemaVersion: 1,
      hadRules: await exists(rulesDirectory),
      snapshots: Object.fromEntries([...snapshots].map(([filePath, content]) => [path.basename(filePath), content ?? null])),
    }), "utf8");
    if (await exists(rulesDirectory)) {
      await rename(rulesDirectory, backup);
      movedRules = true;
    }
    await rename(staging, rulesDirectory);
    installedRules = true;
    await writeFile(entryPath, prepared.entryContent, "utf8");
    await writeFile(lockPath, `${JSON.stringify(prepared.lock, null, 2)}\n`, "utf8");
    if (configContent !== undefined) await writeFile(configPath, configContent, "utf8");
    completed = true;
    return prepared.lock;
  } catch (error) {
    try {
      for (const [filePath, content] of snapshots) {
        if (content === undefined) await rm(filePath, { force: true });
        else await writeFile(filePath, content, "utf8");
      }
      if (installedRules) await rm(rulesDirectory, { recursive: true, force: true });
      if (movedRules) await rename(backup, rulesDirectory);
      completed = true;
    } catch (rollbackError) {
      throw new Error(`应用失败且回滚未完成；恢复副本保留在 ${transaction}：${String(rollbackError)}`, { cause: error });
    }
    throw error;
  } finally {
    if (completed) await rm(transaction, { recursive: true, force: true });
  }
}

export async function listInterruptedTransactions(root: string): Promise<string[]> {
  const resolvedRoot = path.resolve(root);
  let entries;
  try {
    entries = await readdir(resolvedRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const pending: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith(TRANSACTION_PREFIX)) {
      const directory = path.join(resolvedRoot, entry.name);
      if (await exists(path.join(directory, "journal.json"))) pending.push(directory);
    }
  }
  return pending;
}

export async function recoverInterruptedProject(root: string, adapter: TargetAdapter): Promise<string | undefined> {
  assertTargetAdapter(adapter);
  const resolvedRoot = path.resolve(root);
  const pending = await listInterruptedTransactions(resolvedRoot);
  if (!pending.length) return undefined;
  if (pending.length > 1) throw new Error("发现多个未完成事务；请人工检查，不自动选择恢复对象");
  const transaction = pending[0]!;
  const journal = JSON.parse(await readFile(path.join(transaction, "journal.json"), "utf8")) as {
    schemaVersion: number;
    hadRules: boolean;
    snapshots: Record<string, string | null>;
  };
  if (journal.schemaVersion !== 1 || typeof journal.hadRules !== "boolean" || !journal.snapshots || typeof journal.snapshots !== "object") throw new Error("恢复记录格式不合法");
  for (const basename of Object.keys(journal.snapshots)) {
    if (![adapter.entryFile, ".agent-rules.lock.json", "agent-rules.yaml"].includes(basename)) {
      throw new Error(`恢复记录包含未知控制文件：${basename}`);
    }
    if (await hasSymlinkAncestor(resolvedRoot, basename)) throw new Error(`恢复目标包含符号链接：${basename}`);
  }
  const rulesDirectory = path.join(resolvedRoot, ".agent-rules");
  const backup = path.join(transaction, "backup");
  const incomplete = path.join(transaction, "incomplete");
  const hasBackup = await exists(backup);
  if (journal.hadRules && !hasBackup && !(await exists(rulesDirectory))) {
    throw new Error("原规则目录与备份都不存在；请人工恢复");
  }
  if (!journal.hadRules || hasBackup) {
    if (await exists(rulesDirectory)) await rename(rulesDirectory, incomplete);
    if (journal.hadRules) await rename(backup, rulesDirectory);
  }
  const savedControls = path.join(transaction, "incomplete-controls");
  await mkdir(savedControls);
  for (const [basename, previous] of Object.entries(journal.snapshots)) {
    const destination = path.join(resolvedRoot, basename);
    if (await exists(destination)) await cp(destination, path.join(savedControls, basename));
    if (previous === null) await rm(destination, { force: true });
    else await writeFile(destination, previous, "utf8");
  }
  const recovered = path.join(resolvedRoot, `.agent-rules.recovered-${path.basename(transaction).slice(TRANSACTION_PREFIX.length)}`);
  await rename(transaction, recovered);
  return recovered;
}

export async function initializeProject(
  root: string,
  adapter: TargetAdapter,
  sourceRoot: string = root,
): Promise<ProjectConfig> {
  const resolvedRoot = path.resolve(root);
  const configPath = path.join(resolvedRoot, "agent-rules.yaml");
  if (await exists(configPath)) {
    throw new Error("agent-rules.yaml 已存在；请运行 generate，不要再次运行 init");
  }

  const config = await createDefaultConfig(resolvedRoot, adapter, sourceRoot);
  await applyProject(resolvedRoot, config, adapter, stringify(config));
  return config;
}

export async function initializeGithubProject(
  root: string,
  adapter: TargetAdapter,
  snapshot: SourceSnapshot,
  repository: string,
): Promise<ProjectConfig> {
  const resolvedRoot = path.resolve(root);
  if (await exists(path.join(resolvedRoot, "agent-rules.yaml"))) {
    throw new Error("agent-rules.yaml 已存在；请使用 diff/update，不要再次运行 init");
  }
  const config = await createDefaultConfig(resolvedRoot, adapter, snapshot.root);
  config.source = { type: "github", repository };
  await applyProject(resolvedRoot, config, adapter, stringify(config), snapshot);
  return config;
}

export async function validateProject(root: string, adapter: TargetAdapter): Promise<ValidationResult> {
  assertTargetAdapter(adapter);
  const resolvedRoot = path.resolve(root);
  const issues: ValidationIssue[] = [];
  const interrupted = await listInterruptedTransactions(resolvedRoot);
  if (interrupted.length) {
    issues.push({ code: "interrupted-transaction", message: `检测到 ${interrupted.length} 个未完成的规则更新事务；请先运行 agent-rule recover 查看并恢复` });
  }
  const requiredFiles = [
    "agent-rules.yaml",
    ".agent-rules.lock.json",
    adapter.entryFile,
  ];

  for (const relativePath of requiredFiles) {
    if (await hasSymlinkAncestor(resolvedRoot, relativePath)) {
      issues.push({ code: "symlink-path", message: `控制文件路径包含符号链接：${relativePath}` });
      continue;
    }
    if (!(await exists(path.join(resolvedRoot, relativePath)))) {
      issues.push({ code: "missing-file", message: `缺少 ${relativePath}` });
    }
  }

  if (issues.length === 0) {
    let config: ProjectConfig;
    let lock: ProjectLock;
    try {
      config = await loadProjectConfig(resolvedRoot);
    } catch (error) {
      return { valid: false, issues: [{ code: "invalid-config", message: `项目配置无效：${error instanceof Error ? error.message : String(error)}` }] };
    }
    try {
      lock = await loadProjectLock(resolvedRoot);
    } catch (error) {
      return { valid: false, issues: [{ code: "invalid-lock", message: `项目锁文件无效：${error instanceof Error ? error.message : String(error)}` }] };
    }
    if (await hasSymlinkAncestor(resolvedRoot, config.project.overrides)) {
      issues.push({ code: "symlink-path", message: `项目覆盖规则路径包含符号链接：${config.project.overrides}` });
    } else if (!(await exists(resolveInside(resolvedRoot, config.project.overrides)))) {
      issues.push({ code: "missing-overrides", message: `缺少项目覆盖规则 ${config.project.overrides}` });
    }
    if (!config.targets.includes(adapter.id)) {
      issues.push({ code: "missing-target", message: `尚未将 ${adapter.id} 配置为目标工具` });
    }

    const entry = await readFile(path.join(resolvedRoot, adapter.entryFile), "utf8");
    if (!entry.includes(adapter.blockStart) || !entry.includes(adapter.blockEnd)) {
      issues.push({
        code: "missing-managed-block",
        message: `${adapter.entryFile} 中没有完整的 AgentRuleKit 受控区块`,
      });
    }

    const block = extractManagedBlock(entry, adapter) ?? "";
    if (digest(block) !== lock.managedBlockDigest) {
      issues.push({ code: "managed-block-drift", message: `${adapter.entryFile} 受控区块已发生漂移` });
    }
    const configuredSource = config.source.type === "workspace" ? config.source.path ?? "." : config.source.repository ?? "";
    if (lock.sourceType !== config.source.type) issues.push({ code: "source-type-mismatch", message: "配置与锁文件的规则源类型不一致" });
    if (lock.source !== configuredSource) issues.push({ code: "source-mismatch", message: "配置与锁文件的规则源不一致" });
    if (!Object.hasOwn(lock.targets, adapter.id)) issues.push({ code: "target-mismatch", message: `锁文件缺少目标工具 ${adapter.id}` });
    if (config.source.type === "github" && (!lock.sourceVersion || !/^sha256:[a-f0-9]{64}$/.test(lock.sourceDigest ?? "") || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(lock.sourceCommit ?? ""))) {
      issues.push({ code: "source-provenance-missing", message: "GitHub 规则源缺少版本、资产摘要或来源提交；请运行 diff/update 核查并迁移" });
    }
    if (config.source.type === "github" && lock.sourceVersion) {
      for (const [id, version] of Object.entries(lock.rulepacks)) {
        if (version !== lock.sourceVersion) {
          issues.push({ code: "source-pack-version-mismatch", message: `已安装规则包 ${id} 的版本 ${version} 与 Release ${lock.sourceVersion} 不一致` });
        }
      }
    }
    for (const id of config.rulepacks) {
      if (!lock.rulepacks[id]) issues.push({ code: "missing-locked-pack", message: `锁文件缺少规则包 ${id}` });
    }
    issues.push(...await inspectLockedManagedFiles(resolvedRoot, lock));
    for (const [relativePath, expectedDigest] of Object.entries(lock.managedFiles)) {
      if (!isManagedPath(relativePath)) {
        issues.push({ code: "unsafe-lock-path", message: `锁文件路径不在受管目录：${relativePath}` });
        continue;
      }
      if (await hasSymlinkAncestor(resolvedRoot, relativePath)) {
        issues.push({ code: "symlink-path", message: `受管文件路径包含符号链接：${relativePath}` });
        continue;
      }
      const absolutePath = resolveInside(resolvedRoot, relativePath);
      if (!(await exists(absolutePath))) {
        issues.push({ code: "missing-managed-file", message: `缺少受管文件 ${relativePath}` });
        continue;
      }
      const actualDigest = digest(await readFile(absolutePath, "utf8"));
      if (actualDigest !== expectedDigest) {
        issues.push({ code: "managed-file-drift", message: `受管文件已发生漂移 ${relativePath}` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
