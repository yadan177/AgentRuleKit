import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(repository, "packages", "cli", "dist", "index.js");
const keep = process.argv.includes("--keep");
if (process.argv.slice(2).some((arg) => arg !== "--keep")) {
  throw new Error("用法：npm run demo:local -- [--keep]");
}

function command(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: repository, encoding: "utf8" });
  if (result.status !== expectedStatus) {
    throw new Error(`演示命令失败：agent-rule ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

async function main() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-demo-"));
  const source = path.join(temporary, "source");
  const project = path.join(temporary, "project");
  try {
    await mkdir(source);
    await mkdir(project);
    await cp(path.join(repository, "rulepacks"), path.join(source, "rulepacks"), { recursive: true });
    await writeFile(path.join(project, "package.json"), '{"name":"agentrulekit-demo","devDependencies":{"typescript":"^5.0.0"}}\n');
    await writeFile(path.join(project, "AGENTS.md"), "# 演示工程\n\n这段项目说明应一直保留。\n");

    console.log("AgentRuleKit 本地安全演示：只操作临时工程和临时规则源，不访问 GitHub。");
    const detection = command(["detect", project]);
    assert.match(detection, /typescript/);
    console.log("1. detect：识别 TypeScript 及依据。");

    const initialized = command(["init", project, "--source-workspace", source]);
    assert.match(initialized, /建议规则包：common, javascript, project-docs\/js-ts, typescript/);
    command(["validate", project]);
    command(["check", project]);
    console.log("2. init → validate → check：安装并验证当前规则。");

    const installed = path.join(project, ".agent-rules", "common", "entry.md");
    const original = await readFile(installed, "utf8");
    const override = path.join(project, ".agent-rules", "overrides.md");
    const personal = path.join(project, ".agent-rules", "personal-notes.md");
    await writeFile(override, "# 项目本地覆盖\n必须保留。\n");
    await writeFile(personal, "个人笔记，不受工具管理。\n");

    const sourceRule = path.join(source, "rulepacks", "common", "entry.md");
    await writeFile(sourceRule, `${await readFile(sourceRule, "utf8")}\n演示：本地规则新版本。\n`);
    command(["check", project], 3);
    const difference = command(["diff", project]);
    assert.match(difference, /演示：本地规则新版本/);
    assert.equal(await readFile(installed, "utf8"), original);
    console.log("3. check 发现变更；diff 只展示差异，没有写入项目。本地演示不模拟正式 Release 版本号。");
    console.log(difference);

    command(["update", project, "--apply"]);
    command(["validate", project]);
    command(["check", project]);
    assert.match(await readFile(installed, "utf8"), /演示：本地规则新版本/);
    assert.equal(await readFile(override, "utf8"), "# 项目本地覆盖\n必须保留。\n");
    assert.equal(await readFile(personal, "utf8"), "个人笔记，不受工具管理。\n");
    assert.match(await readFile(path.join(project, "AGENTS.md"), "utf8"), /这段项目说明应一直保留/);
    console.log("4. update --apply → validate：更新成功，项目覆盖、个人笔记和原有 AGENTS.md 内容均保留。");
    if (keep) console.log(`演示工程已保留供检查：${project}`);
  } finally {
    if (!keep) await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
