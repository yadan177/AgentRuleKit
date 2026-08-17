import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { parse, stringify } from "yaml";

import { detectProject } from "./detect.js";
import {
  CODEX_BLOCK_END,
  CODEX_BLOCK_START,
  mergeManagedBlock,
  renderCodexBlock,
} from "./managed-block.js";
import type {
  ProjectConfig,
  ProjectLock,
  RulePackManifest,
  StackId,
  ValidationIssue,
  ValidationResult,
} from "./types.js";

const TOOLKIT_VERSION = "0.1.0";
const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9/-]*$/;

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
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as RulePackManifest;
  if (manifest.id !== id) {
    throw new Error(`规则包 ${id} 的 manifest ID 不匹配：${manifest.id}`);
  }
  if (manifest.status !== "ready" || !manifest.entry) {
    throw new Error(`规则包 ${id} 尚未准备完成`);
  }
  const declaredFiles = new Set(manifest.rules);
  if (!declaredFiles.has(manifest.entry)) {
    throw new Error(`规则包 ${id} 的入口未列入 rules：${manifest.entry}`);
  }
  for (const rule of manifest.rules) {
    await access(resolveInside(directory, rule));
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
  sourceRoot: string = root,
): Promise<ProjectConfig> {
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
    targets: ["codex"],
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
  const config = parse(await readFile(configPath, "utf8")) as ProjectConfig;
  if (config.schemaVersion !== 1) {
    throw new Error(`不支持的 AgentRuleKit schema 版本：${String(config.schemaVersion)}`);
  }
  return config;
}

export async function generateCodexProject(
  root: string,
  config: ProjectConfig,
): Promise<ProjectLock> {
  const resolvedRoot = path.resolve(root);
  const sourceRoot = resolveSourceRoot(resolvedRoot, config);
  const packs = await resolveRulePacks(sourceRoot, config.rulepacks);
  const rulesDirectory = path.join(resolvedRoot, ".agent-rules");
  const stagingDirectory = path.join(resolvedRoot, `.agent-rules.staging-${process.pid}`);
  const backupDirectory = path.join(resolvedRoot, `.agent-rules.backup-${process.pid}`);
  const overridesPath = path.join(resolvedRoot, config.project.overrides);
  const agentsPath = path.join(resolvedRoot, "AGENTS.md");
  const existingAgents = (await exists(agentsPath))
    ? await readFile(agentsPath, "utf8")
    : "";
  const entries = Object.fromEntries(
    packs.map(({ manifest }) => [manifest.id, manifest.entry as string]),
  );
  const agentsContent = mergeManagedBlock(existingAgents, renderCodexBlock(config, entries));

  await rm(stagingDirectory, { recursive: true, force: true });
  await rm(backupDirectory, { recursive: true, force: true });
  if (await exists(rulesDirectory)) {
    await cp(rulesDirectory, stagingDirectory, { recursive: true });
  } else {
    await mkdir(stagingDirectory, { recursive: true });
  }

  const lockPath = path.join(resolvedRoot, ".agent-rules.lock.json");
  if (await exists(lockPath)) {
    const oldLock = JSON.parse(await readFile(lockPath, "utf8")) as ProjectLock;
    for (const managedPath of Object.keys(oldLock.managedFiles)) {
      if (managedPath.startsWith(".agent-rules/")) {
        const relativePath = managedPath.slice(".agent-rules/".length);
        await rm(resolveInside(stagingDirectory, relativePath), { recursive: true, force: true });
      }
    }
  }

  const stagingOverrides = resolveInside(
    stagingDirectory,
    path.relative(rulesDirectory, overridesPath),
  );
  await mkdir(path.dirname(stagingOverrides), { recursive: true });
  if (!(await exists(stagingOverrides))) {
    await writeFile(
      stagingOverrides,
      "# 项目覆盖规则\n\n在此添加项目特有规则。AgentRuleKit 更新时会保留本文件。\n",
      "utf8",
    );
  }

  const managedFiles: Record<string, string> = {};
  for (const { directory, manifest } of packs) {
    const targetPack = resolveInside(stagingDirectory, manifest.id);
    await mkdir(targetPack, { recursive: true });
    const installedManifest = { ...manifest };
    delete installedManifest.$schema;
    const manifestContent = `${JSON.stringify(installedManifest, null, 2)}\n`;
    await writeFile(path.join(targetPack, "pack.json"), manifestContent, "utf8");
    managedFiles[toPortablePath(path.join(".agent-rules", manifest.id, "pack.json"))] =
      digest(manifestContent);

    for (const rule of manifest.rules) {
      const content = await readFile(resolveInside(directory, rule), "utf8");
      const targetFile = resolveInside(targetPack, rule);
      await mkdir(path.dirname(targetFile), { recursive: true });
      await writeFile(targetFile, content, "utf8");
      managedFiles[toPortablePath(path.join(".agent-rules", manifest.id, rule))] = digest(content);
    }
  }

  if (await exists(rulesDirectory)) await rename(rulesDirectory, backupDirectory);
  try {
    await rename(stagingDirectory, rulesDirectory);
  } catch (error) {
    if (await exists(backupDirectory)) await rename(backupDirectory, rulesDirectory);
    throw error;
  }
  await rm(backupDirectory, { recursive: true, force: true });
  await writeFile(agentsPath, agentsContent, "utf8");

  const lock: ProjectLock = {
    schemaVersion: 1,
    toolkitVersion: TOOLKIT_VERSION,
    source: config.source.type === "workspace" ? config.source.path ?? "." : config.source.repository ?? "",
    rulepacks: Object.fromEntries(packs.map(({ manifest }) => [manifest.id, manifest.version])),
    targets: Object.fromEntries(config.targets.map((target) => [target, TOOLKIT_VERSION])),
    managedFiles,
  };
  await writeFile(
    path.join(resolvedRoot, ".agent-rules.lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`,
    "utf8",
  );
  return lock;
}

export async function initializeProject(
  root: string,
  sourceRoot: string = root,
): Promise<ProjectConfig> {
  const resolvedRoot = path.resolve(root);
  const configPath = path.join(resolvedRoot, "agent-rules.yaml");
  if (await exists(configPath)) {
    throw new Error("agent-rules.yaml 已存在；请运行 generate，不要再次运行 init");
  }

  const config = await createDefaultConfig(resolvedRoot, sourceRoot);
  await writeFile(configPath, stringify(config), "utf8");
  await generateCodexProject(resolvedRoot, config);
  return config;
}

export async function validateProject(root: string): Promise<ValidationResult> {
  const resolvedRoot = path.resolve(root);
  const issues: ValidationIssue[] = [];
  const requiredFiles = [
    "agent-rules.yaml",
    ".agent-rules.lock.json",
    ".agent-rules/overrides.md",
    "AGENTS.md",
  ];

  for (const relativePath of requiredFiles) {
    if (!(await exists(path.join(resolvedRoot, relativePath)))) {
      issues.push({ code: "missing-file", message: `缺少 ${relativePath}` });
    }
  }

  if (issues.length === 0) {
    const config = await loadProjectConfig(resolvedRoot);
    if (!config.targets.includes("codex")) {
      issues.push({ code: "missing-target", message: "尚未将 Codex 配置为目标工具" });
    }

    const agents = await readFile(path.join(resolvedRoot, "AGENTS.md"), "utf8");
    if (!agents.includes(CODEX_BLOCK_START) || !agents.includes(CODEX_BLOCK_END)) {
      issues.push({
        code: "missing-managed-block",
        message: "AGENTS.md 中没有完整的 AgentRuleKit 受控区块",
      });
    }

    const lock = JSON.parse(
      await readFile(path.join(resolvedRoot, ".agent-rules.lock.json"), "utf8"),
    ) as ProjectLock;
    for (const [relativePath, expectedDigest] of Object.entries(lock.managedFiles)) {
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
