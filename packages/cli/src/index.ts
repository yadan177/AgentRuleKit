#!/usr/bin/env node

import process from "node:process";
import { lstat } from "node:fs/promises";
import path from "node:path";

import { codexAdapter } from "@agentrulekit/adapter-codex";
import {
  detectProject,
  createDefaultConfig,
  applyProject,
  initializeProject,
  initializeGithubProject,
  loadProjectConfig,
  loadProjectLock,
  planProject,
  planUninstall,
  applyUninstall,
  validateProject,
  findLatestRelease,
  downloadRulepacks,
  assertReleaseAssetUnchanged,
  assertReleaseNotOlder,
  listInterruptedTransactions,
  recoverInterruptedProject,
} from "@agentrulekit/core";
import type { DetectionResult, ProjectChange, ProjectPlan, UninstallPlan } from "@agentrulekit/core";

const VERSION = "0.1.1";
const DEFAULT_REPOSITORY = "yadan177/AgentRuleKit";

function printHelp(): void {
  console.log(`AgentRuleKit ${VERSION}

用法：
  agent-rule <command> [project-directory]

命令：
  detect      检测支持的技术栈并展示证据
  init        展示技术栈依据与建议规则包，再为 Codex 工程安装规则
  check       检查本地完整性及规则源是否有更新
  diff        展示待更新文件的可审查差异
  update      预览更新；加 --apply 才会应用
  uninstall   预览项目规则卸载；加 --apply 才会卸载
  recover     查看中断事务；加 --apply 才会恢复原版本
  generate    update 的兼容命令，同样需要 --apply
  validate    只验证已安装项目文件的完整性
  version     输出 CLI 版本
  help        显示帮助

示例：agent-rule diff /path/to/project
      agent-rule update /path/to/project --apply
      agent-rule uninstall /path/to/project --apply
      agent-rule init /path/to/project --source-workspace /path/to/AgentRuleKit`);
}

function renderChange(change: ProjectChange): string {
  const lines = (content: string | undefined): string[] => {
    if (!content) return [];
    const result = content.split("\n");
    if (content.endsWith("\n")) result.pop();
    return result;
  };
  const before = lines(change.before);
  const after = lines(change.after);
  const newlineChanged = change.before !== undefined && change.after !== undefined &&
    change.before.endsWith("\n") !== change.after.endsWith("\n");
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  if (newlineChanged && prefix === before.length && prefix === after.length && prefix > 0) prefix--;
  let suffix = 0;
  if (!newlineChanged) {
    while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  }
  const oldChanged = before.slice(prefix, before.length - suffix);
  const newChanged = after.slice(prefix, after.length - suffix);
  const showLine = (line: string): string => line.replace(/\r/g, "\\r");
  const oldLines = oldChanged.map((line) => `-${showLine(line)}`);
  const newLines = newChanged.map((line) => `+${showLine(line)}`);
  if (suffix === 0 && oldChanged.length && change.before && !change.before.endsWith("\n")) oldLines.push("\\ No newline at end of file");
  if (suffix === 0 && newChanged.length && change.after && !change.after.endsWith("\n")) newLines.push("\\ No newline at end of file");
  const oldStart = oldChanged.length ? prefix + 1 : prefix;
  const newStart = newChanged.length ? prefix + 1 : prefix;
  return [`diff --agent-rule ${change.path}`, `--- ${change.action === "add" ? "/dev/null" : change.path}`, `+++ ${change.action === "remove" ? "/dev/null" : change.path}`, `@@ -${oldStart},${oldChanged.length} +${newStart},${newChanged.length} @@`, ...oldLines, ...newLines].join("\n");
}

function printPlan(plan: ProjectPlan): void {
  console.log(`规则包版本：${JSON.stringify(plan.from)} → ${JSON.stringify(plan.to)}`);
  if (!plan.changes.length) console.log("没有待更新文件。");
  for (const change of plan.changes) console.log(renderChange(change));
  for (const conflict of plan.conflicts) console.error(`[${conflict.code}] ${conflict.message}`);
}

function printUninstallPlan(plan: UninstallPlan): void {
  for (const change of plan.changes) console.log(renderChange(change));
  console.log(plan.retainedPaths.length ? `保留项目本地文件：\n${plan.retainedPaths.map((file) => `- ${file}`).join("\n")}` : "没有需要保留的项目本地文件。");
  for (const conflict of plan.conflicts) console.error(`[${conflict.code}] ${conflict.message}`);
}

function printInitRecommendation(detection: DetectionResult, rulepacks: string[]): void {
  console.log("技术栈检测依据：");
  if (!detection.stacks.length) console.log("- 未发现可识别的语言标记；建议仅安装通用规则。");
  for (const stack of detection.stacks) {
    for (const evidence of stack.evidence) console.log(`- ${stack.id}（${stack.confidence}）：${evidence.path}，${evidence.reason}`);
  }
  console.log(`建议规则包：${rulepacks.join(", ")}`);
}

async function projectConfigExists(root: string): Promise<boolean> {
  try {
    await lstat(path.join(root, "agent-rules.yaml"));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function run(): Promise<void> {
  const command = process.argv[2] ?? "help";
  const root = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();

  switch (command) {
    case "detect": {
      const result = await detectProject(root);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "init": {
      if (await projectConfigExists(root)) throw new Error("agent-rules.yaml 已存在；请使用 diff/update，不要再次运行 init");
      const sourceArg = process.argv.indexOf("--source-workspace");
      const sourceRoot = sourceArg >= 0 ? process.argv[sourceArg + 1] : undefined;
      if (sourceArg >= 0 && !sourceRoot) throw new Error("--source-workspace 需要规则源目录");
      const detection = await detectProject(root);
      const recommendation = await createDefaultConfig(root, codexAdapter);
      printInitRecommendation(detection, recommendation.rulepacks);
      let config;
      if (sourceArg >= 0) {
        config = await initializeProject(root, codexAdapter, sourceRoot!);
      } else {
        const release = await findLatestRelease(DEFAULT_REPOSITORY);
        const downloaded = await downloadRulepacks(release);
        try {
          config = await initializeGithubProject(root, codexAdapter, {
            root: downloaded.sourceRoot,
            version: downloaded.version,
            digest: release.digest,
            commit: downloaded.sourceCommit,
          }, DEFAULT_REPOSITORY);
        } finally {
          await downloaded.cleanup();
        }
      }
      console.log(`已在 ${root} 初始化 AgentRuleKit`);
      console.log(`规则包：${config.rulepacks.join(", ")}`);
      return;
    }
    case "generate":
    case "diff":
    case "update": {
      const config = await loadProjectConfig(root);
      const repository = config.source.type === "github" ? config.source.repository : undefined;
      if (config.source.type === "github" && !repository) throw new Error("GitHub 规则源缺少 repository");
      const release = repository ? await findLatestRelease(repository) : undefined;
      if (release) {
        const installed = await loadProjectLock(root);
        assertReleaseAssetUnchanged(installed, release);
        assertReleaseNotOlder(installed, release);
      }
      const downloaded = release ? await downloadRulepacks(release) : undefined;
      try {
      const snapshot = downloaded && release ? {
        root: downloaded.sourceRoot,
        version: downloaded.version,
        digest: release.digest,
        commit: downloaded.sourceCommit,
      } : undefined;
      const plan = await planProject(root, config, codexAdapter, snapshot);
      printPlan(plan);
      if (plan.conflicts.length) {
        process.exitCode = 2;
        return;
      }
      if (command === "diff" || !process.argv.includes("--apply")) {
        if (command !== "diff" && plan.changes.length) console.log("如已审查差异，运行 update <project-directory> --apply 应用。");
        return;
      }
      if (plan.changes.length) {
        await applyProject(root, config, codexAdapter, undefined, snapshot, plan);
        console.log(`已在 ${root} 应用 ${plan.changes.length} 项变更`);
      }
      return;
      } finally {
        await downloaded?.cleanup();
      }
    }
    case "recover": {
      const pending = await listInterruptedTransactions(root);
      if (!pending.length) {
        console.log("没有未完成的规则更新事务。");
        return;
      }
      console.log(`发现 ${pending.length} 个未完成事务：${pending.join(", ")}`);
      if (!process.argv.includes("--apply")) {
        console.log("审查事务目录后，运行 recover <project-directory> --apply 恢复更新前的文件；未完成的新文件会保留在恢复副本中。");
        return;
      }
      const recovered = await recoverInterruptedProject(root, codexAdapter);
      console.log(`已恢复更新前的项目文件；中断期间的文件保留在 ${recovered}`);
      return;
    }
    case "uninstall": {
      const args = process.argv.slice(3);
      const unknownFlags = args.filter((arg) => arg.startsWith("--") && arg !== "--apply");
      const directories = args.filter((arg) => !arg.startsWith("--"));
      if (unknownFlags.length || directories.length > 1) throw new Error(`uninstall 参数不合法：${args.join(" ")}`);
      const target = directories[0] ?? process.cwd();
      const plan = await planUninstall(target, codexAdapter);
      printUninstallPlan(plan);
      if (plan.conflicts.length) {
        process.exitCode = 2;
        return;
      }
      if (!args.includes("--apply")) {
        console.log("审查以上差异和保留文件后，运行 uninstall <project-directory> --apply 卸载项目规则。");
        return;
      }
      await applyUninstall(target, codexAdapter, plan);
      console.log(`已在 ${target} 卸载 AgentRuleKit 项目规则；保留 ${plan.retainedPaths.length} 个项目本地文件。`);
      return;
    }
    case "validate": {
      const result = await validateProject(root, codexAdapter);
      if (!result.valid) {
        for (const issue of result.issues) {
          console.error(`[${issue.code}] ${issue.message}`);
        }
        process.exitCode = 1;
        return;
      }
      console.log(`AgentRuleKit 项目验证通过：${root}`);
      return;
    }
    case "check": {
      const validation = await validateProject(root, codexAdapter);
      if (!validation.valid) {
        for (const issue of validation.issues) console.error(`[${issue.code}] ${issue.message}`);
        process.exitCode = 2;
        return;
      }
      const config = await loadProjectConfig(root);
      if (config.source.type === "github") {
        if (!config.source.repository) throw new Error("GitHub 规则源缺少 repository");
        const release = await findLatestRelease(config.source.repository);
        const lock = await loadProjectLock(root);
        assertReleaseAssetUnchanged(lock, release);
        assertReleaseNotOlder(lock, release);
        const upToDate = lock.sourceVersion === release.version && lock.sourceDigest === release.digest;
        console.log(upToDate ? `远程规则已是最新版本：${release.version}` : `发现远程规则新版本或未固定资产摘要：${lock.sourceVersion ?? "未知"} → ${release.version}；运行 diff 查看。`);
        if (!upToDate) process.exitCode = 3;
        return;
      }
      const plan = await planProject(root, config, codexAdapter);
      for (const conflict of plan.conflicts) console.error(`[${conflict.code}] ${conflict.message}`);
      if (plan.conflicts.length) {
        process.exitCode = 2;
        return;
      }
      console.log(plan.changes.length ? `发现 ${plan.changes.length} 项待更新变更；运行 diff 查看。` : "已安装规则是最新版本。");
      if (plan.changes.length) process.exitCode = 3;
      return;
    }
    case "version":
    case "--version":
    case "-v":
      console.log(VERSION);
      return;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    default:
      console.error(`未知命令：${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`agent-rule：${message}`);
  process.exitCode = 1;
});
