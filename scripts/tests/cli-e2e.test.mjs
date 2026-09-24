import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
      expectExit(command("init", target, "--source-workspace", source), 0, `${fixture.name} init`);
      expectExit(command("validate", target), 0, `${fixture.name} validate`);
      expectExit(command("check", target), 0, `${fixture.name} check`);
      const lock = JSON.parse(await readFile(path.join(target, ".agent-rules.lock.json"), "utf8"));
      for (const pack of fixture.packs) assert.ok(lock.rulepacks[pack], `${fixture.name} 未安装 ${pack}`);
      assert.match(await readFile(path.join(target, "AGENTS.md"), "utf8"), /agent-rule:start/);
    }

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
    assert.match(rejected.stderr, /unknown-file-collision/);
    assert.equal(await readFile(unknown, "utf8"), "# 已有未知文件\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
