#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  detectProject,
  generateCodexProject,
  initializeProject,
  loadProjectConfig,
  validateProject,
} from "@agentrulekit/core";

const VERSION = "0.1.0";
const DISTRIBUTION_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function printHelp(): void {
  console.log(`AgentRuleKit ${VERSION}

用法：
  agent-rule <command> [project-directory]

命令：
  detect      检测支持的技术栈并展示证据
  init        为 Codex 工程初始化 AgentRuleKit
  generate    重新生成 Codex 受管项目文件
  check       在不修改文件的前提下检查项目骨架
  validate    check 的别名
  version     输出 CLI 版本
  help        显示帮助

远程规则下载和更新命令需要等待规则注册表实现，因此当前版本不提供。`);
}

async function run(): Promise<void> {
  const command = process.argv[2] ?? "help";
  const root = process.argv[3] ?? process.cwd();

  switch (command) {
    case "detect": {
      const result = await detectProject(root);
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "init": {
      const config = await initializeProject(root, DISTRIBUTION_ROOT);
      console.log(`已在 ${root} 初始化 AgentRuleKit`);
      console.log(`规则包：${config.rulepacks.join(", ")}`);
      return;
    }
    case "generate": {
      const config = await loadProjectConfig(root);
      await generateCodexProject(root, config);
      console.log(`已在 ${root} 生成 Codex 文件`);
      return;
    }
    case "check":
    case "validate": {
      const result = await validateProject(root);
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
