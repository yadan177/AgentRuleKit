import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const cli = path.join(repository, "packages", "cli", "dist", "index.js");

function command(...args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

function expectExit(result, code, context) {
  assert.equal(result.status, code, `${context}\n${result.stdout}\n${result.stderr}`);
}

test("Python、TypeScript、Unity 工程完成安装与安全更新闭环", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-cli-e2e-"));
  try {
    const source = path.join(root, "source");
    await mkdir(source);
    await cp(path.join(repository, "rulepacks"), path.join(source, "rulepacks"), { recursive: true });
    const markers = [
      { name: "python", file: "pyproject.toml", text: "[project]\nname = 'demo'\n", packs: ["python", "project-docs/python"] },
      { name: "typescript", file: "package.json", text: '{"devDependencies":{"typescript":"^5.0.0"}}\n', packs: ["javascript", "typescript", "project-docs/js-ts"] },
      { name: "unity", file: path.join("ProjectSettings", "ProjectVersion.txt"), text: "m_EditorVersion: 2022.3.0f1\n", packs: ["unity", "project-docs/unity"] },
    ];
    for (const fixture of markers) {
      const target = path.join(root, fixture.name);
      await mkdir(path.dirname(path.join(target, fixture.file)), { recursive: true });
      await writeFile(path.join(target, fixture.file), fixture.text);
      const initialized = command("init", target, "--source-workspace", source);
      expectExit(initialized, 0, `${fixture.name} init`);
      assert.match(initialized.stdout, /技术栈检测依据/);
      assert.ok(initialized.stdout.includes(fixture.file), `${fixture.name} 未展示检测依据`);
      assert.match(initialized.stdout, /建议规则包：common/);
      expectExit(command("validate", target), 0, `${fixture.name} validate`);
      expectExit(command("check", target), 0, `${fixture.name} check`);
      const lock = JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"));
      for (const pack of fixture.packs) assert.ok(lock.rulepacks[pack], `${fixture.name} 未安装 ${pack}`);
      assert.match(await readFile(path.join(target, "AGENTS.md"), "utf8"), /agent-rule:start/);
    }

    const repeatedInit = command("init", path.join(root, "python"));
    expectExit(repeatedInit, 1, "已有项目应在联网前拒绝重复初始化");
    assert.match(repeatedInit.stderr, /agent-rules\.yaml 已存在/);
    assert.doesNotMatch(repeatedInit.stderr, /GitHub Release|HTTP \d{3}/);
    assert.equal(repeatedInit.stdout, "");

    const onlyTypeScript = path.join(root, "typescript-only");
    await mkdir(onlyTypeScript);
    const relativeSource = path.relative(onlyTypeScript, source).split(path.sep).join("/");
    await writeFile(path.join(onlyTypeScript, "agent-rules.yaml"), `schemaVersion: 1\nsource:\n  type: workspace\n  path: ${relativeSource}\nrulepacks:\n  - typescript\ntargets:\n  - codex\nproject:\n  overrides: .agent-rules/overrides.md\nupdates:\n  channel: stable\n  strategy: manual\n`);
    expectExit(command("update", onlyTypeScript, "--apply"), 0, "仅声明 TypeScript 时安装依赖");
    const typescriptLock = JSON.parse(await readFile(path.join(onlyTypeScript, ".agent-rules.lock.json"), "utf8"));
    assert.ok(typescriptLock.rulepacks.javascript, "TypeScript 必须自动安装 JavaScript 基线");
    expectExit(command("validate", onlyTypeScript), 0, "TypeScript 依赖安装后校验");

    const python = path.join(root, "python");
    const installed = path.join(python, ".agent-rules", "common", "entry.md");
    const overrides = path.join(python, ".agent-rules", "overrides.md");
    const original = await readFile(installed, "utf8");
    await writeFile(overrides, "# 本地覆盖规则\n保留此行\n");
    const sourceEntry = path.join(source, "rulepacks", "common", "entry.md");
    await writeFile(sourceEntry, `${await readFile(sourceEntry, "utf8")}\n临时测试更新。\n`);
    expectExit(command("check", python), 3, "Python 检查到更新");
    const preview = command("diff", python);
    expectExit(preview, 0, "Python 更新预览");
    assert.match(preview.stdout, /临时测试更新/);
    expectExit(command("update", python), 0, "不带 --apply 的更新仅预览");
    assert.equal(await readFile(installed, "utf8"), original);
    expectExit(command("update", python, "--apply"), 0, "Python 显式应用更新");
    expectExit(command("validate", python), 0, "Python 更新后校验");
    expectExit(command("check", python), 0, "Python 更新幂等");
    assert.match(await readFile(installed, "utf8"), /临时测试更新/);
    assert.equal(await readFile(overrides, "utf8"), "# 本地覆盖规则\n保留此行\n");

    await writeFile(installed, "# 用户手工修改\n");
    expectExit(command("validate", python), 1, "检测受管文件漂移");
    const refused = command("update", python, "--apply");
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /managed-file-drift/);
    assert.equal(await readFile(installed, "utf8"), "# 用户手工修改\n");

    const collision = path.join(root, "collision");
    await mkdir(path.join(collision, ".agent-rules", "common"), { recursive: true });
    await writeFile(path.join(collision, "pyproject.toml"), "[project]\nname = 'collision'\n");
    const unknown = path.join(collision, ".agent-rules", "common", "entry.md");
    await writeFile(unknown, "# 已有未知文件\n");
    const rejected = command("init", collision, "--source-workspace", source);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout, /技术栈检测依据：[\s\S]*pyproject\.toml[\s\S]*建议规则包/);
    assert.match(rejected.stderr, /unknown-file-collision/);
    assert.equal(await readFile(unknown, "utf8"), "# 已有未知文件\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("差异预览明确显示文件末尾换行的增删", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-newline-diff-"));
  try {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    const pack = path.join(source, "rulepacks", "common");
    await mkdir(pack, { recursive: true });
    await mkdir(target);
    await writeFile(path.join(pack, "pack.json"), JSON.stringify({ id: "common", version: "0.1.0", status: "ready", kind: "common", entry: "entry.md", dependencies: [], rules: ["entry.md"] }));
    const rule = path.join(pack, "entry.md");
    await writeFile(rule, "# Rule\n");
    expectExit(command("init", target, "--source-workspace", source), 0, "初始化换行测试工程");

    await writeFile(rule, "# Rule");
    const removed = command("diff", target);
    expectExit(removed, 0, "预览删除末尾换行");
    const removedRule = removed.stdout.split("diff --agent-rule .agent-rules/common/entry.md")[1]?.split("diff --agent-rule")[0];
    assert.match(removedRule, /-# Rule\n\+# Rule\n\\ No newline at end of file/);
    expectExit(command("update", target, "--apply"), 0, "应用删除末尾换行");
    assert.equal(await readFile(path.join(target, ".agent-rules", "common", "entry.md"), "utf8"), "# Rule");

    await writeFile(rule, "# Rule\n");
    const added = command("diff", target);
    expectExit(added, 0, "预览增加末尾换行");
    const addedRule = added.stdout.split("diff --agent-rule .agent-rules/common/entry.md")[1]?.split("diff --agent-rule")[0];
    assert.match(addedRule, /-# Rule\n\\ No newline at end of file\n\+# Rule/);
    expectExit(command("update", target, "--apply"), 0, "应用增加末尾换行");

    await writeFile(rule, "# Rule\r\n");
    const changedLineEnding = command("diff", target);
    expectExit(changedLineEnding, 0, "预览 CRLF 与 LF 的区别");
    const endingRule = changedLineEnding.stdout.split("diff --agent-rule .agent-rules/common/entry.md")[1]?.split("diff --agent-rule")[0];
    assert.match(endingRule, /-# Rule\n\+# Rule\\r/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI 卸载先预览再应用，保留项目本地规则且无需联网", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentrulekit-uninstall-cli-"));
  try {
    const source = path.join(root, "source");
    const target = path.join(root, "target");
    await mkdir(source);
    await mkdir(target);
    await cp(path.join(repository, "rulepacks"), path.join(source, "rulepacks"), { recursive: true });
    await writeFile(path.join(target, "go.mod"), "module example.com/demo\n");
    expectExit(command("init", target, "--source-workspace", source), 0, "卸载测试初始化");
    const lockPath = path.join(target, ".agent-rules.lock.json");
    const configPath = path.join(target, "agent-rules.yaml");
    const config = parse(await readFile(configPath, "utf8"));
    config.source = { type: "github", repository: "yadan177/AgentRuleKit" };
    await writeFile(configPath, stringify(config));
    const githubLock = JSON.parse(await readFile(lockPath, "utf8"));
    githubLock.sourceType = "github";
    githubLock.source = "yadan177/AgentRuleKit";
    githubLock.sourceVersion = "0.1.1";
    githubLock.sourceDigest = `sha256:${"a".repeat(64)}`;
    githubLock.sourceCommit = "a".repeat(40);
    await writeFile(lockPath, `${JSON.stringify(githubLock, null, 2)}\n`);
    const overridePath = path.join(target, ".agent-rules", "overrides.md");
    await writeFile(overridePath, "# 本地规则\n");
    const before = await readFile(lockPath, "utf8");
    const preview = command("uninstall", target);
    expectExit(preview, 0, "卸载预览");
    assert.match(preview.stdout, /diff --agent-rule \.agent-rules\/go\//);
    assert.match(preview.stdout, /保留项目本地文件：[\s\S]*\.agent-rules\/overrides\.md/);
    assert.equal(await readFile(lockPath, "utf8"), before);
    expectExit(command("uninstall", target, source, "--apply"), 1, "多个项目路径应被拒绝");
    assert.equal(await readFile(lockPath, "utf8"), before);
    const denyNetwork = path.join(root, "deny-network.mjs");
    await writeFile(denyNetwork, "globalThis.fetch = () => { throw new Error('卸载不应联网'); };\n");
    const applied = spawnSync(process.execPath, ["--import", denyNetwork, cli, "uninstall", "--apply", target], { encoding: "utf8" });
    expectExit(applied, 0, "应用卸载");
    assert.match(applied.stdout, /已在 .* 卸载 AgentRuleKit 项目规则/);
    assert.equal(await readFile(overridePath, "utf8"), "# 本地规则\n");
    await assert.rejects(readFile(lockPath, "utf8"), /ENOENT/);
    await assert.rejects(readFile(path.join(target, "AGENTS.md"), "utf8"), /ENOENT/);
    expectExit(command("init", target, "--source-workspace", source), 0, "卸载后重新安装");
    expectExit(command("validate", target), 0, "重新安装后校验");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
