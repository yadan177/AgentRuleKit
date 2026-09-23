#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { codexAdapter } from "@agentrulekit/adapter-codex";
import {
  detectProject,
  applyProject,
  initializeProject,
  initializeGithubProject,
  loadProjectConfig,
  planProject,
  validateProject,
  findLatestRelease,
  downloadRulepacks,
  assertReleaseAssetUnchanged,
  listInterruptedTransactions,
  recoverInterruptedProject,
} from "@agentrulekit/core";
import type { ProjectChange, ProjectLock, ProjectPlan } from "@agentrulekit/core";

const VERSION = "0.1.0";
const DEFAULT_REPOSITORY = "yadan177/AgentRuleKit";

function printHelp(): void {
  console.log(`AgentRuleKit ${VERSION}

用法：
  agent-rule <command> [project-directory]

命令：
  detect      检测支持的技术栈并展示证据
  init        从公开 GitHub Release 为 Codex 工程安装规则
  check       检查本地完整性及规则源是否有更新
  diff        展示待更新文件的可审查差异
  update      预览更新；加 --apply 才会应用
  recover     查看中断事务；加 --apply 才会恢复原版本
  generate    update 的兼容命令，同样需要 --apply
  validate    只验证已安装项目文件的完整性
  version     输出 CLI 版本
  help        显示帮助

示例：agent-rule diff /path/to/project
      agent-rule update /path/to/project --apply
      agent-rule init /path/to/project --source-workspace /path/to/AgentRuleKit`);
}

function renderChange(change: ProjectChange): string {
  const before = change.before?.replace(/\n$/, "").split("\n") ?? [];
  const after = change.after?.replace(/\n$/, "").split("\n") ?? [];
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - suffix - 1] === after[after.length - suffix - 1]) suffix++;
  const oldChanged = before.slice(prefix, before.length - suffix);
  const newChanged = after.slice(prefix, after.length - suffix);
  return [`diff --agent-rule ${change.path}`, `--- ${change.action === "add" ? "/dev/null" : change.path}`, `+++ ${change.action === "remove" ? "/dev/null" : change.path}`, `@@ -${prefix + 1},${oldChanged.length} +${prefix + 1},${newChanged.length} @@`, ...oldChanged.map((line) => `-${line}`), ...newChanged.map((line) => `+${line}`)].join("\n");
}

function printPlan(plan: ProjectPlan): void {
  console.log(`规则包版本：${JSON.stringify(plan.from)} → ${JSON.stringify(plan.to)}`);
  if (!plan.changes.length) console.log("没有待更新文件。");
  for (const change of plan.changes) console.log(renderChange(change));
  for (const conflict of plan.conflicts) console.error(`[${conflict.code}] ${conflict.message}`);
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
      const sourceArg = process.argv.indexOf("--source-workspace");
      let config;
      if (sourceArg >= 0) {
        const sourceRoot = process.argv[sourceArg + 1];
        if (!sourceRoot) throw new Error("--source-workspace 需要规则源目录");
        config = await initializeProject(root, codexAdapter, sourceRoot);
      } else {
        const release = await findLatestRelease(DEFAULT_REPOSITORY);
        const downloaded = await downloadRulepacks(release);
        try {
          config = await initializeGithubProject(root, codexAdapter, downloaded.sourceRoot, DEFAULT_REPOSITORY, downloaded.version, release.digest);
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
        const installed = JSON.parse(await readFile(path.join(root, ".agent-rules.lock.json"), "utf8")) as ProjectLock;
        assertReleaseAssetUnchanged(installed, release);
      }
      const downloaded = release ? await downloadRulepacks(release) : undefined;
      try {
      const plan = await planProject(root, config, codexAdapter, downloaded?.sourceRoot, downloaded?.version, release?.digest);
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
        await applyProject(root, config, codexAdapter, undefined, downloaded?.sourceRoot, downloaded?.version, release?.digest);
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
        const lock = JSON.parse(await readFile(path.join(root, ".agent-rules.lock.json"), "utf8")) as ProjectLock;
        assertReleaseAssetUnchanged(lock, release);
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
